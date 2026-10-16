# Assistente Serimora — teste por texto

No formulário de lançamento, clique em **Assistente Serimora · lançar por texto**. A IA interpreta um único movimento; nada é gravado pelo servidor de interpretação. A ficha de revisão permite alterar descrição, valor TOTAL, data, categoria, movimento, pagamento e parcelas. Só **Confirmar e salvar na minha conta** cria os lançamentos pela sessão autenticada e pelas regras RLS já existentes. O superadmin também grava apenas em sua própria conta.

O botão **Testar exemplo sem IA** funciona sem chave, inclusive no modo local. É uma demonstração explícita da revisão, não interpretação de texto. Confirmar esse exemplo cria um lançamento real. Cancele para testar sem gravar; exclua pelo relatório caso tenha confirmado.

## Ativar a interpretação real

1. Execute `supabase/assistant.sql` no SQL Editor. Cria uma reserva atômica de uso: até 20 solicitações por usuário por dia UTC. Tentativas que chegam à reserva contam mesmo se o provedor falhar. Usuários não têm acesso direto à tabela.
2. No Netlify > Project configuration > Environment variables, adicione `OPENAI_API_KEY`, privada, com escopo **Functions**, contexto **Production**. Obtenha-a no projeto da API OpenAI; uma assinatura ChatGPT não substitui crédito da API. Nunca coloque a chave no código do navegador, no GitHub ou no chat.
3. Opcional: `OPENAI_MODEL` (padrão `gpt-4.1-mini`) e `SUPABASE_URL` (padrão: URL pública já usada pelo app). O servidor usa a chave publicável do projeto para validar a sessão e aplicar a cota; não precisa da service_role.
4. Configure orçamento/limites de uso no projeto do provedor, acompanhe os custos e republique no Netlify para aplicar as variáveis. O limite individual do app não substitui o orçamento global do provedor.
5. Entre com uma conta e tente: “Gastei 85 reais no mercado hoje, no cartão de débito”. Confira a revisão, cancele primeiro e depois confirme um teste. Sem configuração, o app mostra a pendência; não finge uma interpretação.

## Limites desta versão

Somente texto, um movimento por vez, até 1.500 caracteres. Não tem áudio, leitura de comprovantes, recorrência, leitura de histórico ou autonomia para excluir/alterar lançamentos. Não guarda conversa. A OpenAI recebe a frase, data local informada pelo aparelho e nomes das categorias, sem nome do usuário, e-mail ou histórico financeiro. A requisição usa `store:false`; isso não substitui os termos e a política de retenção do provedor. O app avisa para não incluir senhas ou números de cartões.

Campos ausentes ficam vazios para preenchimento humano. A categoria pode ser sugerida; a IA pode errar e os dados precisam ser revisados. Datas relativas usam a data do aparelho. O valor é o total da compra, dividido em centavos entre até 60 parcelas. As parcelas são variáveis e não recorrentes. Rascunhos são descartados ao fechar, editar a frase ou mudar de conta; não são backups.

A rotina de backup já preparada não ativa a IA. A interpretação real depende da configuração acima; os testes automatizados usam respostas simuladas e não geram cobranças reais.
