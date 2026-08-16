# Agents & tool-use — o loop, function-calling, MCP, e o poder sob rédea curta

> Um "agente" é um **loop**: o modelo lê o estado, escolhe uma ação (chamar uma tool), o servidor
> executa e devolve o resultado, repete até terminar. O que separa um produto de um incidente é
> quanto **poder** esse loop tem e quão **determinístico** é o controle em volta. Pisos que
> atravessam tudo: **nenhuma tool decide a própria authz** (é server-side), **o menor conjunto de
> tools**, **budget de passos/custo**, e **humano no laço para o irreversível**. Casa com OWASP
> LLM06 (excessive agency) e o `/pentest-ai`.

## 1. O loop de agente (anatomia)

1. **Contexto** — system prompt (papel, política, tools disponíveis) + estado/histórico + input.
2. **Decisão** — o modelo emite `tool_call(name, args)` estruturado (ou responde ao usuário).
3. **Enforcement** — o servidor **valida** `args` (schema), **autoriza** a chamada (authz da tool,
   §4), executa a tool determinística, captura o resultado.
4. **Observação** — resultado volta ao modelo como **dado** (não instrução), rotulado.
5. **Repete** até condição de parada: tarefa concluída, budget esgotado, ou erro → encerra limpo.

Tudo entre o passo 2 e o 3 é **código determinístico da casa**. O modelo **propõe** a ação; o
servidor **dispõe** (piso 1 da SKILL). O modelo nunca executa nada por conta própria.

## 2. Function-calling / tool-use (contrato de tool)

- **Toda tool tem schema de input** (JSON Schema / tipo) e o servidor **valida `args`** antes de
  executar — args do modelo são **saída não confiável** (`engenharia-llm.md` §5). Fora do schema →
  rejeita, não "tenta adivinhar".
- **Tool faz uma coisa, com efeito conhecido.** Prefira tools estreitas e nomeadas (`get_invoice`,
  `create_ticket`) a uma tool genérica `run_sql`/`http_get`/`exec` que entrega o sistema à injeção.
  Tool genérica poderosa = excessive agency por desenho.
- **Descrição da tool é parte do prompt** (o modelo escolhe por ela): versionada, testada em eval
  (`evals.md`). Descrição ambígua = tool errada chamada.
- **Erro de tool é dado, não crash.** Falha/timeout volta ao loop como observação tratável; o
  agente não trava nem vaza stack trace pro usuário.

## 3. MCP (Model Context Protocol) — tools/dados como serviço

MCP padroniza expor tools/recursos a um modelo por um protocolo. Na casa:

- **Servidor MCP é um serviço com as regras da casa:** autenticação, authz por chamada, rate-limit,
  observabilidade e isolamento — não um atalho para dar acesso cru a banco/FS/rede.
- **Cada tool exposta por MCP passa pelo PEP** (§4): o servidor MCP resolve identidade/tenant/escopo
  **server-side** e nega por default. Expor um recurso por MCP **não** relaxa a authz.
- **Servidor MCP de terceiro é fonte não confiável:** trate suas respostas como dado hostil
  (injection indireta, `seguranca-llm.md`); só habilite os que você audita; menor privilégio.
- **Config plugável:** quais servidores/tools MCP o agente enxerga é config + ADR, com o inventário
  de tools versionado (parte do MAPA da aplicação, `schematize-engineering` §39).

## 4. Authz por tool — SERVER-SIDE, deny-by-default (o piso)

Este é o piso 1 da SKILL aplicado a agentes, e a defesa nº 1 contra excessive agency:

- **Cada tool checa autorização no servidor**, com `tenant_id`/papel derivados do **token da
  sessão**, nunca de `args` do modelo nem do texto do prompt. "O agente confirmou que o usuário é
  admin" **não é** authz — é UX.
- **Deny-by-default:** tool sem permissão explícita para aquela identidade **não executa**. O
  conjunto de tools disponível é **derivado do papel** (um viewer não vê a tool de escrita).
- **Menor privilégio das credenciais da tool:** a tool acessa só o recurso que precisa, com a
  credencial mínima — comprometer o loop não vira RCE no banco.
- **Nada de segredo nos args nem no contexto** (piso 4): a tool guarda sua credencial server-side; o
  modelo nunca vê chave.

## 5. Excessive agency sob rédea (o poder limitado por desenho)

Excessive agency (OWASP LLM06) = o agente pode fazer **mais** do que devia. Contenções:

- **Menor conjunto de tools.** Dê ao agente só as tools da tarefa. Cada tool extra é superfície.
- **Human-in-the-loop para o irreversível.** Ação com efeito colateral relevante (pagar, deletar,
  enviar, mudar permissão, gastar) exige **confirmação humana explícita** ou passa por uma fila de
  aprovação — o loop propõe, o humano ratifica. Automação total só para ação reversível/barata.
- **Efeito colateral idempotente e reversível quando possível:** tools com id de idempotência,
  ações com desfazer/janela de cancelamento (casa com o "atraso cancelável" do IAM).
- **Sem auto-escalada.** O agente não amplia o próprio escopo/tools/credenciais em runtime; mudar
  poder é fora do loop, com authz.

## 6. Budget — passos, tokens, custo, tempo (o loop tem fim)

Um loop sem teto é um DoS de custo esperando acontecer (OWASP LLM10):

- **Teto de passos/iterações** por tarefa: atingiu → encerra e reporta, não roda pra sempre.
- **Budget de tokens/custo** por tarefa e por tenant, com o traço somando (`observabilidade-llm.md`).
  Estourou → aborta limpo + alerta.
- **Timeout por tool e por tarefa;** detecção de **laço** (mesma ação repetida sem progresso) →
  quebra o ciclo.
- **Rate-limit e quota por tenant** no acesso ao agente — um tenant não drena o budget de todos.

## 7. Estado, memória e multi-agente

- **Estado explícito e auditável.** O histórico do loop (ações, observações, decisões) é rastreável
  para depurar e para o traço; não é uma caixa preta.
- **Memória é dado com dono e tenant.** Memória persistente entre sessões é store da casa
  (isolamento por tenant, retenção, PII) — e é **superfície de injection** (algo salvo por um doc
  hostil vira contexto depois). Trate como o corpus do RAG (`rag.md`).
- **Multi-agente só quando paga.** Orquestrador + sub-agentes aumentam custo e superfície; cada
  sub-agente herda **todos** os pisos (authz por tool, budget, saída validada). Prefira o loop
  simples enquanto ele resolve.

## 8. Definition of Done de um agente

- [ ] Loop com **enforcement determinístico** entre decisão e execução; modelo nunca executa direto.
- [ ] Toda tool com **schema de input validado** server-side; args tratados como saída não confiável.
- [ ] **Authz por tool server-side, deny-by-default**, derivada do token; conjunto de tools mínimo e
      por papel.
- [ ] Credenciais de tool com **menor privilégio**; nenhum segredo em args/contexto.
- [ ] **Human-in-the-loop** para ação irreversível; efeitos idempotentes/reversíveis quando possível.
- [ ] **Budget** de passos/tokens/custo/tempo + timeout + detecção de laço; quota por tenant.
- [ ] Tools MCP tratadas como serviço da casa (authz, rate-limit, observabilidade); MCP de terceiro
      como fonte não confiável.
- [ ] Estado auditável; memória isolada por tenant e tratada como superfície de injection.
- [ ] Red-team de excessive agency/tool-abuse no CI (`/pentest-ai`).

> Regra de bolso: **o agente propõe a ação; o servidor autoriza e executa.** Dê o menor conjunto de
> tools, cada uma com authz própria e efeito conhecido, um budget que termina o loop, e um humano no
> caminho do irreversível — e a injeção mais criativa não tem poder para abusar.
