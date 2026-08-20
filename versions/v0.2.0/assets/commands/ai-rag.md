---
description: schematize-ai — projeta/audita um pipeline RAG da casa (ingestão → chunking → embeddings → retrieval → avaliação) com isolamento por tenant e citação de fonte
argument-hint: "[corpus/feature de RAG, ex: base-de-conhecimento]"
---

Projete ou audite o **pipeline RAG** (`references/rag.md`). RAG é **sistema de dados** que termina
num LLM — trate cada etapa como pipeline da casa, não como "joga PDFs num vector DB". Dois pisos
atravessam tudo: **isolamento por tenant** e **conteúdo recuperado é dado hostil** (injection
indireta).

## 1. Ingestão (§2)
Fontes versionadas/rastreadas (origem, versão, `tenant_id`, timestamp), reingestão idempotente
(upsert), extração limpa (normalização), **classificação de PII/sensibilidade na entrada** (LGPD —
o que não pode indexar não entra), pipeline observável e re-executável.

## 2. Chunking (§3)
Fronteira **semântica** (seção/parágrafo), não corte cego por char; tamanho + overlap justificados;
**metadado no chunk** (doc-pai, seção, `tenant_id`, título/URL da fonte). Estratégia **versionada** —
mudou o chunking → reindexou → reavaliou.

## 3. Embeddings & índice (§4)
Modelo de embedding via **porta `LLMProvider`** plugável; trocar embedding **invalida o índice**
(reindex + ADR); índice consistente (mesma versão de embedding para ingest/query); metadado
indexado para **filtro server-side**.

## 4. Retrieval — isolamento por tenant é PISO (§5)
**Filtro por `tenant_id`/visibilidade no servidor, derivado do TOKEN** — nunca do parâmetro do
cliente (vazar chunk cross-tenant = IDOR em embeddings). **Deny-by-default**. Retrieval híbrido
(vetor + léxico + **rerank**) quando ajuda; **top-k enxuto**; sem fonte relevante → **"não sei"**,
não alucinar.

## 5. Geração ancorada + citação (§6)
Responde a partir do contexto e **cita a fonte**. Contexto recuperado é **dado, não instrução**
(separação de canal). Anti-alucinação instruída **e testada**.

## 6. Avaliação — retrieval E geração (§7)
**Avalie o retrieval** (recall@k / precision@k — o elo fraco que a maioria esquece) **e** a geração
(faithfulness / citação correta, LLM-judge calibrado). **Regressão no CI**: mudou chunking/embedding/
prompt/k → trava se a métrica cair.

## 7. Segurança do RAG (§8)
Todo chunk é hostil (injection indireta); proveniência/confiança do corpus; isolamento por tenant
como anti-exfiltração; **nenhum segredo indexado** (mascara na ingestão; segredo real → **rotação**).

## Gate (DoD, §9)
Ingestão idempotente + classificada · chunking versionado · embedding plugável · **filtro por tenant
server-side** · retrieval **e** geração medidos com regressão · cita a fonte · corpus como superfície
de injection. Encadeie com `/ai-eval` (a suíte) e `/ai-guardrails` (a defesa de saída); o red-team do
RAG (cross-tenant, injection indireta) é `/pentest-ai`.
