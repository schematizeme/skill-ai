---
description: schematize-ai — lista todos os comandos disponíveis e o que cada um faz
---

Liste os comandos do **schematize-ai** instalados (`/ai-*`), com 1 linha cada:

- `/ai-help` — esta lista.
- `/ai-load` — carrega à força TODO o corpo normativo (engenharia LLM, RAG, agents, evals/guardrails, segurança de LLM, observabilidade) e passa a aplicá-lo.
- `/ai-rag` — projeta/audita um pipeline **RAG** da casa: ingestão → chunking → embeddings → retrieval → **avaliação de retrieval**, com **isolamento por tenant** e **citação de fonte**.
- `/ai-eval` — monta/roda a suíte de **evals**: dataset dourado, métrica casada com a tarefa, LLM-as-judge calibrado, **regressão que trava a piora** no CI. Sem eval, não está pronto.
- `/ai-guardrails` — audita/scaffolda os **guardrails**: validação de saída por **schema** (deny-by-default), red-team de **prompt injection/jailbreak**, PII/safety, insecure-output — com teste adversarial no CI.
- `/ai-claude` — cria ou mescla o `CLAUDE.md` sempre-on de engenharia de IA na raiz do repo.
- `/ai-cc` — context compact: gera handoff no archive e roda `/compact`.
- `/ai-handoff` — gera o handoff (context.md + checklist.md) sem compactar.

Depois da lista, lembre os **pisos**: *o LLM propõe, o servidor determinístico dispõe.* **Nenhum
LLM decide autorização** (enforcement server-side, deny-by-default); **toda saída de IA é não
confiável** até validada por schema; **prompt injection é ataque de 1ª linha** (todo texto no
prompt — usuário/RAG/tool — é hostil); **segredo nunca no prompt/cliente**; **RAG isolado por
tenant + cita a fonte**; e **sem eval não está pronto** (guardrail sem red-team é teatro). O
red-team conduzido (OWASP LLM Top 10) é a `schematize-pentest` (`/pentest-ai`); a base (segurança/
IAM/observabilidade/DoD/archive) é a `schematize-engineering`; para o provider default (Claude/
Anthropic — id de modelo, preço, caching, tool-use) **consulte a skill `claude-api`**, nunca de
memória. Detalhe normativo em `references/` da skill `schematize-ai`.
