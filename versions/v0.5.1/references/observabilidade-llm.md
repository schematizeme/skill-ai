# Observabilidade de LLM + FinOps — traço, tokens, custo, avaliação contínua, degradação

> LLM sem observabilidade é **conta surpresa + regressão invisível**: você não sabe quanto gastou,
> por que ficou lento, nem que a qualidade caiu até o cliente reclamar. A observabilidade de IA é a
> observabilidade da casa (LGTM+, `schematize-engineering` §16) com **três eixos a mais**: **tokens/
> custo** por chamada, **qualidade** medida em produção, e **degradação/fallback** quando o provider
> falha. FinOps (§33) deixa de ser opcional: token é custo variável direto.

## 1. Traço por chamada de LLM (o span de primeira classe)

Toda chamada ao modelo é um **span** OpenTelemetry, correlacionado por `trace_id` ao request que a
originou (é um span como o de um banco). Atributos mínimos por chamada:

- **Identidade da chamada:** `provider`, `model` (id exato), `feature`/rota, `tenant_id`.
- **Tokens:** `input_tokens`, `output_tokens`, e **`cache_read`/`cache_write`** — e o que torna
  esses dois acionáveis, que é a **assimetria de preço**: escrever no cache custa **mais** que um
  token normal; ler dele custa uma **fração**. Ou seja, `cache_write` alto com `cache_read` baixo
  não é "cache aquecendo" — é **prejuízo**: você está pagando o prêmio da escrita e não colhendo a
  leitura, tipicamente porque o prefixo muda a cada chamada (um timestamp, o nome do usuário ou uma
  lista reordenada **no começo** do prompt invalida tudo o que vem depois). Por isso registre a
  **razão `cache_read / (input_tokens + cache_read)`** — a taxa de acerto — junto do **custo
  calculado com os três preços separados**, senão o painel mostra "o cache está sendo usado" numa
  conta que subiu. Alerta útil: taxa de acerto **caindo** entre releases; quase sempre é alguém que
  moveu conteúdo variável para cima no prompt.
- **Custo:** custo calculado da chamada (preço por token via a tabela do provider — `claude-api`).
- **Latência:** total e **TTFT** (time-to-first-token) quando streaming; separe latência do provider
  da sua.
- **Resultado:** sucesso/erro, `finish_reason` (parou por `max_tokens`? por tool?), nº de tool-calls,
  rota servida (modelo primário vs fallback).
- **Correlação com eval:** id do caso/veredito quando a chamada passou por guardrail/validação (§3).

> **Nunca logue o prompt/resposta crus com PII/segredo** (§16.1 da engenharia aplicado ao LLM). Logue
> campos, hashes, contagens e amostras **mascaradas**; prompt cru só em ambiente controlado, com
> retenção curta e sanitizado. Achou segredo real no traço → sinalize **rotação**.

## 2. Métricas RED + de IA (o que o dashboard mostra)

Sobre o **RED** da casa (Rate, Errors, Duration por endpoint), acrescente por feature/modelo/tenant:

- **Tokens/min e custo/min** (e por tenant) — a série que pega gasto fugindo.
- **Custo por request** e **por tarefa de agente** (o loop custa por passo — `agents.md` §6).
- **Cache hit rate** — cache caindo = custo/latência subindo silenciosamente.
- **Latência p50/p95/p99** e **TTFT**; taxa de **timeout**/rate-limit do provider.
- **Taxa de falha de validação de saída** (§ guardrail) — subiu? o modelo/prompt regrediu.
- **Taxa de fallback/degradação** — com que frequência o primário falhou e o plano B serviu.
- **Qualidade em produção** (§3) — a métrica que separa "barato" de "quebrado".

Dashboards e alertas **versionados como código**, entregues com o serviço (§16, §35). Separe o
dashboard técnico do de negócio (custo por feature é meio-caminho entre os dois).

## 3. Avaliação contínua (a eval não para no CI)

A suíte de eval (`evals.md`) é o gate **antes** do deploy; produção exige medir o que a suíte não
prevê:

- **Amostragem em produção:** uma fração das respostas reais passa por LLM-as-judge calibrado/
  revisão humana, com a métrica no dashboard. Qualidade é série temporal, não foto do CI.
- **Sinais implícitos:** retry do usuário, thumbs-down, abandono, correção manual — proxies baratos
  de qualidade ruim, instrumentados desde o dia 1.
- **Detecção de drift:** distribuição de inputs/outputs muda (novo tipo de pergunta, provider mudou o
  modelo por baixo) → a régua acusa antes do incidente. Todo caso ruim de produção **vira caso novo
  na suíte** (`evals.md` §2).
- **Guardrail é métrica:** quantas saídas foram bloqueadas por schema/PII/safety, por injection
  detectada — sobe/desce conta uma história (ataque? regressão?).

## 4. Budget de custo & FinOps (token é custo variável — piso 8 da SKILL)

- **Budget por feature e por tenant**, com alerta de threshold (`schematize-engineering` §33).
  Estourou → alerta + degradação (§5), nunca "descobre na fatura".
- **Alavancas de custo, em ordem:** (1) **prompt caching** e cache de resultado; (2) **roteamento por
  dificuldade** (modelo menor para o fácil); (3) **contexto mínimo** (não encher a janela — top-k
  enxuto, histórico sumarizado); (4) **batch** para offline; (5) `max_tokens` teto. Detalhe em
  `engenharia-llm.md` §6.
- **Custo por tenant rastreado** (billing/abuso): um tenant não drena o budget de todos; quota por
  tenant (também anti-DoS de custo, `seguranca-llm.md` §6).
- **Custo por request em alto volume** é KPI — otimização de prompt tem ROI medível.

## 5. Degradação, fallback e resiliência (o provider VAI falhar)

Provider de LLM tem rate-limit, incidente e latência de cauda. Resiliência é piso:

- **Fallback na porta `LLMProvider`** (`engenharia-llm.md` §2): primário fora/rate-limited → modelo/
  provider secundário, ou o **caminho determinístico**, com o traço registrando a rota.
- **Timeout + retry com backoff** e **circuit breaker** por provider; o burst do provider não derruba
  o seu serviço.
- **Degradação graciosa:** budget estourou / provider caído → resposta reduzida, cacheada, ou "tente
  em instantes" — nunca erro cru nem loop travado. A feature de IA que cai **não** derruba o produto
  em volta.
- **Idempotência** em chamadas que disparam efeito (via tool) para o retry não duplicar (`agents.md`).

## 6. Healthcheck & operação

- A feature de IA participa dos endpoints da casa (`/health`, `/ready`, `/metrics` — §17): `ready`
  considera a saúde do provider/índice; `metrics` expõe os contadores de §2.
- **Runbook**: o que fazer quando custo dispara, quando o provider está fora, quando a qualidade cai
  (rollback de prompt/modelo — ambos versionados). Alerta aciona o runbook, não o susto.
- **Rollback de prompt/modelo é deploy:** prompt e escolha de modelo são versionados e revertíveis
  como código (`engenharia-llm.md` §3).

## 7. Definition of Done de observabilidade de LLM

- [ ] **Span por chamada** com model/provider/tenant, tokens in/out, cache read/write, custo,
      latência/TTFT, `finish_reason`, rota servida — correlacionado por `trace_id`.
- [ ] **Sem prompt/resposta cru com PII/segredo** no log; mascaramento; retenção curta; rotação se
      achar segredo.
- [ ] **Dashboards + alertas versionados**: tokens/custo por feature/tenant, cache hit, latência,
      falha de validação, taxa de fallback, qualidade.
- [ ] **Avaliação contínua** em produção (amostra + sinais implícitos + drift); caso ruim → suíte.
- [ ] **Budget de custo** por feature/tenant com alerta; alavancas de custo aplicadas; quota por tenant.
- [ ] **Fallback/degradação** na porta do provider (timeout/backoff/circuit-breaker); a IA que cai
      não derruba o produto.
- [ ] **Runbook** de custo/indisponibilidade/qualidade; prompt e modelo versionados e revertíveis.

> Regra de bolso: **se você não vê os tokens, o custo, a latência e a qualidade por chamada, você não
> está operando um sistema de IA — está torcendo.** Traço primeiro, budget com alerta, fallback pronto
> — e a fatura e a regressão param de ser surpresa.
