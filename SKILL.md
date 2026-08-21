---
name: schematize-ai
metadata:
  version: 0.2.0
description: Engenharia de sistemas com IA/LLM da casa — software que usa modelos de linguagem com o MESMO rigor de segurança, dados e operação do resto da stack. Provider-agnóstico (Anthropic/Claude como default plugável; trocar provider é config, não reescrita). Cobre prompt & context engineering, RAG (ingestão, chunking, embeddings, retrieval, avaliação), agents & tool-use (loop, function calling, MCP), evals & guardrails (red-team, jailbreak, PII/safety, saída estruturada VALIDADA, deny-by-default), custo/latência/caching e observabilidade de LLM. PISOS: prompt injection é ataque de 1ª linha (texto que entra no prompt é hostil); saída de IA é NÃO CONFIÁVEL até validada por schema; NENHUM LLM decide autorização; segredo nunca no prompt; isolamento por tenant no RAG; tool de envio nunca dispara efeito externo fora de prd. Use SEMPRE que for projetar, gerar ou revisar feature com LLM — chatbot, copiloto, agente, RAG, sumarização/extração/classificação, LLM-as-judge, tool-use/MCP — mesmo que peça só "chama a API".
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

**Versão:** skill `schematize-ai` v0.2.0. Changelog em `CHANGELOG.md`.

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
| Agents & tool-use: o loop, function-calling, **MCP**, menor conjunto de tools, authz por tool no servidor, budget de passos/custo, human-in-the-loop, excessive agency, **tool de ENVIO sob o guard de efeito externo (sink/dry-run/cap)** | `references/agents.md` |
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

9. **Tool de envio do agente NUNCA dispara efeito externo fora de produção.** Um agente com tool de
   envio (`send_email`, `send_sms`, `send_push`, `webhook`, `charge`) é **a nova via de disparo em
   massa**: o laço erra mais barato, mais rápido e sem cansar do que qualquer humano — e continua
   errando enquanto sobrar budget. A normativa é a `schematize-engineering`
   (`references/efeitos-externos.md`); o recorte de agente está em `references/agents.md` §5.1.
   **(a)** A tool **herda o mesmo provider guardado** da aplicação (sink por default fora de `prd`,
   guard deny-by-default **dentro** do provider); **VETADO** a tool chamar o SDK do provedor ou SMTP
   direto "porque é só um e-mail". **(b)** **O modelo NUNCA decide destinatário externo** — o
   destinatário é resolvido **determinísticamente no servidor** a partir do `tenant_id`/token (id de
   registro, nunca string livre nos `args`); endereço fora do domínio de teste com `env != prd` →
   **erro**. É o piso 1 ("nenhum LLM decide autorização") e o piso 2 ("saída de IA é não confiável
   até validada") aplicados ao **efeito irreversível**. **(c)** **Dry-run por default fora de prd:**
   a tool devolve o que *teria* enviado e o teste lê o **sink** (Mailpit), nunca uma caixa real.
   **(d)** **Cap por execução do agente**, somado ao cap do provider — o loop é justamente o que
   **não para sozinho** (§6 budget); estourou, **aborta** a tarefa. **(e)** Envio é **irreversível**
   ⇒ human-in-the-loop quando o destinatário sai da fronteira. **Cenário de ataque de 1ª linha:**
   texto hostil vindo do RAG/de uma tool que induz o agente a mandar e-mail pra fora é
   **exfiltração de dado + abuso de recurso** na mesma tacada — e ainda queima a reputação do
   domínio (`references/seguranca-llm.md` §4.1).

   **O gate de máquina:** `scripts/check-external-effects.sh` (distribuído idêntico nesta skill — não é ponteiro para outro repo). Rode-o no CI: ele reprova endereço de caixa real em seed/fixture/persona, chave de provedor não-sandbox em `.env` de não-prd (fail-closed quando o ambiente não está declarado) e domínio de teste sem null MX. O vermelho dele está provado em `scripts/check-external-effects.test.sh`.

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
- **schematize-data** — o RAG **é um sistema de dados**, e por isso herda a disciplina de lá, não
  uma versão relaxada dela. O corpus tem **contrato** (o que entra, com que schema, de que fonte);
  a ingestão é **pipeline** (idempotente, reprocessável, com quarentena para o documento que não
  parseia); o índice tem **lineage** (todo chunk rastreável até o documento e a versão de origem —
  citação sem proveniência não é citação); e o conteúdo carrega **classificação de PII, base legal
  e retenção**, porque *"está só no embedding"* não é anonimização — embedding é dado derivado e
  reversível o bastante para reidentificar. O **isolamento por tenant** do §5 desta skill é o
  deny-by-default da `schematize-data` aplicado ao índice vetorial. Corpus que sai de produção para
  um ambiente de avaliação segue a mesma regra de cópia da `schematize-data` (PII reescrita,
  endereço em rota nula).
