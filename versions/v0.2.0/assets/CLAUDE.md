# CLAUDE.md — Engenharia de Sistemas com IA/LLM da Casa (sempre on)

> Copie para a **raiz do repositório** e ajuste `<project>`. Fica pinado no contexto de toda
> tarefa e garante o piso mesmo quando a skill `schematize-ai` não dispara sozinha. Em repo
> multi-skill, use **junto** com os `CLAUDE.md` das skills de engenharia (rode `/ai-claude`
> que mescla, sem sobrescrever os outros blocos). O piso de IA **soma-se** ao de segurança/IAM da
> `schematize-engineering`.

## Regra mestre

Um recurso de IA é software da casa — **superfície de ataque nova, custo variável novo e saída não
confiável** — e entra sob as mesmas regras (`schematize-engineering`), com red-team próprio
(`schematize-pentest`, `/pentest-ai`). A tese: **o LLM propõe, o servidor determinístico dispõe**;
**todo texto no prompt é hostil até prova em contrário**; **toda saída é não confiável até
validada**. Em conflito entre "põe um GPT aí rápido" e este piso, **o piso vence**. Consulte o
reference antes de agir — não trabalhe de memória.

## Pisos inegociáveis (VETADO — sem exceção)

1. **Nenhum LLM decide autorização.** Quem autoriza é **código determinístico no servidor** (IAM da
   casa, deny-by-default), com `tenant_id`/papel derivados do **token** — nunca do texto do prompt
   nem da saída do modelo. "O agente checou se podia" é UX, não controle de acesso.
2. **Toda saída de IA é NÃO CONFIÁVEL até validada.** Entra no sistema só após **validação
   determinística** (schema/tipo, allowlist, range). **Nunca** `eval`/exec, SQL, comando de shell ou
   HTML sem sanitização **direto** da saída do LLM (insecure output handling). Saída que vira ação
   passa por authz; ação irreversível, por human-in-the-loop.
3. **Prompt injection é ataque de 1ª linha.** Todo texto que chega ao prompt — usuário, documento do
   RAG, resultado de tool, página web, MCP de terceiro — é **hostil até prova em contrário**.
   System prompt e dado são canais separados; instrução vinda de dado **não é ordem**. Não há
   sanitização 100%: a defesa real é o piso 1 e 2 (o modelo nunca tem poder que a injeção abuse).
4. **Segredo nunca no prompt nem no cliente.** Chave do provider, secret, token, credencial **não**
   entram no prompt/system prompt/contexto nem em código que vai pro browser. A chamada ao LLM é
   **server-side**; o cliente fala com o **seu** backend, nunca com o provider direto com a chave.
5. **Provider-agnóstico por desenho.** Acesso ao modelo atrás de uma **porta `LLMProvider`**
   plugável (Anthropic/Claude default). Nada de SDK de provider na regra de negócio; trocar/rotear/
   fazer fallback de modelo é **config + ADR**, não reescrita.
6. **RAG isolado por tenant e cita a fonte.** Índice **filtrado por `tenant_id` server-side**,
   derivado do token (deny-by-default) — vazar contexto cross-tenant é IDOR em embeddings. Toda
   resposta ancorada **cita a fonte**; sem fonte relevante → **"não sei"**, não alucinar.
7. **Sem eval, não está pronto.** "Melhorei o prompt / o agente funciona" só vale com eval (dataset
   dourado + métrica + **regressão que trava a piora** no CI). Guardrails têm **teste adversarial**
   (injection/jailbreak/PII) no CI. Anedota não é evidência (mesmo oráculo do "suspeita ≠ achado").
8. **Observabilidade e budget de custo desde o dia 1.** Toda chamada nasce com **traço** (tokens
   in/out, modelo, custo, cache hit, latência) e **budget** com alerta + fallback/degradação. Sem
   log de prompt/resposta cru com PII/segredo (mascare; segredo real → **rotação**).

9. **Tool de envio do agente NUNCA dispara efeito externo fora de produção.** Agente com tool de
   envio (`send_email`/`send_sms`/`send_push`/`webhook`/`charge`) é **a nova via de disparo em
   massa** — o laço erra mais barato e mais rápido que um humano e **não para sozinho**. **(a)** A
   tool herda **o mesmo provider guardado** (sink por default fora de `prd`, guard deny-by-default
   **dentro** do provider); **VETADO** chamar o SDK do provedor/SMTP direto. **(b)** **O modelo
   nunca decide destinatário externo** — resolvido no servidor pelo `tenant_id`/token (`args` leva
   **id de registro**, não string de e-mail); endereço fora do domínio de teste com `env != prd` →
   **erro**. **(c)** **Dry-run por default** fora de prd; o teste lê o **sink** (Mailpit), nunca uma
   caixa real. **(d)** **Cap por execução do agente** (além do cap do provider) que **aborta**.
   **(e)** Envio é irreversível → human-in-the-loop + idempotência por `send_id`. **Ataque de 1ª
   linha:** texto hostil do RAG/tool que induz o envio pra fora = **exfiltração + abuso de recurso**
   + queima do domínio (derruba o OTP de **produção**). Normativa: `schematize-engineering` →
   `references/efeitos-externos.md`; recorte em `agents.md` §5.1 e `seguranca-llm.md` §4.1.

## Como se constrói IA aqui

- **Provider é ADR, não default acidental:** porta plugável, Claude default; para id de modelo/
  preço/caching/tool-use/token do provider default, **consulte a skill `claude-api`** — nunca de
  memória.
- **Desenhe o contexto, não só o prompt:** system prompt estável/cacheável separado do input;
  contexto mínimo suficiente; saída estruturada declarada e validada.
- **RAG (`/ai-rag`):** ingestão idempotente → chunking semântico versionado → embedding plugável →
  retrieval filtrado por tenant (híbrido + rerank, top-k enxuto) → **avaliação de retrieval E
  geração** com regressão → cita a fonte.
- **Agents (`/ai-guardrails` + agents.md):** loop com enforcement determinístico; menor conjunto de
  tools, cada uma com **authz server-side**; budget de passos/tokens; human-in-the-loop para o
  irreversível; MCP de terceiro como fonte hostil.
- **Evals & guardrails (`/ai-eval`, `/ai-guardrails`):** validação de saída por schema
  (deny-by-default); dataset dourado + regressão + teste adversarial no CI.
- **Observabilidade (`observabilidade-llm.md`):** span por chamada, dashboards/alertas versionados,
  budget por feature/tenant, fallback na porta do provider.

## Relação com as outras skills

- **schematize-engineering** — a base: segurança (§13/§13.4), IAM (auth server-side, deny-default —
  onde o piso 1 mora), dados/eventos (o RAG é pipeline), observabilidade LGTM (§16), FinOps (§33),
  DoD (§35), archive (§28), índice (§39).
- **schematize-pentest** — o red-team de LLM (`/pentest-ai`, OWASP LLM Top 10): guardrail sem
  red-team é teatro.
- **claude-api** — a referência de fato do provider default (id/preço/caching/tool-use/token).
- **schematize-web/go/rust/elixir/...** — o enforcement determinístico, a validação de saída, o
  servidor que guarda a chave e as tools rodam na stack escolhida; o front nunca segura a chave nem
  confia na saída no cliente.

## Gestão de contexto (sessões longas)

Ao se aproximar do teto de contexto: **PARE e** gere o handoff em `<project>_archive/context/`
(estado do provider/prompt/RAG/agente/guardrails/eval + FEITO vs EM ABERTO) **antes** de compactar
(`/ai-cc`).
