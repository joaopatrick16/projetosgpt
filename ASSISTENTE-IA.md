# Assistente Serimora — interpretação local por regras

Esta versão substitui a integração com API de IA. Não precisa criar conta na OpenAI, adicionar créditos, chave, SQL ou configurar variáveis no Netlify. A frase é analisada neste aparelho; não é enviada a um serviço de IA. Não há cota de 20 interpretações: o processamento local não usa API paga. Salvar na nuvem continua exigindo conexão e login, como os lançamentos manuais.

No formulário de lançamento, abra **Assistente Serimora**, escreva uma frase e clique em **Preparar lançamento**. Revise os campos editáveis e use **Confirmar e salvar na minha conta**. Cancelar ou fechar descarta o rascunho. O exemplo é identificado como demonstração e também só grava após confirmar.

Exemplos:

- `Gastei 85 reais no mercado hoje, no cartão de débito.`
- `Uber 35,50 no pix ontem`
- `Comprei geladeira por R$ 2.400,00 em 10 vezes no crédito ontem`
- `Recebi salário de 3000 no pix em 15/10/2026`

## O que reconhece

Um movimento por vez, até 1.500 caracteres; valores numéricos com reais/R$, vírgula ou ponto decimal e milhares no padrão brasileiro; datas ISO, DD/MM/AAAA, DD/MM (ano sugerido a partir do aparelho), hoje, ontem, anteontem e amanhã. Parcelas usam números, como `em 10 vezes`, `3 parcelas` ou `12x`, até 60. O valor é o TOTAL da compra, não o valor por parcela.

Pagamento: crédito, débito, dinheiro e Pix/transferência. Categoria: palavras-chave como mercado, uber, aluguel e farmácia, apenas se a categoria padrão correspondente existir no perfil. Receitas como salário são marcadas como entrada; frases sem indicação de receita recebem sugestão de saída, avisada na revisão. Categorias personalizadas precisam ser selecionadas manualmente quando não corresponderem às regras.

Sem valor, data ou pagamento reconhecido, o campo fica vazio e deve ser completado. Vários valores, datas ou pagamentos, parcelas fora do limite e referências a juros/valor por parcela exigem correção. Não entende valores por extenso, textos livres complexos, recorrência, áudio ou comprovantes. É um preenchimento por regras, não uma IA geral; confira sempre.

## Gravação e remoção

A interpretação não lê o histórico nem grava nada. A confirmação usa as regras existentes: somente a própria conta autenticada (inclusive para superadmin) ou o armazenamento local, conforme o modo. Parcelas são variáveis e não recorrentes. Rascunhos são descartados ao fechar, editar a frase ou mudar de conta.

A função de API `netlify/functions/assistant.mjs` e o SQL de cota foram retirados do repositório. Se você chegou a criar `OPENAI_API_KEY` no Netlify apenas para esta função, pode removê-la; esta versão não a utiliza. Uma eventual tabela `assistant_usage` já criada pode permanecer, sem uso pelo aplicativo.

Os testes verificam interpretação real por regras, revisão, campos obrigatórios, cancelamento, parcelas e escopo de gravação. Não há chamadas pagas à IA.
