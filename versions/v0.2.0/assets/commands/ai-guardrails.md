---
description: schematize-ai — audita/scaffolda os guardrails (validação de saída por schema, deny-by-default, red-team de prompt injection/jailbreak, PII/safety, insecure-output) com teste adversarial no CI
argument-hint: "[feature de IA a proteger]"
---

Audite ou scaffolde os **guardrails** (`references/evals.md` §6-7 + `references/seguranca-llm.md`).
Guardrail é código **determinístico** em volta do modelo, na entrada e na saída. Pisos 2/3 da skill:
**toda saída de IA é não confiável até validada**; **prompt injection é ataque de 1ª linha**. O
lado adversarial conduzido é `/pentest-ai` (OWASP LLM Top 10).

## 1. Guardrails de ENTRADA (antes do modelo)
- **Separação de canais:** input do usuário e dado recuperado entram como **dado**, nunca como
  instrução (defesa estrutural contra injection — `seguranca-llm.md` §2).
- **Filtros de política:** PII/conteúdo proibido na entrada tratado (recusa/mascaramento) antes de
  gastar token e antes de vazar.
- **Rate-limit/quota por tenant** (anti-abuso e **DoS de custo**, OWASP LLM10).

## 2. Guardrails de SAÍDA (antes de usar) — deny-by-default
- **Validação de schema é obrigatória** (JSON Schema/tipo): fora do schema → rejeita/re-tenta/
  fallback, **nunca "usa assim"**. É o guardrail que não pode faltar.
- **Allowlist de ação/valor** (enum, range, id que existe e o tenant pode ver).
- **Filtros de segurança na saída:** PII vazada, conteúdo inseguro, **segredo** repetido, **leak de
  system prompt** → bloqueia.
- **Insecure output handling (§ `seguranca-llm.md` §4):** saída **nunca** vira `eval`/exec, SQL,
  comando de shell ou HTML sem sanitização. Ação irreversível → authz + human-in-the-loop
  (`agents.md`).
- **Deny-by-default:** o que não sabe classificar, **nega**. Falha fechada.

## 3. Enforcement é do servidor (o piso que sustenta tudo)
Guardrail **não** é o modelo se policiando: **nenhum LLM decide authz** — o PEP determinístico no
servidor autoriza com `tenant_id`/papel do **token** (`seguranca-llm.md` §3). Assuma que a injeção
passa e projete para que **não importe** (tira-se o poder do modelo).

## 4. Teste adversarial no CI (guardrail sem red-team é teatro — §7)
Casos hostis na suíte de eval (`/ai-eval`), gate trava se algum **passar**:
- prompt injection **direto e indireto** (via input e via doc do RAG) → bloqueado;
- **jailbreak** (role-play, ofuscação, base64, outro idioma) → política resiste;
- **PII/safety** entrada e saída → detectado/tratado;
- **saída malformada/hostil** (JSON quebrado, campo extra/mass-assignment, valor fora do range,
  XSS/SQL na string) → validação rejeita;
- **fixtures multi-tenant** → saída/retrieval não cruza tenant.

## Gate
Entrada (separação de canal + política + rate-limit) · saída (**schema obrigatório** + allowlist +
PII/safety + insecure-output) · **deny-by-default** · **authz server-side** (nenhum LLM decide
acesso) · **teste adversarial no CI com gate**. Encadeie: `/ai-eval` roda a suíte; `/pentest-ai` faz
o red-team conduzido; a base (IAM/segurança) é a `schematize-engineering`.
