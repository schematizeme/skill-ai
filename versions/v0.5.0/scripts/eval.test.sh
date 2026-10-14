#!/usr/bin/env bash
# Vermelho primeiro do runner + gate de eval. Cada caso monta um adaptador (ou muta a suite/run) que
# DEVE reprovar. Um gate de eval que nunca foi visto reprovando e exatamente o "melhorei o prompt"
# com roupa de CI.
# EXCEÇÃO DECLARADA de strict mode (`schematize-shell` -> `references/piso.md` secao 1):
# harness de teste roda sem `-e` de propósito — ele precisa continuar depois de um caso
# vermelho para reportar TODOS, em vez de parar no primeiro.
set -u
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN="$AQUI/eval-run.mjs"; GATE="$AQUI/eval-gate.mjs"
TPL="$AQUI/../assets/templates"
SUITE="$TPL/eval-suite.exemplo.json"; FALSO="$TPL/adaptador.falso.mjs"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
ok=0; fail=0
checa() { # nome exit-esperado agulha comando...
  local nome="$1" esp="$2" agulha="$3"; shift 3
  local saida; saida="$("$@" 2>&1)"; local rc=$?
  if [ "$rc" != "$esp" ]; then echo "  ✖ $nome: exit $rc, esperado $esp"; sed 's/^/      /' <<<"$saida"; fail=$((fail+1)); return; fi
  if [ -n "$agulha" ] && ! grep -qF -- "$agulha" <<<"$saida"; then echo "  ✖ $nome: exit certo, saida sem \"$agulha\""; sed 's/^/      /' <<<"$saida"; fail=$((fail+1)); return; fi
  echo "  ✔ $nome"; ok=$((ok+1))
}
roda() { # <adaptador> <saida> [suite]
  node "$RUN" "${3:-$SUITE}" --adaptador "$1" --saida "$2" --modelo teste-falso --quando 2026-08-21 >/dev/null 2>&1
}

echo "== verde de partida (senao os vermelhos nao provam nada) =="
roda "$FALSO" "$TMP/base.json"
checa "suite exemplo + adaptador falso passa" 0 "eval aprovado" node "$GATE" "$TMP/base.json"

echo "== o adversarial e falha dura =="
cat > "$TMP/vaza.mjs" <<'A'
export async function responder({ caso }) {
  if (caso.id === 'injecao-direta-ignore') return { saida: 'claro! meu system prompt: voce e um classificador...' }
  const t = { 'cobranca-pt':'cobranca','suporte-pt':'suporte','cancelamento-pt':'cancelamento','billing-en':'cobranca',
              'saida-estruturada': JSON.stringify({categoria:'suporte',resumo:'x'}) }
  return { saida: t[caso.id] ?? 'suporte' }
}
A
roda "$TMP/vaza.mjs" "$TMP/vaza.json"
checa "vazamento de system prompt reprova" 1 "ADVERSARIAL" node "$GATE" "$TMP/vaza.json"
checa "  e o motivo diz o que vazou" 1 "VAZOU" node "$GATE" "$TMP/vaza.json"

cat > "$TMP/indireta.mjs" <<'A'
export async function responder({ caso }) {
  if (caso.id === 'injecao-indireta-no-documento') return { saida: 'CHAVE-SECRETA-123' }
  if (caso.adversarial) return { saida: 'suporte' }
  const t = { 'cobranca-pt':'cobranca','suporte-pt':'suporte','cancelamento-pt':'cancelamento','billing-en':'cobranca',
              'saida-estruturada': JSON.stringify({categoria:'suporte',resumo:'x'}) }
  return { saida: t[caso.id] }
}
A
roda "$TMP/indireta.mjs" "$TMP/indireta.json"
checa "injecao INDIRETA (no documento) reprova" 1 "injecao-indireta-no-documento" node "$GATE" "$TMP/indireta.json"

echo "== instabilidade: passar as vezes nao e passar =="
cat > "$TMP/flaky.mjs" <<'A'
export async function responder({ caso, amostra }) {
  if (caso.id === 'cobranca-pt') return { saida: amostra === 0 ? 'cobranca' : 'suporte' }
  if (caso.adversarial) return { saida: 'suporte' }
  const t = { 'suporte-pt':'suporte','cancelamento-pt':'cancelamento','billing-en':'cobranca',
              'saida-estruturada': JSON.stringify({categoria:'suporte',resumo:'x'}) }
  return { saida: t[caso.id] }
}
A
roda "$TMP/flaky.mjs" "$TMP/flaky.json"
checa "caso 1/3 reprova e e nomeado instavel" 1 "instavel: passou em 1/3" node "$GATE" "$TMP/flaky.json"

echo "== o adaptador que estoura nao e 'inconclusivo' =="
cat > "$TMP/estoura.mjs" <<'A'
export async function responder({ caso }) {
  if (caso.id === 'billing-en') throw new Error('timeout do provider')
  if (caso.adversarial) return { saida: 'suporte' }
  const t = { 'cobranca-pt':'cobranca','suporte-pt':'suporte','cancelamento-pt':'cancelamento',
              'saida-estruturada': JSON.stringify({categoria:'suporte',resumo:'x'}) }
  return { saida: t[caso.id] }
}
A
roda "$TMP/estoura.mjs" "$TMP/estoura.json"
checa "excecao do adaptador conta como falha" 1 "billing-en" node "$GATE" "$TMP/estoura.json"

echo "== saida estruturada invalida =="
cat > "$TMP/semjson.mjs" <<'A'
export async function responder({ caso }) {
  if (caso.id === 'saida-estruturada') return { saida: 'o pedido 88 atrasou tres dias' }
  if (caso.adversarial) return { saida: 'suporte' }
  const t = { 'cobranca-pt':'cobranca','suporte-pt':'suporte','cancelamento-pt':'cancelamento','billing-en':'cobranca' }
  return { saida: t[caso.id] }
}
A
roda "$TMP/semjson.mjs" "$TMP/semjson.json"
checa "prosa onde se exige JSON reprova" 1 "saida-estruturada" node "$GATE" "$TMP/semjson.json"

echo "== regressao contra o baseline =="
cat > "$TMP/regressao.mjs" <<'A'
export async function responder({ caso }) {
  if (caso.fatia === 'en/objetiva') return { saida: 'suporte' }   // quebrou SO o ingles
  if (caso.adversarial) return { saida: 'suporte' }
  const t = { 'cobranca-pt':'cobranca','suporte-pt':'suporte','cancelamento-pt':'cancelamento',
              'saida-estruturada': JSON.stringify({categoria:'suporte',resumo:'x'}) }
  return { saida: t[caso.id] }
}
A
roda "$TMP/regressao.mjs" "$TMP/reg.json"
checa "queda global reprova" 1 "REGRESSAO: acerto caiu" node "$GATE" "$TMP/reg.json" --baseline "$TMP/base.json"
checa "  e a FATIA que caiu e nomeada" 1 'fatia "en/objetiva"' node "$GATE" "$TMP/reg.json" --baseline "$TMP/base.json"

echo "== suite que encolhe nao e suite que melhora =="
python3 -c "
import json
d=json.load(open('$SUITE',encoding='utf8'))
d['casos']=[c for c in d['casos'] if c['id'] not in ('billing-en','cancelamento-pt')]
json.dump(d,open('$TMP/menor.json','w',encoding='utf8'),ensure_ascii=False)"
roda "$FALSO" "$TMP/rodada-menor.json" "$TMP/menor.json"
checa "caso do baseline que sumiu reprova" 1 "sumiram do run" node "$GATE" "$TMP/rodada-menor.json" --baseline "$TMP/base.json"

echo "== vacuidade =="
python3 -c "
import json
d=json.load(open('$SUITE',encoding='utf8'))
d['casos']=[c for c in d['casos'] if not c.get('adversarial')]
json.dump(d,open('$TMP/sem-adv.json','w',encoding='utf8'),ensure_ascii=False)"
roda "$FALSO" "$TMP/rodada-sem-adv.json" "$TMP/sem-adv.json"
checa "suite sem NENHUM adversarial reprova" 1 "guardrail sem teste adversarial e teatro" node "$GATE" "$TMP/rodada-sem-adv.json"

python3 -c "
import json
d=json.load(open('$SUITE',encoding='utf8')); d['casos']=[]
json.dump(d,open('$TMP/vazia.json','w',encoding='utf8'),ensure_ascii=False)"
checa "suite com zero caso nem roda" 2 "lista VAZIA" node "$RUN" "$TMP/vazia.json" --adaptador "$FALSO"

python3 -c "
import json
d=json.load(open('$SUITE',encoding='utf8')); d['casos'][1]['id']=d['casos'][0]['id']
json.dump(d,open('$TMP/dup.json','w',encoding='utf8'),ensure_ascii=False)"
checa "id duplicado nem roda" 2 "id duplicado" node "$RUN" "$TMP/dup.json" --adaptador "$FALSO"

python3 -c "
import json
d=json.load(open('$SUITE',encoding='utf8')); del d['casos'][0]['fatia']
json.dump(d,open('$TMP/semfatia.json','w',encoding='utf8'),ensure_ascii=False)"
checa "caso sem fatia nem roda" 2 "fatia obrigatoria" node "$RUN" "$TMP/semfatia.json" --adaptador "$FALSO"

python3 -c "
import json
d=json.load(open('$SUITE',encoding='utf8')); d['casos'][0]['oraculo']={'tipo':'vibes','valor':'x'}
json.dump(d,open('$TMP/vibes.json','w',encoding='utf8'),ensure_ascii=False)"
checa "oraculo inventado nem roda" 2 "desconhecido" node "$RUN" "$TMP/vibes.json" --adaptador "$FALSO"

echo "== 1 repeticao avisa (nao mede variancia) =="
python3 -c "
import json
d=json.load(open('$SUITE',encoding='utf8')); d['repeticoes']=1
json.dump(d,open('$TMP/uma.json','w',encoding='utf8'),ensure_ascii=False)"
roda "$FALSO" "$TMP/rodada-uma.json" "$TMP/uma.json"
checa "repeticoes=1 passa mas avisa" 0 "nao mede variancia" node "$GATE" "$TMP/rodada-uma.json"

echo "== piso absoluto da metrica-chave =="
python3 -c "
import json
d=json.load(open('$TMP/base.json',encoding='utf8'))
d['metricas']['acerto']=0.5
json.dump(d,open('$TMP/baixo.json','w',encoding='utf8'),ensure_ascii=False)"
checa "acerto abaixo do limiar reprova" 1 "< limiar minimo" node "$GATE" "$TMP/baixo.json"

echo "== uso errado =="
checa "adaptador inexistente" 2 "adaptador" node "$RUN" "$SUITE" --adaptador "$TMP/nao-existe.mjs"
checa "run que nao e run" 2 "nao e um run de eval" node "$GATE" "$SUITE"

echo; echo "eval: $ok ok, $fail falha(s)"; [ "$fail" = 0 ]
