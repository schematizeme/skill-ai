---
description: schematize-ai — monta/roda a suíte de evals (dataset dourado, LLM-as-judge calibrado, regressão que trava a piora) antes de dizer "o prompt está bom"
argument-hint: "[feature/prompt a avaliar]"
---

Monte ou rode a suíte de **evals** (`references/evals.md`). Piso 7 da skill: **sem eval, não está
pronto**. "Melhorei o prompt / o agente funciona" só vale com **dado** — dataset, métrica, regressão
—, não anedota. É o **red-first** da engenharia de IA (mesmo oráculo do "suspeita ≠ achado" da
`schematize-pentest`).

## 1. Dataset dourado (§2)
Casos representativos com resposta/rótulo esperado: **feliz + borda + difícil + adversarial**.
**Versionado** no repo, com dono; **sem PII/segredo real** (sintético/anonimizado); **fatiado** por
dimensão (tipo/idioma/tenant-shape). Todo incidente de produção **vira caso novo**.

## 2. Métrica casada com a tarefa (§3)
- Objetiva (extração/classificação): exact-match / F1 / precision-recall — **determinística, sem
  LLM-judge**.
- RAG: recall@k/precision@k + faithfulness/citação (`/ai-rag`, `references/rag.md` §7).
- Geração aberta: rubrica explícita + **LLM-as-judge calibrado** (§ próximo) ou humano em amostra.
- Operacionais **sempre**: custo/tokens, latência p95, taxa de falha de validação de saída.

## 3. LLM-as-judge calibrado (§4)
Rubrica explícita e binária/escalar por critério (não "está bom?"). **Calibre contra rótulo humano**
(mede concordância; juiz que discorda de humano é ruído). Cuidado com viés (posição/verbosidade/
auto-preferência) — juiz ≠ gerador quando possível. O juiz também é atacável: trata a saída como
dado, não executa nada.

## 4. Regressão e gate no CI (§5) — com os artefatos, não com a intenção

Isto **roda**; não é um conselho:

```bash
# 1. a régua (dataset dourado), no repo do projeto:      assets/schemas/eval-suite.schema.json
# 2. o adaptador, no repo do projeto (é ele que conhece o provider):
#                                                        assets/templates/adaptador.exemplo.mjs
node .claude/skills/schematize-ai/scripts/eval-run.mjs eval/suite.json \
     --adaptador ./eval/adaptador.mjs --saida eval/run.json --modelo claude-opus-5

# 3. o veredito: 0 passa · 1 REPROVA · 2 documento inválido
node .claude/skills/schematize-ai/scripts/eval-gate.mjs eval/run.json --baseline eval/baseline.json
```

O gate reprova: **qualquer** caso adversarial que falhe (falha dura, sem limiar que a compre); caso
abaixo do `limiar_aprovacao`; acerto abaixo do `limiar_minimo`; queda além do `queda_maxima` **na
média ou em qualquer fatia** (a média esconde a regressão localizada — perder um idioma inteiro
passaria); **caso do baseline que sumiu do run** (suíte que encolhe não é suíte que melhora); e suíte
**sem nenhum caso adversarial** (guardrail sem teste adversarial é teatro).

**Não-determinismo:** N amostras e limiar de aprovação — caso que passa 1 em 3 **não** passou, e o
gate o nomeia como *instável* mesmo quando o limiar o deixa passar. E **não apele para
`temperature`/`seed`**: nos modelos correntes do provider default esses parâmetros foram
**removidos** (`400`) e `seed` nunca existiu (✔ verificado em 2026-08-21). Variância se controla com
repetições, limiar e **saída validada por schema** — não com parâmetro de sampling.

## 5. Guardrails entram na suíte (§7 — ver `/ai-guardrails`)
Casos **hostis** no dataset (injection direto/indireto, jailbreak, PII, saída malformada,
multi-tenant); o gate trava se algum **passar**. Guardrail sem teste adversarial é teatro.

O oráculo desses casos é o **`nega`**: a saída não pode conter o segredo, o system prompt, o
endereço de exfiltração. É determinístico de propósito — perguntar a um modelo se outro modelo
vazou é trocar a prova por opinião. O exemplo em `assets/templates/eval-suite.exemplo.json` traz os
três: injeção direta, injeção **indireta** (payload dentro do documento classificado) e exfiltração
por ferramenta.

**O red-team no CI (a promessa de `references/seguranca-llm.md` §8) é este gate**, rodando os casos
adversariais em todo PR. O red-team *conduzido* — cadeias, criatividade, alvo vivo — continua sendo
`/pentest-ai`. Um não substitui o outro: a suíte impede a regressão do que já se sabe; o conduzido
descobre o que ninguém tinha pensado.

## Gate (DoD, §8)
Dataset dourado versionado (com adversarial, sem PII) · métrica casada (determinística onde dá;
LLM-judge calibrado onde não) · **regressão no CI que trava a piora** (JSON) · custo/latência medidos
junto · incidente vira caso. O red-team **conduzido** (cadeias de ataque) é `/pentest-ai`; aqui é a
suíte automatizada.
