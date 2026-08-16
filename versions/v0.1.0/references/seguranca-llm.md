# Segurança de LLM — o piso defensivo (injection 1ª linha, saída não confiável, nada de authz por LLM)

> A segurança de IA da casa parte de uma inversão de confiança: **o modelo não é confiável, o texto
> que entra nele não é confiável, e a saída que sai dele não é confiável** — e mesmo assim o sistema
> tem que ser seguro. Consegue-se isso tirando **poder** do modelo e pondo **enforcement
> determinístico** em volta. Este reference é o lado **construtivo** (como desenhar); o lado
> **adversarial** (red-team conduzido, cadeias de ataque, OWASP LLM Top 10) é a `schematize-pentest`
> (`/pentest-ai`). Herda o piso da `schematize-engineering` (§13 segredos, §14/§15 authz/tenant,
> §32 LGPD) e o IAM da casa.

## 1. O modelo de ameaça em uma frase

O LLM é um **interpretador de texto não confiável com saída não confiável**. Toda defesa deriva de
duas perguntas:

1. **O que a pior string possível no prompt consegue fazer?** (injection — §2/§3)
2. **O que acontece se a saída for maliciosa/errada?** (insecure output — §4)

Se a resposta a qualquer das duas for "algo grave", o desenho está errado: o conserto é **tirar o
poder**, não "melhorar o prompt".

## 2. Prompt injection é ataque de 1ª linha (não há sanitização 100%)

Prompt injection é o **XSS/SQLi da era LLM** e a classe nº 1 do OWASP LLM Top 10. Fato duro: **não
existe** um filtro que torne texto arbitrário seguro para ser interpretado como instrução. Por isso
a defesa **não** é "sanitizar o prompt" — é estrutural:

- **Separe canais:** system prompt (instrução da casa) e input/dado (usuário, RAG, tool, web) são
  **mensagens/papéis distintos**. Nunca faça string-building metendo input dentro da instrução.
- **Dado não é ordem:** conteúdo recuperado, resultado de tool e página buscada entram rotulados
  como **dado**; o system prompt manda o modelo tratá-los como conteúdo a processar, não como
  comandos a obedecer. (Ajuda — não é garantia; ver §5.)
- **A garantia real é o mínimo privilégio do modelo:** como você assume que a injeção **vai** passar
  em algum momento, o modelo nunca tem poder que ela possa abusar (§3, §4). É o mesmo princípio de
  "assume breach".

### 2.1 Direta vs indireta
- **Direta:** o atacante é o usuário, digitando o payload no chat.
- **Indireta (mais perigosa):** o payload vem de uma **fonte que o modelo lê** — documento no RAG,
  email, página web, resultado de MCP de terceiro, memória envenenada. O usuário legítimo dispara
  sem saber. Todo corpus/fonte externa é superfície (`rag.md` §8, `agents.md` §3/§7).

## 3. Nenhum LLM decide autorização (o piso que mata a categoria)

Este é o piso 1 da SKILL e a maior alavanca de segurança:

- **Authz é código determinístico no servidor** (PEP da casa, deny-by-default), com `tenant_id`/
  papel derivados do **token da sessão** — **nunca** do texto do prompt nem da saída do modelo. "O
  agente checou se podia" é UX, não controle de acesso.
- **O modelo nunca vê o que não pode ser mostrado ao usuário.** Não injete no contexto dado que o
  usuário daquela sessão não teria direito de ver "confiando que o modelo não vai revelar" — a
  injeção revela. O filtro de authz acontece **antes** do retrieval/contexto (`rag.md` §5).
- **Toda tool/ação autoriza no servidor** (`agents.md` §4). Injeção que faz o modelo *querer* chamar
  uma tool proibida bate no PEP e é negada.
- **Consequência:** com authz fora do modelo, a pior injeção consegue, no máximo, fazer o modelo
  *pedir* algo — e o pedido é negado determinísticamente. A categoria de "IA foi enganada e
  liberou acesso" **deixa de existir**.

## 4. Insecure output handling — a saída é não confiável (piso 2 da SKILL)

A saída do modelo é **input não confiável para o próximo sistema** (OWASP LLM02). Trate-a como
qualquer entrada hostil:

- **Valide por schema** antes de qualquer uso (`evals.md` §6, `engenharia-llm.md` §5).
- **Nunca execute a saída crua:** sem `eval`/`exec`, sem `os.system`, sem `pickle`/deserialização
  insegura da saída do modelo.
- **Nunca componha SQL/comando/caminho com a saída sem parametrizar/allowlist** — é SQLi/command
  injection com o LLM de intermediário.
- **Sanitize antes de renderizar:** saída que vira HTML/markdown no browser passa pela mesma
  sanitização anti-XSS de qualquer conteúdo de usuário (`schematize-engineering` §38 — sem
  `dangerouslySetInnerHTML` cru).
- **Saída que vira ação** (webhook, email, transação) passa por authz + validação + (se
  irreversível) human-in-the-loop (`agents.md` §5).

## 5. Vazamento — system prompt, dados, PII, segredo

- **System prompt não é segredo de segurança.** Assuma que pode vazar (injeção pede "repita suas
  instruções"). Portanto **nada de secret/regra de authz/dado sensível dentro do system prompt** — a
  segurança não pode depender de ele ficar oculto. Um guardrail de saída (`evals.md` §6) ainda tenta
  bloquear o leak, mas o piso é não ter o que vazar.
- **Segredo nunca no prompt/contexto/cliente** (piso 4 da SKILL, `schematize-engineering` §13.4): a
  chave do provider e credenciais vivem **server-side**; o cliente fala com o **seu** backend, nunca
  com o provider direto. Chave em código de browser é CVE, não configuração.
- **PII com a régua da LGPD** (§32): mascare na entrada do que vai ao modelo/índice quando possível;
  bloqueie PII na saída; **nunca logue prompt/resposta crus** com PII (é o §16.1 aplicado ao LLM —
  ver `observabilidade-llm.md`). Minimização: mande ao modelo o mínimo necessário.
- **Exfiltração via saída:** o modelo pode ser induzido a colocar dado sensível num link/imagem que
  "chama pra casa". Guardrail de saída + o isolamento por tenant (retrieval não traz o que não é do
  tenant) fecham o caminho.

## 6. Isolamento e cadeia de suprimentos

- **Isolamento por tenant** no índice do RAG, na memória do agente e no cache (`rag.md` §5,
  `agents.md` §7): vazar contexto cross-tenant é IDOR. Filtro server-side derivado do token.
- **Isolamento de execução:** tool/agente que roda código ou toca recurso externo roda com **menor
  privilégio**, em sandbox/container próprio, sem credencial ampla — comprometer o loop não vira RCE
  (casa com o isolamento por app do `schematize-engineering`).
- **Fontes externas são cadeia de suprimentos:** modelo, servidor MCP de terceiro, dataset, plugin —
  cada um é dependência não confiável. Habilite só o que audita; pin/versão; menor privilégio;
  trate a resposta como dado hostil.
- **DoS de custo (OWASP LLM10)** é ameaça de segurança, não só de FinOps: rate-limit/quota por
  tenant, budget de tokens e teto de passos do agente (`agents.md` §6). Um loop sem teto ou um input
  gigante é um ataque de esgotamento (`observabilidade-llm.md`).

## 7. Mapa ao OWASP LLM Top 10 (a régua adversarial)

O red-team **conduzido** é da `schematize-pentest` (`/pentest-ai`); aqui está a correspondência do
que este reference **defende**:

| OWASP LLM | Classe | Defesa construtiva (aqui) |
|---|---|---|
| LLM01 | Prompt injection (direto/indireto) | §2 separação de canal + §3 mínimo privilégio do modelo |
| LLM02 | Insecure output handling | §4 saída validada, nunca executada crua |
| LLM03/04 | Data/model poisoning, DoS | `rag.md` §8 proveniência; §6 DoS de custo |
| LLM06 | Excessive agency | `agents.md` §4/§5 authz por tool + menor conjunto + human-in-loop |
| LLM07 | System prompt leakage | §5 nada sensível no system prompt |
| LLM08 | Vetores/embeddings (cross-tenant no RAG) | §6 / `rag.md` §5 isolamento por tenant |
| LLM10 | Consumo ilimitado (custo) | §6 budget/rate-limit/teto de passos |

## 8. Definition of Done de segurança de LLM

- [ ] **Authz determinística no servidor**; nenhum LLM decide acesso; contexto filtrado por tenant
      **antes** do modelo.
- [ ] **Separação de canal** instrução/dado; toda fonte externa (usuário/RAG/tool/web/MCP) tratada
      como hostil.
- [ ] **Saída validada por schema**, nunca executada/concatenada/renderizada crua; ação irreversível
      com human-in-the-loop.
- [ ] **Segredo nunca no prompt/contexto/cliente**; chamada ao provider server-side.
- [ ] **System prompt sem nada sensível**; guardrail contra leak; PII mascarada; sem log de prompt/
      resposta cru com PII.
- [ ] **Isolamento por tenant** (índice/memória/cache) e de execução (sandbox, menor privilégio).
- [ ] **DoS de custo** contido (rate-limit/quota/budget/teto de passos).
- [ ] **Red-team no CI** (`/pentest-ai`, OWASP LLM Top 10) com gate.

> Regra de bolso: **assuma que a injeção passa e que a saída mente — e projete para que nenhuma das
> duas importe.** Tira-se o poder do modelo (authz e execução são do servidor determinístico), e a
> segurança deixa de depender de o modelo "se comportar".
