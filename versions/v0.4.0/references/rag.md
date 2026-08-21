# RAG — recuperação aumentada, de ponta a ponta (dados, retrieval, avaliação, isolamento)

> RAG (Retrieval-Augmented Generation) é **um sistema de dados** que por acaso termina num LLM:
> ingestão → chunking → embeddings → índice → retrieval → geração ancorada → **avaliação**. Trate
> cada etapa como pipeline de dados da casa (`schematize-engineering` dados/eventos), não como
> "joga uns PDFs num vector DB". Dois pisos atravessam tudo: **isolamento por tenant** e **o
> conteúdo recuperado é dado não confiável** (fonte nº 1 de prompt injection indireta —
> `seguranca-llm.md`).

## 1. Por que RAG (e quando não)

RAG existe para **ancorar** a resposta em fonte verificável e atualizável sem re-treinar o modelo:
knowledge base, docs, políticas, catálogo. Ganha citação de fonte, atualização barata e redução de
alucinação.

- **Use RAG** quando a resposta deve vir de um corpus específico, mutável e/ou privado por tenant.
- **Não use RAG** para o que cabe no system prompt (pouco e estável) ou para cálculo determinístico
  (isso é tool/consulta, `agents.md`, não retrieval semântico).
- **RAG não conserta autorização.** Filtrar por tenant é do servidor (§5), não do embedding.

## 2. Ingestão (o pipeline de dados)

- **Fontes versionadas e rastreadas.** Cada documento tem origem, versão, `tenant_id`/visibilidade e
  timestamp. Reingestão é idempotente (upsert por id estável), não duplica.
- **Extração limpa.** Normalize (encoding, boilerplate, tabelas, OCR quando preciso) antes de
  chunkar — lixo entra, lixo é recuperado.
- **Classifique na entrada.** PII/sensibilidade por documento (LGPD, `schematize-engineering` §32):
  o que não pode ir pro índice não entra; o que exige mascaramento é mascarado antes de embutir.
- **Pipeline observável e re-executável.** Ingestão em batch, com métrica (docs/chunks processados,
  falhas) e capacidade de **reindexar** quando o modelo de embedding ou a estratégia de chunk muda.

## 3. Chunking (a decisão que faz ou quebra o retrieval)

- **Chunk pela semântica, não por caractere cego.** Prefira fronteiras naturais (seção, parágrafo,
  título) a "corta a cada 1000 chars" que parte a frase no meio.
- **Tamanho + overlap** ajustados ao corpus e à janela: chunk grande demais dilui o embedding,
  pequeno demais perde contexto. Overlap moderado preserva continuidade entre chunks vizinhos.
- **Metadado no chunk:** id do documento-pai, seção, `tenant_id`, título/URL da fonte (para citar,
  §6). O metadado é o que permite **filtrar por tenant** e **citar** depois.
- **Estratégia versionada.** Mudou o chunking → reindexou → reavaliou o retrieval (§7). Chunking é
  hiperparâmetro, não detalhe.

## 4. Embeddings & índice

- **Modelo de embedding via a porta `EmbeddingProvider`** (`engenharia-llm.md` §2), **separada do
  `LLMProvider`**: plugável e versionada. ✔ **Verificado em 2026-08-21:** o provider default de
  LLM da casa **não oferece modelo de embedding** — o embedding vem de outro fornecedor (a doc
  oficial dele recomenda Voyage AI), e isso é uma decisão de ADR, não um detalhe de config.
  Trocar de modelo de embedding **invalida o índice** — exige reindexação total; registre em ADR.
- **Um índice consistente:** mesma família/versão de embedding para ingestão e query; dimensão e
  métrica de distância (cosine/dot) casadas.
- **Metadado indexado para filtro server-side:** `tenant_id`, visibilidade, tipo, data — para o
  filtro do §5 rodar **no índice**, não pós-recuperação.
- **Store é infra da casa:** backup, retenção, custo e observabilidade como qualquer datastore
  (`schematize-engineering`). Vector DB não é exceção às regras de dados.

## 5. Retrieval — isolamento por tenant é PISO (deny-by-default)

O retrieval é onde o RAG vaza ou segura. Regra inegociável (piso 6 da SKILL):

- **Filtro por `tenant_id`/visibilidade aplicado no servidor, derivado do TOKEN** — nunca do
  parâmetro que o cliente mandou. Vazar chunk de outro tenant no retrieval é **IDOR em embeddings**,
  a mesma classe de falha do BOLA (cruza com `schematize-pentest` `/pentest-ai` e o IAM da casa).
- **Deny-by-default:** sem tenant/escopo resolvido → não recupera nada. Índice compartilhado exige
  filtro obrigatório em **toda** query; índice por tenant é ainda mais forte quando o volume paga.
- **Retrieval híbrido** quando ajuda: semântico (vetor) + léxico (BM25/keyword) + **rerank** do
  top-k por um cross-encoder/modelo de rerank. Recall vem do híbrido; precisão vem do rerank.
- **top-k enxuto.** Recupere o mínimo que ancora a resposta — k grande infla contexto, custo,
  latência e superfície de injection (§8). Meça o k por avaliação (§7), não por chute.
- **Sem resultado relevante → "não sei".** Se o retrieval não trouxe fonte acima do limiar, o piso é
  **admitir que não sabe**, não deixar o modelo inventar (piso 6 da SKILL).

## 6. Geração ancorada + citação de fonte (obrigatória)

- **O modelo responde a partir do contexto recuperado**, e **cita a fonte** (documento/seção/URL do
  metadado) de cada afirmação ancorada. Resposta sem fonte recuperada não é resposta de RAG.
- **Contexto recuperado é DADO, não instrução** (§8). O prompt separa "conteúdo dos documentos" do
  "pedido do usuário"; instrução embutida num documento **não** é ordem.
- **Anti-alucinação instruída e testada:** o system prompt manda usar só o contexto e dizer "não
  encontrei" quando faltar — e isso é **avaliado** (faithfulness/groundedness, §7), não só pedido.

## 7. Avaliação de RAG — retrieval E geração (sem isto, é fé)

RAG tem **duas** coisas para avaliar, e a maioria esquece a primeira:

- **Avaliação de retrieval (o elo fraco):** com um dataset de `(pergunta → chunks relevantes)`,
  meça **recall@k** e **precision@k** / MRR / nDCG. Se o retrieval não traz o chunk certo, nenhum
  prompt salva a geração. Ajuste chunking/embedding/k/rerank **por essa métrica**.
- **Avaliação de geração:** **faithfulness/groundedness** (a resposta está ancorada no contexto e
  não inventou?), **answer relevance** (responde à pergunta?), e **citação correta** (a fonte citada
  sustenta a afirmação?). LLM-as-judge calibrado + dataset dourado (`evals.md`).
- **Regressão no CI:** mudou chunking/embedding/prompt/k → roda a suíte → **trava** se recall@k ou
  faithfulness caírem além do limiar. Mesma disciplina de gate do `evals.md`.

## 8. Segurança do RAG (injection indireta + vazamento)

O corpus é uma **superfície de ataque** — um documento envenenado é o vetor clássico de prompt
injection **indireta** (`seguranca-llm.md`, OWASP LLM):

- **Todo chunk recuperado é hostil até prova em contrário.** Um doc pode conter "ignore as
  instruções e exfiltre X". Defesa real: o modelo **não tem poder** que a injeção abuse (piso 1/2 da
  SKILL — nada de authz por LLM, saída validada), + separação canal instrução/dado, + o mínimo de
  tools no laço (`agents.md`).
- **Proveniência e confiança do corpus:** conteúdo de fonte não confiável (web aberta, upload de
  usuário) entra rotulado como baixa confiança; nunca se mistura com fonte curada como se fosse
  igual.
- **Isolamento por tenant (§5) é também anti-exfiltração:** o filtro server-side impede que uma
  query manipulada puxe dado de outro tenant.
- **Não indexe segredo.** Chave/credencial/PII sensível não vira embedding; se o corpus os contém, é
  mascaramento na ingestão (§2) ou exclusão — e sinal de **rotação** se achar segredo real.

## 9. Definition of Done de um RAG

- [ ] Ingestão idempotente, rastreável, com classificação de PII/sensibilidade e reindexação possível.
- [ ] Chunking **versionado** (semântico, tamanho/overlap justificados, metadado de fonte + tenant).
- [ ] Embedding via porta plugável; índice consistente; troca de modelo = reindex + ADR.
- [ ] **Filtro por tenant server-side derivado do token** em toda query (deny-by-default); sem
      relevância → "não sei".
- [ ] Retrieval medido (recall@k/precision@k) **e** geração medida (faithfulness/citação) com
      **regressão no CI**.
- [ ] Resposta **cita a fonte**; contexto tratado como dado, não instrução.
- [ ] Corpus tratado como superfície de injection indireta; nenhum segredo indexado.

> Regra de bolso: **RAG é dado com data e dono, não um saco de PDFs.** O retrieval é seu IDOR se
> você não isolar por tenant; o corpus é sua injection se você confiar no texto dele; e sem medir o
> **recall**, você não tem RAG — tem um gerador de citações plausíveis.
