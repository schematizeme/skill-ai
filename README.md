# schematize-ai

> **Engenharia de sistemas com IA/LLM** da casa — construir software que usa modelos de linguagem
> com o **mesmo rigor** de segurança, dados e operação do resto da stack, nunca como brinquedo à
> parte. Provider-agnóstico (Claude default, plugável), prompt & context engineering, RAG, agents &
> tool-use (MCP), **evals & guardrails**, custo/caching e observabilidade de LLM — com os pisos:
> **nenhum LLM decide autorização**, **toda saída de IA é não confiável até validada**, **prompt
> injection é ataque de 1ª linha**, **segredo nunca no prompt/cliente**, **RAG isolado por tenant**,
> **tool de envio de agente nunca dispara efeito externo fora de produção**.

Pacote de **skill normativa para [Claude Code](https://claude.com/claude-code)**.
Parte do catálogo **schematize skills**. Disciplina **agnóstica de linguagem e de provider** que
pareia com a `schematize-engineering` (a base: segurança/IAM/dados/observabilidade/DoD/archive), com
a `schematize-pentest` (o red-team de LLM — OWASP LLM Top 10) e com a `claude-api` (a referência de
fato do provider default: id de modelo, preço, caching, tool-use).

## Instalar

### Pelo app schematize (recomendado)

```bash
schematize install ai      # requer o CLI schematize instalado
```

### Última versão (a partir de um clone)

```bash
git clone https://github.com/schematizeme/skill-ai.git
cd skill-ai && ./install.sh            # instala no projeto atual
# ./install.sh /caminho/do/projeto       # ou aponte para outro projeto
```

Ou baixe o `.zip` da última release e descompacte em `.claude/skills/`:

```bash
curl -L -o skill-ai.zip \
  https://github.com/schematizeme/skill-ai/releases/latest/download/skill-ai.zip
unzip skill-ai.zip -d .claude/skills/
```

## O que tem dentro

- **SKILL.md** — o contrato: 9 pisos inegociáveis (nenhum LLM decide authz, saída não confiável até
  validada, injection de 1ª linha, segredo fora do prompt/cliente, provider-agnóstico, RAG isolado
  por tenant + cita fonte, sem eval não está pronto, observabilidade + budget desde o dia 1, tool de
  envio do agente sem efeito externo fora de prd) + mapa de references.
- **references/** — `engenharia-llm` (a base: provider plugável, prompt & context, saída validada,
  custo/caching), `rag` (ingestão→chunking→embeddings→retrieval→avaliação, isolamento por tenant),
  `agents` (loop, function-calling, MCP, authz por tool, budget, tool de envio guardada), `evals` (dataset dourado, judge
  calibrado, regressão, guardrails, teste adversarial), `seguranca-llm` (injection 1ª linha, saída
  não confiável, nada de authz por LLM, injeção→envio, OWASP LLM Top 10), `observabilidade-llm` (traço/tokens/custo,
  avaliação contínua, FinOps, fallback).
- **assets/commands/** — `/ai-help`, `/ai-load`, `/ai-rag`, `/ai-eval`, `/ai-guardrails`,
  `/ai-claude`, `/ai-cc`, `/ai-handoff`.
- **assets/CLAUDE.md** — regra sempre-on: os 9 pisos de IA, aditivos ao piso de segurança/IAM da
  engenharia.

## Regra de ouro

**O LLM propõe, o servidor determinístico dispõe.** Todo texto que entra no prompt é hostil até
prova em contrário; toda saída do modelo é não confiável até validada por schema; nenhum LLM decide
autorização (enforcement é server-side, deny-by-default). Tira-se o **poder** do modelo e põe-se o
enforcement em volta — e a injeção mais criativa deixa de importar. Sem **eval**, "melhorei o
prompt" é fé; guardrail sem **red-team** é teatro.

## Relação com as outras skills

- **schematize-engineering** — a base (segurança §13, IAM, dados/eventos, observabilidade §16,
  FinOps §33, DoD §35, archive §28).
- **schematize-pentest** — o red-team de LLM (`/pentest-ai`, OWASP LLM Top 10).
- **claude-api** — a referência de fato do provider default (id/preço/caching/tool-use/token) —
  consulte-a, não responda de memória.

## Co-autoria / patrocínio

Lucassa — https://lucassa.me

MIT.
