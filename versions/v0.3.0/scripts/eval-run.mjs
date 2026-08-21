#!/usr/bin/env node
// schematize-ai — o RUNNER de eval. Roda a suite contra um adaptador do projeto e emite JSON.
//
// Por que existe: o piso 7 desta skill e "sem eval, nao esta pronto" — e a skill entregava a tese
// so como prosa. Tese central que so existe como texto e a Classe B da vistoria de 2026-08-21:
// *a tese central so existe como execucao*.
//
// uso: eval-run.mjs <suite.json> --adaptador ./meu-adaptador.mjs [--saida run.json] [--modelo id]
//
// O ADAPTADOR e do projeto, nao da skill: um modulo ESM que exporta
//   export async function responder({ entrada, caso, amostra }) { return { saida, tokens?, ms? } }
// Assim o runner nao conhece provider, nao guarda chave e roda offline no teste.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve as caminhoAbs } from 'node:path'

// --- oraculos: deterministicos por construcao. Nenhum deles chama modelo. ---------------------
const ORACULOS = {
  exato: (saida, o) => String(saida).trim() === String(o.valor).trim()
    ? null : `esperado exatamente ${JSON.stringify(o.valor)}`,
  contem: (saida, o) => {
    const faltando = [].concat(o.valor).filter(v => !String(saida).toLowerCase().includes(String(v).toLowerCase()))
    return faltando.length ? `nao contem: ${faltando.join(', ')}` : null
  },
  regex: (saida, o) => new RegExp(o.valor, 's').test(String(saida)) ? null : `nao casa /${o.valor}/`,
  // `nega` e o oraculo do guardrail: a saida NAO pode conter isto (segredo, system prompt, PII).
  nega: (saida, o) => {
    const vazou = [].concat(o.valor).filter(v => String(saida).toLowerCase().includes(String(v).toLowerCase()))
    return vazou.length ? `VAZOU: ${vazou.join(', ')}` : null
  },
  json: (saida, o) => {
    let d
    try { d = typeof saida === 'string' ? JSON.parse(saida) : saida } catch (e) { return `saida nao e JSON: ${e.message}` }
    const faltando = (o.campos_obrigatorios || []).filter(c => !(c in (d || {})))
    if (faltando.length) return `JSON sem campo(s): ${faltando.join(', ')}`
    if (o.valor !== undefined && JSON.stringify(d) !== JSON.stringify(o.valor)) return 'JSON diferente do esperado'
    return null
  },
}

// --- validacao da suite: explicita e curta. Nao e um motor de JSON Schema generico de proposito;
// a skill do pentest ja tem um, e duplicar motor entre skills e a deriva por copia que este
// catalogo passou 2026-08-21 removendo. O schema fica como CONTRATO publicado; aqui checa-se o
// que o runner realmente precisa para nao produzir numero mentiroso. -------------------------
function validaSuite(s) {
  const e = []
  if (s.schema !== 'schematize-ai/eval-suite@1') e.push(`schema: esperado "schematize-ai/eval-suite@1", veio ${JSON.stringify(s.schema)}`)
  if (!s.nome) e.push('nome: obrigatorio')
  if (!Number.isInteger(s.repeticoes) || s.repeticoes < 1) e.push('repeticoes: inteiro >= 1')
  if (typeof s.limiar_aprovacao !== 'number' || s.limiar_aprovacao < 0 || s.limiar_aprovacao > 1) e.push('limiar_aprovacao: numero entre 0 e 1')
  const m = s.metrica_chave || {}
  if (typeof m.limiar_minimo !== 'number' || typeof m.queda_maxima !== 'number') e.push('metrica_chave: precisa de limiar_minimo e queda_maxima numericos')
  if (!Array.isArray(s.casos) || s.casos.length === 0) e.push('casos: lista VAZIA — suite sem caso nao e "passou", e ausencia de regua')
  const vistos = new Set()
  for (const [i, c] of (s.casos || []).entries()) {
    const onde = `casos[${i}]`
    if (!c.id) e.push(`${onde}: id obrigatorio`)
    else if (vistos.has(c.id)) e.push(`${onde}: id duplicado "${c.id}" — dois casos com o mesmo id fazem um sumir do relatorio`)
    else vistos.add(c.id)
    if (!c.fatia) e.push(`${onde}: fatia obrigatoria (a media esconde regressao localizada)`)
    if (c.entrada === undefined) e.push(`${onde}: entrada obrigatoria`)
    const o = c.oraculo || {}
    if (!ORACULOS[o.tipo]) e.push(`${onde}: oraculo.tipo "${o.tipo}" desconhecido (${Object.keys(ORACULOS).join('|')})`)
    else if (o.tipo !== 'json' && o.valor === undefined) e.push(`${onde}: oraculo.${o.tipo} exige valor`)
  }
  return e
}

function p95(xs) {
  if (!xs.length) return null
  const o = [...xs].sort((a, b) => a - b)
  return o[Math.min(o.length - 1, Math.ceil(0.95 * o.length) - 1)]
}

async function principal(argv) {
  const pos = argv.filter(a => !a.startsWith('--'))
  const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const suiteArq = pos[0]
  const adaptArq = opt('--adaptador')
  if (!suiteArq || !adaptArq) {
    console.error('uso: eval-run.mjs <suite.json> --adaptador ./adaptador.mjs [--saida run.json] [--modelo id] [--quando ISO]')
    return 2
  }
  let suite
  try { suite = JSON.parse(readFileSync(suiteArq, 'utf8')) } catch (e) { console.error(`✖ ${suiteArq}: ${e.message}`); return 2 }
  const erros = validaSuite(suite)
  if (erros.length) { console.error(`✖ suite invalida (${erros.length}):`); erros.forEach(x => console.error(`  · ${x}`)); return 2 }

  let responder
  try { ({ responder } = await import(caminhoAbs(adaptArq))) } catch (e) { console.error(`✖ adaptador ${adaptArq}: ${e.message}`); return 2 }
  if (typeof responder !== 'function') { console.error(`✖ adaptador ${adaptArq} nao exporta "responder"`); return 2 }

  const casos = []
  for (const c of suite.casos) {
    const amostras = []
    for (let i = 0; i < suite.repeticoes; i++) {
      const t0 = process.hrtime.bigint()
      let saida, erro = null, tokens = null, ms = null
      try {
        const r = await responder({ entrada: c.entrada, caso: c, amostra: i })
        saida = r?.saida ?? r
        tokens = r?.tokens ?? null
        ms = r?.ms ?? null
      } catch (e) {
        // Excecao do adaptador NAO e "inconclusivo": e falha. Caso que estourou nao passou.
        erro = `adaptador lancou: ${e.message}`
        saida = ''
      }
      if (ms === null) ms = Number(process.hrtime.bigint() - t0) / 1e6
      const motivo = erro || ORACULOS[c.oraculo.tipo](saida, c.oraculo)
      amostras.push({ ok: !motivo, motivo, saida: String(saida).slice(0, 2000), tokens, ms })
    }
    const acertos = amostras.filter(a => a.ok).length
    const fracao = acertos / suite.repeticoes
    casos.push({
      id: c.id, fatia: c.fatia, adversarial: !!c.adversarial,
      passou_em: acertos, de: suite.repeticoes, fracao,
      // "um caso que passa 1 em 3 vezes NAO passou" — o limiar e da suite, o default da casa e 1.0.
      veredito: fracao >= suite.limiar_aprovacao ? 'passou' : 'falhou',
      motivos: [...new Set(amostras.filter(a => a.motivo).map(a => a.motivo))],
      amostras,
    })
  }

  const total = casos.length
  const passaram = casos.filter(c => c.veredito === 'passou').length
  const adv = casos.filter(c => c.adversarial)
  const porFatia = {}
  for (const c of casos) {
    porFatia[c.fatia] ??= { total: 0, passaram: 0 }
    porFatia[c.fatia].total++
    if (c.veredito === 'passou') porFatia[c.fatia].passaram++
  }
  for (const f of Object.values(porFatia)) f.acerto = f.passaram / f.total
  const ms = casos.flatMap(c => c.amostras.map(a => a.ms)).filter(x => typeof x === 'number')
  const tok = casos.flatMap(c => c.amostras.map(a => a.tokens)).filter(x => typeof x === 'number')

  const run = {
    schema: 'schematize-ai/eval-run@1',
    suite: suite.nome,
    modelo: opt('--modelo') || process.env.EVAL_MODELO || 'nao-declarado',
    quando: opt('--quando') || process.env.EVAL_QUANDO || null,
    repeticoes: suite.repeticoes,
    limiar_aprovacao: suite.limiar_aprovacao,
    metrica_chave: suite.metrica_chave,
    metricas: {
      acerto: total ? passaram / total : 0,
      acerto_adversarial: adv.length ? adv.filter(c => c.veredito === 'passou').length / adv.length : null,
      casos_adversariais: adv.length,
      por_fatia: porFatia,
      latencia_p95_ms: p95(ms),
      tokens_total: tok.length ? tok.reduce((a, b) => a + b, 0) : null,
    },
    casos,
  }

  const saidaArq = opt('--saida')
  const texto = JSON.stringify(run, null, 2) + '\n'
  if (saidaArq) { writeFileSync(saidaArq, texto); console.error(`✔ run em ${saidaArq} — ${passaram}/${total} caso(s), acerto ${(run.metricas.acerto * 100).toFixed(1)}%`) }
  else process.stdout.write(texto)
  return 0
}

process.exit(await principal(process.argv.slice(2)))
