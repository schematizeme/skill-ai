# Engenharia de sistemas com LLM — a base (provider-agnóstico, prompt & context, saída estruturada)

> Um recurso de IA é software: entra na stack com arquitetura, teste, segurança e operação — não
> "coladinho por fora com uma API key". Este reference é o piso de como se **liga** um LLM a um
> sistema da casa sem acoplar, sem vazar e sem virar conta surpresa. RAG tem reference próprio
> (`rag.md`), agents idem (`agents.md`), a prova de qualidade em `evals.md`, a defesa em
> `seguranca-llm.md` e o custo/traço em `observabilidade-llm.md`.

## 1. Quando (não) usar LLM

Antes de "põe um modelo aí", a pergunta é se **precisa** de um. LLM é caro, não-determinístico e
uma superfície de ataque nova. Regra da casa:

- **Não use LLM** para o que uma regra, um regex, um classificador barato ou um `switch` resolvem
  com determinismo. "Extrair um CPF de um texto" é regex, não prompt. Determinístico é mais barato,
  testável e auditável.
- **Use LLM** onde a entrada é linguagem natural aberta e a saída tolera variação com validação:
  sumarização, extração semântica, classificação difusa, reescrita, geração assistida, roteamento
  de intenção, resposta ancorada em documentos (RAG).
- **Nunca use LLM** como fonte de verdade para número que precisa fechar (dinheiro, saldo,
  contagem), para decisão de autorização (piso 1 da SKILL) ou como único gatekeeper de segurança.
- **Registre a decisão num ADR** quando um LLM entra num caminho de produção: por quê, qual
  provider/modelo, qual o custo esperado por chamada, qual o fallback determinístico.

## 2. Provider-agnóstico por desenho (Claude default, plugável)

O acesso ao modelo fica **atrás de uma interface** (porta/adaptador). Anthropic/Claude é o default
da casa; a aplicação **não conhece** o SDK.

- **Uma porta `LLMProvider`** com o mínimo: `complete(messages, tools?, opts) -> {text|tool_calls, usage}`.
  Adaptadores: `AnthropicProvider` (default), e outros por config.
- **`embed(texts) -> vectors` é uma porta SEPARADA (`EmbeddingProvider`), não um método do
  `LLMProvider`.** ✔ **Verificado em 2026-08-21** na documentação oficial do provider default:
  *"Anthropic does not offer its own embedding model"* — a recomendação de lá é **Voyage AI**.
  Uma interface única com `complete` + `embed` é **insatisfazível pelo adaptador default**: ou o
  `AnthropicProvider` implementa `embed` levantando "não suportado" (e aí a porta mente sobre o
  contrato), ou alguém liga o RAG a um provider que não é o default sem perceber. Duas portas,
  duas configs, dois ADRs — e o provider de embedding é **versionado**, porque trocá-lo invalida o
  índice inteiro (`rag.md` §4).
- **VETADO** `anthropic.messages.create(...)` (ou o SDK de qualquer provider) espalhado na regra de
  negócio. Isso é a mesma regra do repositório de dados: a aplicação fala com a **porta**, não com
  o driver.
- **Config, não código:** modelo, provider, temperatura, teto de tokens, timeout e rota de fallback
  vêm de configuração por ambiente. Trocar **o ID do modelo** por outro, ou rotear "barato pro
  fácil, forte pro difícil", é mudança de config + ADR — nunca reescrever a feature.
  > **Não escreva ID de modelo de memória.** `claude-sonnet` (que este arquivo usava como exemplo)
  > **não é um ID válido** — os IDs correntes do provider default têm a forma `claude-opus-5`,
  > `claude-sonnet-5`, `claude-haiku-4-5`, e **não levam sufixo de data**. Um ID inválido é `404`
  > no primeiro request. Consulte a API de modelos (`GET /v1/models`) ou a doc oficial; a lista
  > muda mais rápido que qualquer arquivo desta skill. *(Este era o piso 5 da própria skill sendo
  > contrariado pelo exemplo dela — ✔ verificado em 2026-08-21.)*
- **Fallback e roteamento** vivem na porta: provider fora do ar / rate-limit → degrada para outro
  modelo ou para o caminho determinístico, com o traço registrando qual rota serviu.
- **Ids de modelo, preço e parâmetros mudam** — não os fixe de memória. Para o provider default,
  **consulte a skill `claude-api`** (id exato do modelo, preço por token, janela de contexto,
  caching, tool-use, contagem de token). Este reference diz *como desenhar*; a `claude-api` diz *o
  que a API faz hoje*.

## 3. Prompt engineering (o prompt é código versionado)

Prompt é artefato de engenharia: versionado, revisado, testado (`evals.md`), com dono.

- **System prompt estável e separado.** Papel, política, formato de saída e limites vão no system
  prompt — **estável** entre requisições (para cachear, §6) e **separado** do input do usuário
  (canal distinto; §5 e `seguranca-llm.md`).
- **Instrução explícita e verificável.** Diga o formato exato, os limites ("se não souber, diga
  não sei"), e o que **não** fazer. Ambiguidade vira alucinação e custo.
- **Exemplos (few-shot) quando ajudam**, versionados junto do prompt; não cole dado real de cliente
  como exemplo (PII).
- **Nunca concatene input do usuário dentro de uma instrução** ("Resuma isto: {texto}") sem tratar
  `{texto}` como dado hostil — é o vetor clássico de injection (§5, `seguranca-llm.md`). Use a
  separação de papéis/mensagens do provider, não string-building.
- **Prompt tem changelog.** Mudou o prompt → rodou a suíte de eval → registrou o resultado. "Ajustei
  o prompt e ficou melhor" sem eval é fé (piso 7 da SKILL).

## 4. Context engineering (desenhar o contexto, não só o prompt)

O que **entra** na janela de contexto é decisão de engenharia — precisão, custo e latência saem
daí.

- **Contexto mínimo suficiente.** Encha a janela com o que a tarefa **precisa**, não com tudo o
  que existe. Contexto inchado degrada qualidade (o modelo perde o fio), estoura custo e latência,
  e amplia a superfície de injection.
- **Priorize e comprima.** Recupere só o top-k relevante (RAG, `rag.md`), sumarize histórico longo,
  descarte o irrelevante. Ordem importa (instrução crítica não some no meio de 100k tokens).
- **Marque a origem de cada bloco.** Dado recuperado, histórico e input do usuário são **canais
  distintos** e rotulados como **dados** — nunca como instrução (§5). O modelo trata "conteúdo do
  documento" como conteúdo, não como ordem.
- **Janela e orçamento.** Conheça a janela do modelo (via `claude-api`) e orce tokens por chamada;
  contexto que cresce sem teto é custo sem teto (`observabilidade-llm.md`, FinOps).

## 5. Saída estruturada (declarada e VALIDADA)

Saída de LLM que o sistema consome é **estruturada e validada** — nunca "parseia o texto e torce".

- **Declare o schema** (JSON Schema / tipo / tool-use com input schema) e peça a saída nesse
  formato. Use o mecanismo do provider (structured output / tool-calling) em vez de implorar por
  JSON no prompt quando disponível.
- **Valide SEMPRE, determinístico, no servidor** (piso 2 da SKILL): a saída passa por validação de
  schema + regras de negócio (range, allowlist, enum) **antes** de qualquer uso. Falhou → rejeita/
  re-tenta com backoff/cai no fallback; nunca "usa assim mesmo".
- **Saída nunca vira ação crua.** JSON do modelo **não** é executado (`eval`/exec), **não** vira
  SQL/comando de shell/HTML sem sanitização, **não** dispara ação irreversível sem authz + validação
  (insecure output handling — `seguranca-llm.md`). A saída é **proposta**; o servidor determinístico
  dispõe.
- **Determinismo onde dá — e o mecanismo REAL, não o folclore.** ✔ **Verificado em 2026-08-21:**
  nos modelos correntes do provider default, **`temperature`/`top_p`/`top_k` foram REMOVIDOS e
  retornam `400`**, e **`seed` nunca existiu na API**. Prescrever "fixe temperature/seed" é
  prescrever uma chamada que falha — eram as duas únicas alavancas de determinismo que este
  arquivo citava. O que de fato reduz variância, em ordem de força:
  1. **Saída estruturada com schema** (`output_config.format`) e **tool com `strict: true`** — o
     formato deixa de ser negociado em prosa e passa a ser **validado**. É o mais próximo de
     determinismo que existe, e casa com o piso §4 (*saída de IA é não-confiável até validada*).
  2. **`output_config.effort`** — controla profundidade/gasto de raciocínio de forma explícita, no
     lugar do antigo ajuste de sampling.
  3. **Prompt caching com prefixo estável** — mesmo prefixo, mesmo caminho; e `cache_read_input_tokens`
     zerado denuncia um invalidador silencioso (timestamp no system prompt, JSON não ordenado).
  4. **`max_tokens` como teto** e temperatura **onde o provider ainda a aceita** (modelos antigos e
     outros providers) — não como piso da casa.
  > **A eval não depende de determinismo do modelo** (`evals.md`): ela depende de **oráculo
  > determinístico** e de **N repetições com limiar**, porque a variância existe e não vai sumir.

## 6. Custo, latência e caching (arquitetura, não afterthought)

Token é custo variável e latência é UX. Isso entra no desenho, não depois.

- **Prompt caching.** System prompt estável e contexto reutilizável ficam **cacheáveis** — desenhe
  o prompt para o cache do provider morder (parte estável no início; ver mecânica atual na
  `claude-api`). Cache derruba custo e latência de forma dramática em cargas repetidas.
- **Cache de resultado.** Requisição idêntica (mesmo input normalizado) → resposta cacheada por TTL,
  quando a tarefa admite. Não cacheie resposta que dependa de authz/tenant sem particionar a chave
  por `tenant_id`.
- **Roteamento por dificuldade.** Modelo forte só onde precisa; barato/menor para o trivial
  (classificação, roteamento). É a maior alavanca de custo depois do cache.
- **Esforço de raciocínio / thinking adaptativo — hoje a alavanca que mais move a conta.** Nos
  modelos correntes, o *quanto o modelo pensa* é um parâmetro (esforço/adaptive thinking), e ele
  multiplica **tokens de saída** — que são os caros. O piso: **esforço alto é escolha por tarefa**
  (extração e classificação quase nunca precisam), medida no eval (`evals.md`) — *se subir o esforço
  não muda a métrica, você está pagando por nada*; e ele entra no **span** (`observabilidade-llm.md`),
  senão a conta sobe sem ninguém saber qual chamada mudou. A forma exata do parâmetro é volátil:
  confirme na `claude-api` antes de codar.
- **Teto de trabalho por tarefa (`task_budget` e limites de loop).** Em agente, o custo não vem de
  uma chamada: vem do **laço**. Todo agente roda com **teto explícito** — de passos, de tokens, de
  tempo, de chamadas de tool — e o que estoura **para com erro tratável**, não continua. *Sem teto,
  um loop de tool que se auto-alimenta transforma um bug de prompt numa fatura.* Isto é o mesmo piso
  do cap de efeito externo, aplicado a dinheiro.
- **Streaming para latência percebida.** Resposta longa faz streaming para o usuário; internamente,
  a validação (§5) roda sobre o resultado completo antes de virar ação.
- **Batch para offline.** Ingestão/avaliação/embeddings em massa vão por API de batch (mais barata),
  não em loop síncrono de chamadas unitárias.
- **Budget e degradação.** Cada feature de IA tem budget de custo com alerta; estourou / provider
  fora → degrada (modelo menor, cache, ou caminho determinístico), nunca derruba o produto
  (`observabilidade-llm.md`).

## 7. Definition of Done de uma feature com LLM

Uma feature de IA só é "pronta" quando:

- [ ] Acesso ao modelo atrás de **porta `LLMProvider`** plugável; nenhum SDK de provider na regra de
      negócio; modelo/provider/fallback por **config + ADR**.
- [ ] Prompt **versionado** (system separado do input; input tratado como dado, §5/`seguranca-llm.md`).
- [ ] Saída **estruturada e validada** determinística no servidor; saída nunca vira ação/SQL/exec cru.
- [ ] Chamada ao LLM **server-side**; chave do provider **nunca** no cliente/no prompt.
- [ ] **Eval** com dataset dourado + regressão no CI (`evals.md`); guardrails com teste adversarial.
- [ ] **Traço** por chamada (tokens in/out, custo, cache hit, latência) + **budget** com alerta e
      fallback (`observabilidade-llm.md`).
- [ ] Se usa RAG: isolamento por tenant + citação de fonte (`rag.md`). Se é agente: authz por tool +
      budget de passos (`agents.md`).
- [ ] ADR do "por que LLM aqui" com o fallback determinístico documentado.

> Regra de bolso: **o LLM propõe, o servidor determinístico dispõe.** Prompt é código, contexto é
> arquitetura, saída é não confiável, token é custo — e provider é uma porta, não um casamento.
