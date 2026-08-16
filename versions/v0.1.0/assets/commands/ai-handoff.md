---
description: Gera o handoff de contexto (context.md + checklist.md) no archive, SEM compactar
---

Gere o handoff da engenharia de IA **sem** compactar — pra fim de sessão ou troca de tarefa:

1. `<projeto>_archive/context/<YYYY-MM-DD-HH-MM-SS>-context.md` — feature de IA/LLM, provider/modelo
   (+ ADR), estado do prompt/context, do pipeline RAG (chunking/embedding/retrieval/filtro por
   tenant/avaliação), das tools/agente (authz por tool/budget), dos guardrails e da suíte de eval,
   decisões de custo/caching, achados de segurança (injection/authz/PII) e onde parou.
2. `<projeto>_archive/context/<YYYY-MM-DD-HH-MM-SS>-checklist.md` — **FEITO vs EM ABERTO** (pisos:
   nenhum LLM decide authz, saída validada por schema, segredo fora do prompt/cliente, RAG isolado
   por tenant + cita fonte, eval+regressão no CI, traço+budget de custo; itens em aberto + veredito
   parcial).

Não rode `/compact` — só arquiva.
