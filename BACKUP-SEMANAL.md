# Backup semanal de todos os usuários

A rotina `weekly-backup` é executada pelo Netlify toda segunda-feira às 09h de Brasília (12h UTC), mesmo com o app fechado. Só funciona após configurar o bucket e as credenciais abaixo e publicar em produção. A agenda sozinha não significa que o backup está ativo.

## Ativação

1. Execute `supabase/weekly-backup.sql` no SQL Editor do projeto Supabase. O bucket `weekly-backups` é privado; não crie políticas públicas para ele.
2. No Netlify > Project configuration > Environment variables, configure para **Functions**, em **Production**:
   - `SUPABASE_URL`: URL do projeto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave administrativa `service_role` do projeto, somente no servidor.
   - `RESEND_API_KEY`: chave do Resend com permissão para enviar e-mails.
   - `MAIL_FROM`: remetente autorizado pelo Resend, por exemplo `Serimora <avisos@seu-dominio.com>`.
3. Republique o projeto para aplicar as variáveis às funções. Confirme em Functions que `weekly-backup` tem execução agendada.
4. Use **Run now** na função para validar: confira o JSON privado em Storage > weekly-backups > weekly e o aviso em **joaopatrick1608@gmail.com**. Um status 200 significa que o arquivo foi salvo e o provedor aceitou o e-mail; confira também a entrega na caixa de entrada/spam.

Nunca coloque as chaves privadas no GitHub, no código do navegador ou no chat. O SMTP configurado para login do Supabase não configura automaticamente o Resend desta rotina. Se usar remetente de teste do Resend, o destinatário precisa ser permitido pela conta do provedor.

## Conteúdo e recuperação

Cada arquivo contém todas as linhas de `profiles`, `transactions`, `categories` e `app_settings`, com IDs e relacionamentos. Inclui todos os meses, não apenas a semana. Não inclui senhas, sessões, contas de autenticação, fotos, arquivos do Storage ou dados que existam somente no navegador. É uma cópia dos dados do aplicativo, não um backup completo do projeto Supabase. As tabelas são lidas em sequência, portanto registros alterados durante a execução podem ter momentos diferentes.

O arquivo fica em `weekly-backups/weekly/AAAA-MM-DD.json`, sem acesso público. Nenhum dado financeiro é anexado ao aviso. Uma repetição no mesmo dia reutiliza o arquivo salvo; o envio usa uma chave de idempotência do Resend (janela do provedor), evitando duplicação em tentativas próximas. Se o envio falhar após a gravação, o backup permanece salvo e a função retorna erro; execute novamente para tentar o aviso. Falhas anteriores à gravação não enviam aviso de sucesso. Consulte os logs do Netlify para erros; não há alerta independente de falhas.

Os arquivos são conservados até exclusão manual e consomem a cota de Storage. Há limite de 20 MB por snapshot; para volumes maiores, configure backup de banco dedicado. O bucket está no mesmo projeto; mantenha também uma cópia externa ou use os backups gerenciados do Supabase para proteção contra perda do projeto.

Para recuperar, baixe o JSON e restaure com um administrador no banco, em ambiente de teste primeiro, respeitando as referências a `auth.users`. Este formato **não** é o backup individual que o botão Importar do app aceita. Não importe diretamente pela interface. Mantenha uma cópia dos dados atuais antes de restaurar.
