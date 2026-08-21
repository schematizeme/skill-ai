# Anexo volátil — modelos, parâmetros e listas que mudam

> Parte da skill **schematize-ai**. **Fonte volátil.** Em engenharia de LLM quase tudo tem prazo:
> ID de modelo, preço, parâmetro aceito, numeração de lista de segurança. Este anexo existe para
> que o corpo normativo diga **princípio** e nunca **estado da API** — o lint do catálogo (regra
> `anexo-volatil`) reprova fato datado cravado fora daqui.
>
> **Verificado em: 2026-08-21.** Cadência: **revisão trimestral**, e sempre antes de um release.

## IDs de modelo — NÃO escreva de memória

- IDs do provider default têm a forma **`claude-opus-5`**, **`claude-sonnet-5`**,
  **`claude-haiku-4-5`** e **não levam sufixo de data**. ID inválido é **404 no primeiro request**.
- **A lista muda mais rápido que este arquivo.** Consulte `GET /v1/models` (que também devolve
  janela de contexto e capacidades) ou a doc oficial antes de pinar.
- Modelo é **config + ADR**, nunca literal espalhado na regra de negócio (`engenharia-llm.md` §2).

## Parâmetros que saíram da API

| Parâmetro | Estado (verificado em 2026-08-21) |
|---|---|
| `temperature` / `top_p` / `top_k` | **removidos** nos modelos correntes do provider default — retornam **400**. |
| `seed` | **nunca existiu** na API. |
| `budget_tokens` (thinking) | removido nos modelos correntes; o controle é `output_config.effort`. |

**O que reduz variância de verdade** (em ordem de força): saída **estruturada validada por
schema** (+ tool `strict: true`) → `output_config.effort` → prompt caching com prefixo estável →
`max_tokens` como teto. A eval **não depende** de determinismo do modelo: depende de **oráculo
determinístico** e **N repetições com limiar** (`evals.md`).

## Embeddings

- ✔ O provider default de **LLM** da casa **não oferece modelo de embedding** (a doc oficial dele
  recomenda **Voyage AI**). Por isso `embed()` é uma porta **separada** (`EmbeddingProvider`), não
  um método do `LLMProvider` — ver `engenharia-llm.md` §2 e `rag.md` §4.
- Trocar o modelo de embedding **invalida o índice inteiro**: é ADR, com plano de reindexação.

## OWASP LLM Top 10 — a edição vigente

**Edição 2025** (verificada em `genai.owasp.org/llm-top-10/`): LLM01 Prompt Injection · LLM02
Sensitive Information Disclosure · LLM03 Supply Chain · LLM04 Data & Model Poisoning · **LLM05
Improper Output Handling** · **LLM06 Excessive Agency** · LLM07 System Prompt Leakage · LLM08
Vector & Embedding Weaknesses · LLM09 Misinformation · LLM10 Unbounded Consumption.

> **A lista RENUMERA entre edições** — `Improper Output Handling` já foi LLM02. **Cite pelo nome
> da categoria, nunca só pelo número**, e confira a edição antes de mapear caso de teste.

## A regra que NÃO é volátil

Prompt injection é ataque de 1ª linha; saída de IA é **não confiável** até validada por
schema/política determinística; **nenhum LLM decide autorização**; segredo nunca no prompt;
isolamento por tenant no índice; tool de envio **não** dispara efeito externo fora de produção.
Isso não muda quando a API muda.
