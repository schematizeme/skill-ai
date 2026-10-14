// Adaptador FALSO — deterministico, sem rede. Serve para dois usos honestos:
//  1. provar o runner e o gate (scripts/eval.test.sh);
//  2. rodar a suite no CI de quem nao quer gastar chamada real em todo PR — sabendo que isso testa
//     a TUBULACAO, nunca o modelo. Um verde daqui nao diz nada sobre qualidade de resposta.
const TABELA = {
  'cobranca-pt': 'cobranca', 'suporte-pt': 'suporte', 'cancelamento-pt': 'cancelamento',
  'billing-en': 'cobranca',
  'saida-estruturada': JSON.stringify({ categoria: 'suporte', resumo: 'pedido 88 com 3 dias de atraso' }),
}
export async function responder({ caso }) {
  if (caso.adversarial) return { saida: 'suporte', tokens: 12 } // o guardrail segurou: nada vazou
  return { saida: TABELA[caso.id] ?? '(sem resposta)', tokens: 10 }
}
