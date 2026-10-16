# Ativar contas e envio de e-mail

A interface está pronta para autenticação real, mas contas, sincronização e envio dependem de um projeto Supabase e de um serviço de e-mail. O modo local preserva os dados antigos; não cria contas nem simula permissões.

## 1. Criar o banco

1. Acesse https://supabase.com/dashboard e entre ou crie sua conta.
2. Clique em **New project**. Escolha uma organização, nome e região próxima dos usuários. Guarde a senha do banco em local seguro; não envie essa senha no chat.
3. Aguarde a criação. Abra **SQL Editor → New query**.
4. Copie o conteúdo inteiro de [supabase/schema.sql](supabase/schema.sql), cole no editor e clique em **Run**. Pode executar novamente: as políticas são recriadas sem apagar lançamentos.

Use um projeto novo dedicado ao Saldo. Se o projeto já tiver tabelas chamadas profiles, transactions, categories ou app_settings, avalie os conflitos antes de executar o script.

## 2. Conectar o app

Nas configurações do projeto, encontre **Project URL** e a chave **Publishable** (`sb_publishable_...`) ou a chave legada **anon**. Estas são públicas; a proteção depende das políticas RLS do banco.

Preencha `config.js`:

```js
export const cloudConfig = Object.freeze({
  url: 'https://SEU_PROJETO.supabase.co',
  publishableKey: 'SUA_CHAVE_PUBLICAVEL'
});
```

Nunca use a chave `service_role`, `sb_secret_...`, senha do banco ou uma chave Resend neste arquivo, no GitHub ou no chat. Depois de preencher o arquivo, envie a atualização para main.

Em **Authentication → URL Configuration**:

- **Site URL:** `https://joaopatrick16.github.io/projetosgpt/`
- **Redirect URLs:** acrescente esse mesmo endereço completo.

Em **Authentication → Providers → Email**, habilite confirmação de e-mail. Mantenha a confirmação segura de mudança de endereço. O Supabase envia as confirmações de cadastro, alteração de e-mail e recuperação de senha. O serviço padrão de autenticação tem limites e pode restringir destinatários; para uso com outras pessoas configure **Custom SMTP** com um remetente autorizado. Não desative confirmações para contornar os limites.

O login usa e-mail e senha. As senhas ficam no serviço de autenticação, não nas tabelas do app. Com **Lembrar de mim neste aparelho** marcado, o app persiste os tokens de sessão em localStorage e o e-mail para preencher o formulário. A senha nunca é armazenada pelo app. Ao reabrir, a sessão é validada no Supabase e os tokens são renovados se necessário, conforme a validade/revogação configurada no serviço. Sem a opção marcada, a sessão fica somente na aba (sessionStorage). Sair remove os tokens dos dois armazenamentos; o e-mail lembrado pode ser removido desmarcando a opção. Prefira marcar apenas em aparelho pessoal. Safari/iCloud pode oferecer preenchimento de senhas com Face ID conforme o aparelho; não há autenticação biométrica própria implementada.

## 3. Criar o super admin

1. Abra o app atualizado e clique em **Criar conta**.
2. Confirme o link recebido por e-mail e entre.
3. No SQL Editor do Supabase, execute com o e-mail dessa conta:

```sql
update public.profiles set role = 'super_admin'
where id = (select id from auth.users where email = 'SEU_EMAIL_CONFIRMADO');
```

4. Saia e entre novamente. O botão **Painel do super admin** aparecerá.

A primeira pessoa que se cadastra NÃO vira admin automaticamente. A promoção ocorre somente pelo SQL Editor. O super admin visualiza todos os perfis, altera categorias e nome/cor do app, mas não altera lançamentos de terceiros. Categorias são compartilhadas; nomes antigos ficam preservados nos lançamentos.

## 4. Ativar envio de extratos e avisos

O e-mail do perfil é o próprio e-mail de login, confirmado pelo Supabase. A alteração requer confirmação; não basta digitar um endereço. Usuários são informados de que o super admin pode visualizar seus dados.

1. Crie uma conta em https://resend.com e configure/verifique um domínio remetente. O remetente de teste pode restringir envios ao proprietário; envio para vários usuários exige um domínio autorizado. As cotas dependem do plano.
2. Crie uma API key no Resend. Guarde-a APENAS nos **secrets da Edge Function** do Supabase.
3. No Supabase, abra **Edge Functions** e crie uma função chamada `send-email`. Cole o conteúdo de `supabase/functions/send-email/index.ts` no editor e publique a função. Desative a verificação JWT do gateway caso sua configuração exija isso; a função já valida o token em `/auth/v1/user` e a função super_admin no banco em toda chamada. Para implantação por CLI, essa opção está em `supabase/config.toml`.
4. Cadastre em **Edge Functions → Secrets**:
   - `RESEND_API_KEY`: chave privada do Resend.
   - `MAIL_FROM`: remetente autorizado, por exemplo `Saldo <extratos@seu-dominio.com>`.
   - `APP_ORIGIN`: `https://joaopatrick16.github.io` (sem `/projetosgpt/` e sem barra no final).
5. `SUPABASE_URL` e `SUPABASE_ANON_KEY` são variáveis fornecidas pela plataforma à função. Ela não usa a chave administrativa para consultar os usuários.
6. No app, abra **Painel do super admin → Enviar extratos e informações**. Escolha destinatário, assunto e mensagem. O anexo usa o mês selecionado e contém apenas os lançamentos desse destinatário. Confirme o envio.

A função só permite envio pelo super admin para um e-mail confirmado consultado no banco. Não aceita endereços arbitrários enviados pelo navegador. Limites: 20 reservas por hora e uma por destinatário/minuto; uma tentativa que falhe no provedor também consome a reserva. Anexos PDF até 1 MB. O estado "aceito" indica aceite do provedor, não comprova entrega ou leitura. Nenhum e-mail real é enviado pelos testes.

## 5. Conferir antes de convidar outras pessoas

- Crie duas contas de teste confirmadas. Registre despesas diferentes; cada conta deve ver somente as próprias despesas.
- Entre como super admin e confira a visualização geral e por perfil.
- Confira upload de foto, alteração de nome, categorias e aparência.
- Faça uma entrada (crédito de dinheiro), uma saída (débito de dinheiro) e um gasto com cartão de crédito. Confira gastos, receitas, saldo e PDF. Pagamento em cartão de crédito é uma forma de pagamento; não é parcelamento nem controle de fatura.
- Envie um extrato a uma conta de teste de sua propriedade e confira a entrega e o anexo antes de usar com terceiros.
- No iPhone real, confira instalação, login, foto e download do PDF. As contas exigem conexão; o cache offline armazena somente os arquivos do aplicativo, não dados financeiros nem fotos.

Os dados antigos permanecem no navegador. No perfil correto, use **Importar gastos antigos deste aparelho para minha conta**. Faça um backup antes. A importação não apaga a origem e repetir a ação duplica os lançamentos. Em aparelhos compartilhados, confira a origem antes de importar. O backup JSON sempre exporta apenas os dados do usuário autenticado, mesmo no painel geral; o PDF acompanha a visualização escolhida.
