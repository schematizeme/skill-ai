---
description: schematize-ai — cria ou mescla o CLAUDE.md sempre-on de engenharia de IA na raiz do repo (não sobrescreve blocos de outras skills)
---

Instale/atualize a regra **sempre-on** de engenharia de sistemas com IA/LLM na raiz do repositório.

1. Pegue `assets/CLAUDE.md` da skill `schematize-ai` (projeto ou `~/.claude/skills/...`).
2. Se **não existe** `CLAUDE.md` na raiz: crie com esse conteúdo.
3. Se **já existe** (de outra skill — engineering/go/rust/web/pentest/...): **mescle** — adicione
   a seção de Engenharia de IA/LLM **sem sobrescrever** os blocos das outras skills. Em repo
   multi-skill, cada CLAUDE convive; o piso da IA é aditivo (e casa com o piso de segurança/IAM da
   engenharia).
4. Se houver customização local, salve `./CLAUDE.md.bak` e reaplique por cima.
5. Confirme a versão aplicada e destaque os **pisos**: nenhum LLM decide autorização; toda saída de
   IA é não confiável até validada; prompt injection é ataque de 1ª linha; segredo nunca no prompt/
   cliente; RAG isolado por tenant; sem eval não está pronto.
