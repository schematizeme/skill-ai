# Anexo volátil — modelos, parâmetros e listas que mudam

> Parte da skill **schematize-ai**. **Fonte volátil.** Em engenharia de LLM quase tudo tem prazo:
> ID de modelo, preço, parâmetro aceito, numeração de lista de segurança. Este anexo existe para
> que o corpo normativo diga **princípio** e nunca **estado da API** — o lint do catálogo (regra
> `anexo-volatil`) reprova fato datado cravado fora daqui.
>
> **Verificado em: 2026-10-14 (ids, papéis e parâmetros de sampling da família Claude 5 conferidos na doc oficial).** Cadência: **revisão trimestral**, e sempre antes de um release.

## IDs de modelo — NÃO escreva de memória

- Família **Claude 5** do provider default (verificada em 2026-10-14), ids **sem sufixo de data**:
  - **`claude-opus-5-5`** — o mais capaz da linha Opus; raciocínio profundo e agentes de horizonte longo.
  - **`claude-sonnet-5-5`** — o equilíbrio capacidade/custo/latência; o default para carga geral.
  - **`claude-haiku-5-5`** — o rápido e barato; classificação, extração e roteamento em volume.
  - **`claude-fable-5-1`** — o de raciocínio exigente e trabalho agêntico de longo horizonte; mais lento que os demais. A doc manda começar pelo Opus e subir para o Fable quando o eval no Opus em esforço alto ainda não bate a meta. Fonte: <https://platform.claude.com/docs/en/models/fable-5-1/overview> (2026-10-14).
  - Preço **não** é cravado aqui: leia a tabela oficial no momento da decisão.
  ID inválido é **404 no primeiro request**.
- **A lista muda mais rápido que este arquivo.** Consulte `GET /v1/models` (que também devolve
  janela de contexto e capacidades) ou a doc oficial antes de pinar.
- Modelo é **config + ADR**, nunca literal espalhado na regra de negócio (`engenharia-llm.md` §2).

## Parâmetros que saíram da API

| Parâmetro | Estado (verificado em 2026-10-14) |
|---|---|
| `temperature` / `top_p` / `top_k` | **removidos**: qualquer valor diferente do default retorna **400** no Opus 4.7 e posteriores, incluindo o Opus 5.5 (o SDK Python v1+ nem define os parâmetros). Omita-os; guie o comportamento por prompt. `temperature=0` nunca garantiu saída idêntica. Fonte: <https://platform.claude.com/docs/en/models/opus-5-5/migration-guide> (2026-10-14); para Sonnet/Haiku/Fable, a doc de migração do Opus 5.5 não os cita, então valide no primeiro request. |
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
