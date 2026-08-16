# Evals & guardrails — a prova de qualidade e a defesa de saída (sem isto, não está pronto)

> Duas disciplinas irmãs. **Eval** responde "isto está bom o suficiente?" com **dado**, não anedota
> (dataset dourado, métrica, regressão). **Guardrail** é a defesa determinística em volta do modelo:
> valida a saída, bloqueia o que não pode passar, deny-by-default. O piso 7 da SKILL é curto: **sem
> eval, não está pronto**; guardrail sem **teste adversarial** é teatro. O lado ofensivo (red-team
> conduzido) mora na `schematize-pentest` (`/pentest-ai`, OWASP LLM Top 10) — aqui é o lado
> construtivo, e o mesmo oráculo: **suspeita ≠ achado**.

## 1. Por que eval (o "melhorei o prompt" é fé)

LLM é não-determinístico; "testei uns prompts na mão e ficou melhor" não é evidência — é viés de
confirmação. Sem uma suíte, toda mudança de prompt/modelo/RAG é um chute e toda regressão é
invisível. Eval é o **red-first** da engenharia de IA: a métrica existe **antes** de você declarar
que algo funciona.

## 2. Dataset dourado (a régua)

- **Casos representativos com resposta/rótulo esperado:** o caminho feliz, os casos de borda, os
  casos difíceis, e os **adversariais** (§6). Cobre o que o produto realmente recebe.
- **Versionado no repo**, com dono; cresce quando um bug de produção vira um caso novo (todo
  incidente adiciona um caso — a suíte aprende).
- **Sem PII/segredo real.** Dado de cliente vira sintético/anonimizado antes de entrar na suíte
  (LGPD, `schematize-engineering` §32).
- **Fatie por dimensão** (tipo de tarefa, idioma, tenant-shape) para achar regressão localizada que
  a média esconde.

## 3. Métricas — escolha a que casa com a tarefa

- **Tarefa objetiva** (extração, classificação, roteamento): exact-match, F1, precisão/recall
  contra o rótulo — **determinístico**, sem LLM-judge.
- **RAG:** recall@k/precision@k (retrieval) + faithfulness/answer-relevance/citação (geração) —
  detalhe em `rag.md` §7.
- **Geração aberta** (resumo, resposta, reescrita): rubrica explícita (correção, completude,
  fidelidade à fonte, tom, ausência de PII/inseguro) julgada por **LLM-as-judge calibrado** (§4) ou
  humano em amostra.
- **Operacionais sempre:** custo/tokens por caso, latência p95, taxa de falha de validação de saída
  (§7) — qualidade que ignora custo/latência é meia-verdade (`observabilidade-llm.md`).

## 4. LLM-as-judge — calibrado, não confiado cego

Usar um LLM para avaliar saída de LLM é poderoso e traiçoeiro:

- **Rubrica explícita e binária/escalar por critério** — "está bom?" não é avaliável; "cita fonte
  que sustenta a afirmação? (sim/não)" é.
- **Calibre contra rótulo humano.** Meça a concordância juiz-vs-humano numa amostra; juiz que não
  concorda com humano não é métrica, é ruído. Recalibre quando trocar o modelo-juiz.
- **Cuidado com o viés do juiz** (posição, verbosidade, auto-preferência do mesmo modelo). Use juiz
  diferente do gerador quando possível; randomize ordem em comparações.
- **O juiz também é atacável** (injection na saída avaliada). Trate a saída avaliada como dado
  (`seguranca-llm.md`); o juiz não executa nada.

## 5. Regressão e gate no CI (trava a piora)

- **Toda mudança** (prompt, modelo, temperatura, chunking, k, tool) roda a suíte **antes** do merge.
- **Baseline versionado:** compara com o último verde; **trava** se a métrica-chave cair além do
  limiar (piso 7). Melhorou uma dimensão e piorou outra → decisão explícita, não silenciosa.
- **Saída machine-readable** (JSON) com métricas por fatia — o CI/painel lê o veredito sem parsear
  prosa (mesma disciplina de gate da `schematize-audit`).
- **Não-determinismo:** rode N amostras e reporte média/variância; um caso que passa 1 em 3 vezes
  **não** passou. Fixe `temperature`/seed onde a tarefa admite para reduzir variância.

## 6. Guardrails — a defesa determinística (deny-by-default)

Guardrail é código determinístico **em volta** do modelo, na entrada e na saída. Toda saída de IA é
não confiável até passar por ele (piso 2 da SKILL).

**Na entrada (antes do modelo):**
- **Separação de canais:** input do usuário e dado recuperado entram como **dado**, nunca como
  instrução (a defesa estrutural contra injection, `seguranca-llm.md`).
- **Filtros de política:** PII/conteúdo proibido detectado na entrada é tratado conforme a política
  (recusa, mascaramento) — antes de gastar token e antes de vazar.
- **Rate-limit/quota** por tenant (anti-abuso e anti-DoS de custo).

**Na saída (antes de usar):**
- **Validação de schema é obrigatória** (JSON Schema/tipo): fora do schema → rejeita/re-tenta/
  fallback, nunca "usa assim". Este é o guardrail que não pode faltar.
- **Allowlist de ação/valor:** enum, range, referência a id que existe e que o tenant pode ver —
  determinístico.
- **Filtros de segurança na saída:** PII vazada, conteúdo inseguro, segredo (o modelo repetiu uma
  chave?), leak de system prompt → bloqueia.
- **Insecure output handling:** a saída **nunca** vira `eval`/exec, SQL, comando de shell ou HTML
  sem sanitização (OWASP LLM02, `seguranca-llm.md`).
- **Deny-by-default:** o guardrail que não sabe classificar **nega**. Falha fechada, não aberta.

## 7. Teste adversarial dos guardrails (guardrail sem red-team é teatro)

O guardrail entra na suíte de eval com casos **hostis**, e o gate trava se algum passar:

- **Prompt injection direto e indireto** (via input e via documento do RAG): tenta fazer o modelo
  ignorar a política / vazar system prompt / chamar tool proibida. Espera-se: bloqueado.
- **Jailbreak** (role-play, ofuscação, "modo desenvolvedor", payload em outro idioma/base64): a
  política resiste.
- **PII/safety:** entrada e saída com PII/conteúdo proibido → detectado e tratado.
- **Saída malformada/hostil:** JSON quebrado, campo extra (mass-assignment), valor fora do range,
  payload de XSS/SQL na string → a validação (§6) rejeita.
- **Fixtures multi-tenant:** a saída/retrieval não cruza tenant (casa com `rag.md` §5, `/pentest-ai`).

> O red-team **conduzido** (cadeias de ataque, escalonamento) é da `schematize-pentest`. Aqui é a
> **suíte automatizada** que roda no CI: o mesmo oráculo — um guardrail só "segura" quando um teste
> adversarial **prova** que segura; passar por não ter sido atacado é suspeita, não achado.

## 8. Definition of Done de eval & guardrails

- [ ] **Dataset dourado** versionado (feliz + borda + adversarial), sem PII real, fatiado.
- [ ] **Métrica** casada com a tarefa (determinística onde dá; LLM-judge **calibrado** onde não dá).
- [ ] **Regressão no CI** com baseline e gate que **trava a piora**; saída machine-readable.
- [ ] **Validação de saída por schema** obrigatória (deny-by-default); saída nunca vira ação/exec cru.
- [ ] Guardrails de entrada (separação de canal, política, rate-limit) e de saída (schema, allowlist,
      PII/safety, insecure-output).
- [ ] **Teste adversarial** (injection/jailbreak/PII/malformado/multi-tenant) no CI, com gate.
- [ ] Custo/latência medidos junto da qualidade; incidente de produção vira caso novo na suíte.

> Regra de bolso: **eval é o red-first; guardrail é o deny-by-default.** Você não "melhorou o prompt"
> até a suíte provar; a saída não é confiável até o schema validar; e o guardrail não segura até um
> teste adversarial tentar e falhar em passar.
