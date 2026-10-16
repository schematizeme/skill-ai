---
description: schematize-ai — carrega à força TODO o corpo normativo (engenharia LLM, RAG, agents, evals/guardrails, segurança, observabilidade) e passa a aplicá-lo
---

Carregue **à força** e passe a aplicar **integralmente** os Padrões de Engenharia de Sistemas com
IA/LLM da Casa (skill `schematize-ai`) neste projeto. A partir de agora, nesta sessão, isto **não é
opcional**.

1. **Leia agora, na íntegra, TODOS os references** — não trabalhe de memória. Caminho:
   `.claude/skills/schematize-ai/references/*.md` (projeto) ou
   `~/.claude/skills/schematize-ai/references/*.md` (global):
   - `engenharia-llm.md` — a **base**: provider-agnóstico (porta `LLMProvider` plugável, Claude
     default), prompt & context engineering, saída estruturada VALIDADA, quando (não) usar LLM,
     custo/latência/caching como arquitetura.
   - `rag.md` — RAG de ponta a ponta: ingestão, chunking, embeddings, retrieval (híbrido/rerank),
     **avaliação de retrieval**, **isolamento por tenant server-side**, citação de fonte, o corpus
     como superfície de injection indireta.
   - `agents.md` — o **loop** de agente: function-calling, **MCP**, menor conjunto de tools, **authz
     por tool no servidor** (deny-by-default), budget de passos/custo, human-in-the-loop, excessive
     agency sob rédea.
   - `evals.md` — **evals & guardrails**: dataset dourado, LLM-as-judge calibrado, regressão que
     trava a piora, validação de saída por schema, deny-by-default, teste adversarial no CI.
   - `seguranca-llm.md` — o piso defensivo: prompt injection (direto/indireto) como 1ª linha,
     insecure output handling, **nenhum LLM decide authz**, secrets, isolamento, OWASP LLM Top 10.
   - `observabilidade-llm.md` — traço por chamada (tokens in/out, custo, cache, latência), avaliação
     contínua, budget de custo/FinOps, degradação/fallback.

2. **Confirme ao usuário** que leu (1 linha por arquivo).

3. Deste ponto, aplique como regra inegociável: **nenhum LLM decide autorização** (enforcement
   determinístico server-side, deny-by-default), **toda saída de IA é não confiável** até validada
   por schema, **prompt injection é ataque de 1ª linha** (todo texto no prompt é hostil), **segredo
   nunca no prompt/cliente**, **provider-agnóstico** (porta plugável; troca é config + ADR), **RAG
   isolado por tenant + cita a fonte**, **sem eval não está pronto**, e **observabilidade + budget de
   custo desde o dia 1**. Sempre que a tarefa citar Claude/Anthropic ou uma API de LLM (id de modelo,
   preço, caching, tool-use, token), **consulte a skill `claude-api`** — não responda de memória.

4. **Atualize o `CLAUDE.md` da raiz** com `assets/CLAUDE.md` da skill (mescla se já houver de outra
   skill) — é o `/ai-claude`.
