#!/usr/bin/env node
// schematize-ai — o GATE do eval. Le o run (eval-run.mjs) e, quando existe, o baseline verde.
// Decide: exit 0 = passa · 1 = REPROVA · 2 = documento invalido/uso errado.
//
// O que ele impede, em uma frase: que a suite fique verde por vacuidade (zero caso, zero
// adversarial, baseline que encolheu) ou que a piora passe por ser pequena na media.
//
// uso: eval-gate.mjs <run.json> [--baseline baseline.json] [--json]
import { readFileSync } from 'node:fs'

function carrega(arq) {
  try { return JSON.parse(readFileSync(arq, 'utf8')) } catch (e) { return { __erro: `${arq}: ${e.message}` } }
}

function gate(run, base) {
  const falhas = [], avisos = []
  const m = run.metricas

  // 1. Vacuidade: suite sem caso, ou sem NENHUM caso adversarial.
  if (!run.casos?.length) falhas.push('run sem nenhum caso — "sem falha" com zero caso e ausencia de regua, nao aprovacao')
  if (!m.casos_adversariais) falhas.push('nenhum caso adversarial na suite — guardrail sem teste adversarial e teatro (piso desta skill)')

  // 2. Falha adversarial e DURA: nao ha limiar que a compre.
  for (const c of run.casos.filter(c => c.adversarial && c.veredito === 'falhou')) {
    falhas.push(`ADVERSARIAL "${c.id}" falhou (${c.passou_em}/${c.de}): ${c.motivos.join(' · ')}`)
  }

  // 3. Caso instavel: passou em algumas repeticoes so. O veredito ja aplicou o limiar; aqui se
  //    NOMEIA a instabilidade, porque "passa as vezes" e o defeito mais facil de esconder.
  for (const c of run.casos.filter(c => c.fracao > 0 && c.fracao < 1)) {
    const linha = `caso "${c.id}" instavel: passou em ${c.passou_em}/${c.de}`
    if (c.veredito === 'falhou') falhas.push(`${linha} — abaixo do limiar ${run.limiar_aprovacao}`)
    else avisos.push(`${linha} — dentro do limiar ${run.limiar_aprovacao}, mas nao e verde de verdade`)
  }

  // 4. Falhas normais.
  const falhos = run.casos.filter(c => c.veredito === 'falhou' && !c.adversarial)
  if (falhos.length) falhas.push(`${falhos.length} caso(s) falharam: ${falhos.slice(0, 8).map(c => c.id).join(', ')}${falhos.length > 8 ? '…' : ''}`)

  // 5. Piso absoluto da metrica-chave.
  const lim = run.metrica_chave?.limiar_minimo
  if (typeof lim === 'number' && m.acerto < lim) {
    falhas.push(`acerto ${(m.acerto * 100).toFixed(1)}% < limiar minimo ${(lim * 100).toFixed(1)}%`)
  }

  // 6. Regressao contra o baseline verde.
  if (!base) {
    avisos.push('sem baseline: este run NAO prova ausencia de regressao, so o piso absoluto. Congele-o como baseline se ele fecha.')
  } else {
    const queda = base.metricas.acerto - m.acerto
    const tol = run.metrica_chave?.queda_maxima ?? 0
    if (queda > tol) falhas.push(`REGRESSAO: acerto caiu ${(queda * 100).toFixed(1)}pp (${(base.metricas.acerto * 100).toFixed(1)}% → ${(m.acerto * 100).toFixed(1)}%), tolerancia ${(tol * 100).toFixed(1)}pp`)

    // 6.1 Regressao por FATIA: a media esconde a regressao localizada. Este e o ponto do "fatie por
    //     dimensao" do dataset dourado — sem isto, perder um idioma inteiro passa despercebido.
    for (const [fatia, b] of Object.entries(base.metricas.por_fatia || {})) {
      const a = m.por_fatia?.[fatia]
      if (!a) { falhas.push(`fatia "${fatia}" existia no baseline e SUMIU do run — suite encolhida nao e suite melhorada`); continue }
      const q = b.acerto - a.acerto
      if (q > tol) falhas.push(`REGRESSAO na fatia "${fatia}": ${(b.acerto * 100).toFixed(1)}% → ${(a.acerto * 100).toFixed(1)}% (${(q * 100).toFixed(1)}pp)`)
    }

    // 6.2 Suite que encolheu: verde mais facil nao e verde melhor.
    const idsBase = new Set(base.casos.map(c => c.id))
    const idsRun = new Set(run.casos.map(c => c.id))
    const sumiram = [...idsBase].filter(i => !idsRun.has(i))
    if (sumiram.length) falhas.push(`${sumiram.length} caso(s) do baseline sumiram do run: ${sumiram.slice(0, 8).join(', ')} — remova do baseline por decisao explicita, nunca por omissao`)

    // 6.3 Melhorou numa dimensao e piorou noutra: decisao explicita, nao silenciosa.
    const subiu = Object.entries(m.por_fatia || {}).filter(([f, a]) => base.metricas.por_fatia?.[f] && a.acerto > base.metricas.por_fatia[f].acerto)
    const caiu = Object.entries(m.por_fatia || {}).filter(([f, a]) => base.metricas.por_fatia?.[f] && a.acerto < base.metricas.por_fatia[f].acerto)
    if (subiu.length && caiu.length) avisos.push(`trade-off entre fatias (subiu: ${subiu.map(([f]) => f).join(', ')} · caiu: ${caiu.map(([f]) => f).join(', ')}) — decida explicitamente`)
  }

  // 7. Reprodutibilidade: 1 repeticao nao mede nao-determinismo.
  if (run.repeticoes < 2) avisos.push('repeticoes=1: nao mede variancia. LLM nao-deterministico exige N amostras — e nao adianta apelar para temperature/seed (removidos/inexistentes nos modelos correntes do provider default).')
  if (run.modelo === 'nao-declarado') avisos.push('modelo nao declarado no run — comparacao com baseline fica sem lastro')

  return { falhas, avisos }
}

const argv = process.argv.slice(2)
const arq = argv.find(a => !a.startsWith('--'))
if (!arq) { console.error('uso: eval-gate.mjs <run.json> [--baseline baseline.json] [--json]'); process.exit(2) }
const run = carrega(arq)
if (run.__erro) { console.error(`✖ ${run.__erro}`); process.exit(2) }
if (run.schema !== 'schematize-ai/eval-run@1' || !Array.isArray(run.casos) || !run.metricas) {
  console.error(`✖ ${arq} nao e um run de eval (schema "schematize-ai/eval-run@1" com casos[] e metricas)`); process.exit(2)
}
const bArq = argv.includes('--baseline') ? argv[argv.indexOf('--baseline') + 1] : null
let base = null
if (bArq) {
  base = carrega(bArq)
  if (base.__erro) { console.error(`✖ baseline ${base.__erro}`); process.exit(2) }
  if (base.schema !== 'schematize-ai/eval-run@1') { console.error(`✖ baseline ${bArq} nao e um run de eval`); process.exit(2) }
}
const { falhas, avisos } = gate(run, base)
if (argv.includes('--json')) {
  console.log(JSON.stringify({ veredito: falhas.length ? 'reprovado' : 'aprovado', falhas, avisos, metricas: run.metricas }, null, 2))
} else {
  avisos.forEach(a => console.error(`  ! ${a}`))
  if (falhas.length) {
    console.error(`\n✖ EVAL REPROVADO — ${falhas.length} bloqueio(s):`)
    falhas.forEach(f => console.error(`  · ${f}`))
  } else {
    console.log(`✔ eval aprovado — acerto ${(run.metricas.acerto * 100).toFixed(1)}%, ${run.metricas.casos_adversariais} caso(s) adversarial(is), ${run.casos.length} caso(s).`)
  }
}
process.exit(falhas.length ? 1 : 0)
