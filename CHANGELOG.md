# Changelog — schematize-ai

Todas as mudanças relevantes deste pacote, no formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
com versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.4.0] — 2026-08-21
Segunda leva do saneamento (inventário da vistoria).

### Adicionado
- **`agents.md` §3.1 — MCP nas três formas.** A skill tratava MCP só como "servidor que você expõe"; entraram **connector/cliente nativo** (consumir tool de terceiro — e aí *o servidor é fonte hostil, porque a injeção indireta chega pelo **resultado** da tool*) e **agente hospedado pelo provider** (muda onde o segredo vive e quem executa a tool: sem cofre gerenciado, a tool sensível fica do seu lado, e *o agente hospedado chama a **sua** API, não o seu banco*). Com a pergunta que unifica as três — **quem resolve identidade, tenant e escopo?** — e a resposta que não muda: o seu servidor.
- **`engenharia-llm.md` — as duas alavancas de custo que faltavam, e que hoje são as principais:** **esforço de raciocínio/adaptive thinking** (multiplica tokens de saída; é **escolha por tarefa**, **medida no eval** — *se subir o esforço não muda a métrica, você está pagando por nada* — e registrada no span) e **teto de trabalho por tarefa** (`task_budget`, limites de loop): *em agente o custo não vem de uma chamada, vem do laço — sem teto, um loop de tool que se auto-alimenta transforma um bug de prompt numa fatura*.

## [0.3.0] — 2026-08-21
O piso 7 (**"sem eval, não está pronto"**) deixou de ser prosa. A vistoria de 2026-08-21 achou a skill com **zero scripts** — *a tese central só existia como texto*.

### Adicionado
- **`assets/schemas/eval-suite.schema.json`** — o dataset dourado como formato: `repeticoes`, `limiar_aprovacao`, `metrica_chave` (piso absoluto + queda máxima) e casos com **fatia** obrigatória e **oráculo** declarado.
- **`scripts/eval-run.mjs`** — o runner: N amostras por caso, 5 oráculos **determinísticos** (`exato`, `contem`, `regex`, `nega`, `json`), métricas por fatia, latência p95 e tokens, saída JSON. Não conhece provider nem guarda chave — quem faz isso é o **adaptador, que vive no projeto**; é o que permite rodar offline e testar o próprio gate.
- **`scripts/eval-gate.mjs`** — o veredito com exit code (`0`/`1`/`2`). Reprova: **qualquer** falha adversarial (dura, sem limiar que compre); caso abaixo do limiar de aprovação; acerto abaixo do piso; regressão **na média e em qualquer fatia**; **caso do baseline que sumiu do run**; suíte **sem nenhum caso adversarial**. Nomeia caso *instável* (passa 2/3) mesmo quando o limiar o deixa passar.
- **`scripts/eval.test.sh`** — **19 casos**, quase todos vermelhos de propósito: vazamento de system prompt, injeção **indireta** (payload dentro do documento), caso 1/3, exceção do adaptador (que **não** é "inconclusivo"), prosa onde se exige JSON, regressão localizada numa fatia, suíte que encolheu, suíte sem adversarial, id duplicado, caso sem fatia, oráculo inventado.
- **`assets/templates/`** — `eval-suite.exemplo.json` (8 casos, 3 adversariais), `adaptador.exemplo.mjs` (SDK real) e `adaptador.falso.mjs` (determinístico, com a ressalva escrita de que testa a tubulação, não o modelo).
- **`assets/ci/ai-eval.yml`** — o workflow, com as duas decisões que ninguém escreve: qual adaptador roda no PR, e que o job precisa ser **required** para travar alguma coisa.

### Corrigido
- `/ai-eval` §4 mandava *"fixe temperatura/seed onde der"* — contradizendo o que `references/evals.md` §5 já registrava como verificado: nos modelos correntes do provider default `temperature`/`top_p`/`top_k` foram **removidos** (`400`) e `seed` **nunca existiu**. Variância se controla com repetições + limiar + saída validada por schema.

### Mudado
- `references/seguranca-llm.md` §8 — o item *"Red-team no CI com gate"* agora diz **com o quê**: os casos adversariais da suíte rodando em todo PR, com `/pentest-ai` como o red-team *conduzido* ao lado (um não substitui o outro).

## [0.2.0] — 2026-08-20

Propagação do piso **efeito externo NUNCA sai de não-produção** (normativa em
`schematize-engineering` → `references/efeitos-externos.md`) para o recorte de IA/LLM: **agente com
tool de envio é a nova via de disparo em massa** — o laço erra mais barato, mais rápido e não para
sozinho.

### Adicionado
- **SKILL.md**: piso inegociável **9 — "Tool de envio do agente NUNCA dispara efeito externo fora de
  produção"** (provider guardado herdado; modelo nunca decide destinatário externo; dry-run por
  default fora de `prd`; cap por execução do agente; human-in-the-loop no irreversível; injeção →
  envio como cenário de ataque de 1ª linha) + linha do mapa de references atualizada.
- **references/agents.md** §5.1 **"Tool de ENVIO — efeito externo com o modelo no meio"**: as 6
  regras em tabela (provider guardado, destinatário resolvido no servidor por `id` de registro,
  dry-run + sink, cap por execução do agente, human-in-the-loop + idempotência por `send_id`, veto a
  tool genérica de envio), lista de destinatários **VETADOS**, domínio de teste em rota nula,
  pseudocódigo do enforcement entre os passos 2 e 3 do loop, e o cenário de injeção indireta → envio.
  Item novo na DoD do agente.
- **references/seguranca-llm.md** §4.1 **"Injeção → ENVIO: exfiltração + abuso de recurso na mesma
  tacada"**: o cenário do documento hostil que pede encaminhamento, a tabela do estrago triplo
  (exfiltração / abuso de recurso / queima de reputação que derruba o **OTP de login de produção**) e
  o que fecha cada um. Item novo na DoD de segurança de LLM e linha LLM02 da tabela OWASP.
- **references/evals.md** §7: caso adversarial **"injeção que pede ENVIO"** (espera-se recusa
  determinística, nada sai) e a suíte rodando contra o **sink**; DoD atualizada.
- **assets/CLAUDE.md**: piso sempre-on **9** com o mesmo recorte.

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
