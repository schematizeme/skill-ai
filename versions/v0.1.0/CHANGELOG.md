# Changelog — schematize-ai

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/). Versionamento semântico.

## [0.1.0] — 2026-08-15

Primeira versão da skill de **engenharia de sistemas com IA/LLM** da casa — construir software com
modelos de linguagem sob o mesmo piso de segurança, dados e operação do resto da stack
(`schematize-engineering`), com red-team próprio (`schematize-pentest`, OWASP LLM Top 10) e o
provider default plugável (Claude/Anthropic — referência de fato na skill `claude-api`).

### Adicionado
- **SKILL.md** com 8 pisos inegociáveis (nenhum LLM decide autorização; toda saída de IA é não
  confiável até validada; prompt injection é ataque de 1ª linha; segredo nunca no prompt/cliente;
  provider-agnóstico por desenho; RAG isolado por tenant + cita a fonte; sem eval não está pronto;
  observabilidade + budget de custo desde o dia 1) + mapa de references + relação com engineering/
  pentest/claude-api/linguagens.
- **references/**:
  - `engenharia-llm.md` — a base: quando (não) usar LLM, provider-agnóstico (porta `LLMProvider`
    plugável, Claude default), prompt engineering (prompt é código versionado), context engineering
    (contexto mínimo, canais separados), saída estruturada VALIDADA, custo/latência/caching como
    arquitetura, DoD da feature de IA.
  - `rag.md` — RAG de ponta a ponta: ingestão idempotente, chunking semântico versionado, embeddings/
    índice, retrieval com **isolamento por tenant server-side** (deny-by-default), citação de fonte,
    **avaliação de retrieval E geração** com regressão, corpus como superfície de injection indireta.
  - `agents.md` — o loop de agente: function-calling, **MCP**, contrato de tool, **authz por tool
    server-side**, excessive agency sob rédea (menor conjunto + human-in-the-loop), budget de passos/
    tokens/custo, estado/memória/multi-agente.
  - `evals.md` — evals (dataset dourado, métrica casada, LLM-as-judge calibrado, regressão que trava
    a piora no CI) + guardrails (entrada/saída, validação de schema deny-by-default, insecure-output)
    + teste adversarial (injection/jailbreak/PII/multi-tenant).
  - `seguranca-llm.md` — o piso defensivo: prompt injection direto/indireto como 1ª linha, insecure
    output handling, **nenhum LLM decide authz**, leak de system prompt, secrets, isolamento, DoS de
    custo, mapa ao OWASP LLM Top 10.
  - `observabilidade-llm.md` — span por chamada (tokens in/out, custo, cache, latência/TTFT),
    avaliação contínua em produção, budget de custo/FinOps, degradação/fallback na porta do provider,
    runbook.
- **assets/commands/**: `/ai-help`, `/ai-load`, `/ai-rag`, `/ai-eval`, `/ai-guardrails`, `/ai-claude`,
  `/ai-cc`, `/ai-handoff`.
- **assets/CLAUDE.md** — regra sempre-on: os 8 pisos de IA, aditivos ao piso de segurança/IAM da
  engenharia.
