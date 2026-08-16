---
name: schematize-ai
metadata:
  version: 0.1.0
description: Engenharia de sistemas com IA/LLM da casa — a disciplina de construir software que usa modelos de linguagem com o MESMO rigor de segurança, dados e operação do resto da stack, nunca como brinquedo à parte. Provider-agnóstico (Anthropic/Claude como default plugável, nunca acoplado — troca de provider é config, não reescrita); cobre prompt & context engineering, RAG (ingestão, chunking, embeddings, retrieval, avaliação), agents & tool-use (loop, function calling, MCP), evals & guardrails (red-team, jailbreak, PII/safety, saída estruturada VALIDADA, deny-by-default), custo/latência/caching e observabilidade de LLM (traços, tokens por chamada, avaliação contínua). PISOS inegociáveis: prompt injection é ataque de 1ª linha (todo texto que entra no prompt — do usuário, do RAG, de tool — é hostil até prova em contrário); toda saída de IA é NÃO CONFIÁVEL até validada por schema/política determinística; NENHUM LLM decide autorização — enforcement é sempre determinístico no servidor; segredo nunca no prompt/no cliente; isolamento por tenant no índice do RAG. Use SEMPRE que for projetar, gerar, revisar ou refatorar qualquer feature com LLM — chatbot, assistente, copiloto, agente, pipeline RAG, sumarização/extração/classificação/reescrita, LLM-as-judge, geração de texto/código, tool-use/function-calling/MCP — mesmo sem citar "IA" nem "padrão", e mesmo que peça só "chama a API do modelo" ou "põe um GPT aí". Pareia com a schematize-engineering (a BASE: segurança §13, IAM, dados/eventos, observabilidade LGTM, DoD §35, archive §28), com a schematize-pentest (o red-team de LLM — OWASP LLM Top 10, o oráculo do "seguro de verdade") e com a linguagem de backend escolhida (go/rust/elixir/csharp/zig/ruby — o enforcement determinístico e as tools rodam no servidor daquela stack).
---

# Engenharia de sistemas com IA/LLM da casa (schematize-ai)

Disciplina normativa, **agnóstica de linguagem e de provider**, para construir software que usa
modelos de linguagem (LLMs) **com o mesmo piso** de segurança, dados e operação do resto da casa.
Um recurso de IA não é um brinquedo colado por fora: é **superfície de ataque nova, custo
variável novo e fonte de saída não confiável** — e entra na stack sob as mesmas regras
(`schematize-engineering`), com um red-team próprio (`schematize-pentest`, OWASP LLM Top 10).

A tese desta skill cabe em três frases: **o LLM propõe, o servidor determinístico dispõe**;
**todo texto que entra no prompt é hostil até prova em contrário**; **toda saída do modelo é não
confiável até validada**. Quem inverte qualquer uma delas — deixa o modelo *decidir* autorização,
confia no texto do RAG/usuário/tool, ou executa a saída crua — não construiu um produto de IA,
construiu um incidente agendado.

**Versão:** skill `schematize-ai` v0.1.0. Changelog em `CHANGELOG.md`.

## Comandos (Claude Code)

Digite `/ai-help` pra ver todos. Em resumo:

| Comando | O que faz |
|---|---|
| `/ai-help` | lista todos os comandos do schematize-ai |
| `/ai-load` | carrega à força TODO o corpo normativo (engenharia LLM, RAG, agents, evals/guardrails, segurança, observabilidade) e passa a aplicá-lo |
| `/ai-rag` | projeta/audita um pipeline RAG da casa: ingestão → chunking → embeddings → retrieval → avaliação, com isolamento por tenant e citação de fonte |
| `/ai-eval` | monta/roda a suíte de **evals** (dataset dourado, LLM-as-judge calibrado, regressão, gate de qualidade) antes de dizer "o prompt está bom" |
| `/ai-guardrails` | audita/scaffolda os **guardrails**: validação de saída por schema, deny-by-default, red-team de prompt injection/jailbreak, PII/safety, saída não confiável |
| `/ai-claude` | cria ou mescla o `CLAUDE.md` sempre-on de engenharia de IA na raiz do repo |
| `/ai-cc` | context compact: gera handoff no archive e roda `/compact` |
| `/ai-handoff` | gera o handoff (context.md + checklist.md) sem compactar |

Os comandos ficam em `assets/commands/` e são instalados em `.claude/commands/`.

## Como usar esta skill

1. **Provider é decisão de arquitetura, não default acidental.** Anthropic/Claude é o default da
   casa, atrás de uma **interface de provider plugável** (`references/engenharia-llm.md`). Trocar
   de modelo/provider é **config + ADR**, nunca reescrever a aplicação. Ao mexer em qualquer coisa
   que cite Claude/Anthropic ou uma API de LLM, **consulte a skill `claude-api`** para ids de
   modelo, preços e parâmetros — nunca responda de memória.
2. **Desenhe o contexto, não só o prompt** (`references/engenharia-llm.md`): system prompt estável
   e cacheável, contexto mínimo suficiente, saída estruturada declarada. Context engineering é
   engenharia — versionada, testada, medida.
3. **RAG é um sistema de dados** (`references/rag.md`): ingestão, chunking, embeddings, retrieval e
   **avaliação de retrieval** (não só de geração), com **isolamento por tenant no índice** e
   **citação de fonte** obrigatória.
4. **Agents são loops com poder** (`references/agents.md`): function-calling/MCP com o menor
   conjunto de tools, cada tool com authz própria no servidor, budget de passos/custo, e o humano
   no laço para ação irreversível.
5. **Evals & guardrails antes de "está pronto"** (`references/evals.md`): dataset dourado,
   LLM-as-judge calibrado, red-team de injection/jailbreak, validação de saída por schema,
   deny-by-default. Sem eval, "melhorei o prompt" é fé.
6. **Segurança de LLM é 1ª linha** (`references/seguranca-llm.md`): prompt injection (direto e
   indireto) é classe de ataque de primeira linha; nada de segredo no prompt; nenhum LLM decide
   autorização; enforcement determinístico no servidor.
7. **Meça custo, latência e qualidade** (`references/observabilidade-llm.md`): traço por chamada
   com tokens in/out, cache hit, custo e a avaliação contínua — LLM sem observabilidade é conta
   surpresa + regressão silenciosa.
8. **Não trabalhe de memória** — os detalhes estão nos references. Aplique os pisos abaixo
   independentemente do reference carregado.

Mapa de references — leia o que casa com a tarefa:

| Tarefa | Reference |
|---|---|
| A base: provider-agnóstico (interface plugável, Claude default), prompt & context engineering, saída estruturada, quando (não) usar LLM, custo/latência/caching como decisão de arquitetura | `references/engenharia-llm.md` |
| RAG de ponta a ponta: ingestão, chunking, embeddings, retrieval (híbrido, rerank), **avaliação de retrieval**, isolamento por tenant, citação de fonte, o RAG como superfície de injection indireta | `references/rag.md` |
| Agents & tool-use: o loop, function-calling, **MCP**, menor conjunto de tools, authz por tool no servidor, budget de passos/custo, human-in-the-loop, excessive agency | `references/agents.md` |
| Evals & guardrails: dataset dourado, LLM-as-judge calibrado, regressão, red-team (injection/jailbreak), validação de saída por schema, PII/safety, deny-by-default, gate de qualidade | `references/evals.md` |
| Segurança de LLM: prompt injection (direto/indireto) como 1ª linha, insecure output handling, secrets, isolamento, **nenhum LLM decide authz**, enforcement determinístico, OWASP LLM Top 10 | `references/seguranca-llm.md` |
| Observabilidade de LLM + FinOps: traço por chamada (tokens in/out, custo, cache hit, latência p95), avaliação contínua em produção, budget de custo, degradação/fallback | `references/observabilidade-llm.md` |

## Pisos inegociáveis (vetam o atalho)

Independente do reference, estes limites nunca são cruzados:

1. **Nenhum LLM decide autorização.** O modelo pode *sugerir*, *rascunhar*, *classificar* — mas
   **quem autoriza é código determinístico no servidor** (IAM da casa, deny-by-default). "O agente
   verificou se o usuário podia" **não é** controle de acesso: é UX. Toda tool, toda ação, toda
   leitura passa pelo PEP server-side com o `tenant_id`/papel derivados do **token**, nunca do
   texto do prompt (casa com `schematize-engineering` §15/§14 e o IAM da casa).
2. **Toda saída de IA é NÃO CONFIÁVEL até validada.** Saída do modelo entra no sistema **só** após
   passar por **validação determinística**: schema (JSON Schema/tipo), allowlist, range, e a mesma
   sanitização de qualquer input não confiável. Nunca `eval`/exec, nunca SQL, nunca comando de
   shell, nunca HTML sem sanitizar **direto** da saída do LLM (insecure output handling — OWASP
   LLM02). Saída que vira ação passa por confirmação/authz.
3. **Prompt injection é ataque de 1ª linha.** **Todo** texto que chega ao prompt — do usuário, de
   documento no RAG, de resposta de tool, de página buscada — é **hostil até prova em contrário**.
   System prompt e dados do usuário são canais separados; instrução vinda de dado (RAG/web/tool)
   **não é ordem**. Não há "sanitizar prompt" 100% — por isso o piso real é o 1 e o 2 (o modelo
   nunca tem poder que a injection possa abusar).
4. **Segredo nunca no prompt nem no cliente.** Chave de API do provider, secret, token, credencial
   de banco **não** entram no prompt, no system prompt, no contexto, nem em código que vai pro
   browser. A chamada ao LLM é **server-side**; o cliente fala com o **seu** backend, nunca com o
   provider direto com a chave (casa com `schematize-engineering` §13.4/§38).
5. **Provider-agnóstico por desenho.** O acesso ao modelo fica atrás de uma **interface de provider
   plugável** (Anthropic/Claude default). Nada de `anthropic.messages.create` espalhado pela regra
   de negócio; trocar/rotear/fazer fallback de modelo é **config + ADR**, não reescrita. Modelo,
   preço e limite mudam — a arquitetura não pode depender de um SKU.
6. **RAG é isolado por tenant e cita a fonte.** O índice vetorial é **particionado/filtrado por
   `tenant_id` server-side** (deny-by-default; nunca confia no filtro vindo do cliente) — vazar
   contexto cross-tenant no retrieval é a mesma falha de IDOR, agora em embeddings. Toda resposta
   ancorada em RAG **cita a fonte**; sem fonte recuperada, o piso é **"não sei"**, não alucinar.
7. **Sem eval, não está pronto.** "Melhorei o prompt" / "o agente funciona" só valem com **eval**:
   dataset dourado, métrica, e regressão que trava piora (mesma disciplina do red-first e do
   "suspeita ≠ achado" da `schematize-pentest`). Guardrails têm **teste adversarial** (injection/
   jailbreak/PII) no CI. Anedota de "testei uns prompts na mão" não é evidência.
8. **Observabilidade e budget de custo desde o dia 1.** Toda chamada de LLM nasce com **traço**
   (tokens in/out, modelo, custo, cache hit, latência) e **budget de custo** com alerta e
   fallback/degradação. LLM sem observabilidade é conta surpresa + regressão invisível (casa com
   `schematize-engineering` §16/§33).

## Relação com as outras skills

- **schematize-engineering** — a **BASE**. A engenharia de IA herda tudo dela: **segurança**
  (§13 segredos, §13.4 nada no cliente), **IAM** (auth como app separada, deny-by-default,
  enforcement server-side — é onde o piso 1 mora), **dados/eventos** (o RAG é pipeline de dados; o
  índice é um store), **observabilidade LGTM** (§16 — o traço de LLM é um span como outro
  qualquer) e **FinOps** (§33 — token é custo variável), além da **DoD (§35)**, do **archive
  (§28)** e do **índice/MAPA (§39)**. Esta skill é o **recorte de IA/LLM** desse piso.
- **schematize-pentest** — o **red-team de LLM** e o oráculo do "seguro de verdade". A segurança
  de IA aqui é o lado **construtivo** (como desenhar pra não vazar); a pentest é o lado
  **adversarial** (`/pentest-ai`: prompt injection direto/indireto, insecure output handling,
  excessive agency, cross-tenant no RAG, leak de system prompt, DoS de custo — OWASP LLM Top 10).
  Guardrail sem red-team é teatro; red-team sem guardrail é só a lista de como te invadem.
- **claude-api** — a **referência de fato** do provider default. Sempre que a tarefa citar Claude/
  Anthropic ou uma API de LLM (id de modelo, preço, caching, tool-use, streaming, contagem de
  token), **consulte-a** — não responda de memória. Esta skill diz *como desenhar*; a `claude-api`
  diz *o que a API faz hoje*.
- **schematize-go / rust / elixir / csharp / zig / ruby / node / web** — o **enforcement roda na
  stack escolhida**. O piso é agnóstico; o PEP determinístico, a validação de saída, o servidor que
  guarda a chave e as tools do agente são implementados na linguagem de backend (por fit + ADR) —
  e o front (schematize-web) nunca segura a chave nem confia na saída do modelo no cliente.
