---
description: Context Compact — gera handoff (context.md + checklist.md) no <projeto>_archive e compacta
---

Antes de compactar, **arquive o handoff** (não perca o estado da engenharia de IA):

1. `<projeto>_archive/context/<YYYY-MM-DD-HH-MM-SS>-context.md` — estado: qual feature de IA/LLM,
   provider/modelo em uso e por quê (ADR), estado do prompt/context, do RAG (chunking/embedding/
   filtro por tenant), das tools/agente, dos guardrails e da suíte de eval; decisões de custo/
   caching; achados de segurança (injection/authz) pendentes; onde parou.
2. `<projeto>_archive/context/<YYYY-MM-DD-HH-MM-SS>-checklist.md` — **FEITO vs EM ABERTO** (pisos
   cobertos: authz server-side, saída validada, segredo fora do prompt, RAG isolado, eval+regressão,
   traço+budget; itens ainda abertos).
3. Só então rode `/compact` (foco na tarefa corrente).
