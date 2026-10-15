# Um endereço para Serimora Finanças

O endereço gratuito desejado é `serimora-financas.netlify.app`, sujeito à disponibilidade. Esse endereço não exige comprar domínio. Ainda é necessário criar o site na sua conta Netlify; os arquivos preparados não publicam o site sozinhos.

## Publicar pelo GitHub

1. Abra https://app.netlify.com/signup e crie sua conta. Pode usar **Sign up with GitHub** e sua conta existente.
2. No painel, escolha **Add new project → Import an existing project** (os nomes podem variar).
3. Escolha **GitHub** e permita acesso ao repositório `projetosgpt`. Se puder escolher repositórios, autorize somente ele.
4. Selecione o repositório `joaopatrick16/projetosgpt` e a branch `main`.
5. O projeto já tem `netlify.toml`. Confira: comando de build `npm run build`, pasta de publicação `dist` e diretório base vazio/raiz. Não precisa cadastrar senhas ou chaves privadas para gerar a interface.
6. Clique em **Deploy / Publish** e aguarde o sucesso.
7. Nas configurações do projeto, procure **Project name / Site name → Change name**. Tente `serimora-financas`. Se estiver ocupado, escolha outro nome da marca, como `serimora-app`, conforme disponibilidade.
8. Abra o endereço exibido pelo Netlify. A partir daí, novos envios à main atualizam também o site no Netlify.

O nome do repositório no painel pode continuar projetosgpt: ele não precisa aparecer no endereço público do app. O hostname github.io atual inclui o nome da conta GitHub; mudar apenas a pasta não o remove.

## Conectar o login ao novo endereço

Depois de saber o endereço definitivo, no Supabase abra **Authentication → URL Configuration**:

- Mude **Site URL** para o novo endereço HTTPS com barra final.
- Adicione o mesmo endereço em **Redirect URLs**.
- Mantenha o endereço antigo autorizado enquanto ainda precisar usá-lo. Confirmações e recuperação dependem desses endereços; links antigos não mudam automaticamente.

Se a função de envio de extratos já estiver ativa, atualize `APP_ORIGIN` nos secrets da Edge Function para a nova origem HTTPS, sem barra final. As demais credenciais permanecem no Supabase. Não publique chaves secretas no GitHub ou no Netlify.

## Seus dados

As contas e os lançamentos sincronizados continuam no mesmo Supabase. No novo site, entre novamente com o mesmo e-mail e senha. Confira um lançamento conhecido antes de trocar o atalho do iPhone.

Gastos do modo local ficam vinculados ao endereço antigo do navegador: exporte o backup JSON no site antigo e importe no perfil correto, uma única vez. Não apague o site antigo nem os dados do navegador durante a mudança. No iPhone, adicione o novo endereço à Tela de Início após validar.

## Publicação manual alternativa

Execute `npm run build` e envie a pasta `dist` no recurso de publicação manual do Netlify. O conteúdo de `dist` contém somente o app estático e sua chave Supabase publicável; não inclui funções de servidor, SQL, testes ou arquivos Git. Publicações manuais não recebem atualizações automáticas do repositório.
