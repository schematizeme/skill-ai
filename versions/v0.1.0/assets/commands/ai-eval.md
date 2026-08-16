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

## 4. Regressão e gate no CI (§5)
Toda mudança (prompt/modelo/temperatura/chunking/k/tool) roda a suíte **antes do merge**; compara com
o **baseline versionado** e **trava se a métrica-chave cair** além do limiar. **Saída
machine-readable (JSON)** por fatia. Não-determinismo: N amostras, reporta média/variância — caso que
passa 1 em 3 **não** passou; fixe temperatura/seed onde der.

## 5. Guardrails entram na suíte (§7 — ver `/ai-guardrails`)
Casos **hostis** no dataset (injection direto/indireto, jailbreak, PII, saída malformada,
multi-tenant); o gate trava se algum **passar**. Guardrail sem teste adversarial é teatro.

## Gate (DoD, §8)
Dataset dourado versionado (com adversarial, sem PII) · métrica casada (determinística onde dá;
LLM-judge calibrado onde não) · **regressão no CI que trava a piora** (JSON) · custo/latência medidos
junto · incidente vira caso. O red-team **conduzido** (cadeias de ataque) é `/pentest-ai`; aqui é a
suíte automatizada.
