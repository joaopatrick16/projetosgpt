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

## Atualizações consistentes e diagnóstico

`npm run build` gera `dist/releases/<versão>/` com CSS, módulos e fontes da mesma versão. O HTML usa esse endereço exclusivo; imports internos continuam dentro da versão. A publicação inclui `version.json` (commit/versão/data) e um service worker com hashes SHA-256 dos arquivos do pacote. O worker verifica o pacote antes de assumir o controle e mantém a versão anterior como proteção para sessões abertas. Dados de contas, planejamento e sessão não são apagados nessa atualização.

A página verifica novas publicações ao abrir, recuperar foco e periodicamente enquanto visível. Mostra **Atualizar agora / Depois**, sem recarregar formulários automaticamente. A atualização espera a confirmação de que o worker correto assumiu o controle. Quando o pacote está indisponível/incompleto, mostra falha e preserva os dados. A instalação antiga precisa ser reaberta/recarregada uma primeira vez para receber esse mecanismo.

Em **Configurações → Atualizações do app**, compare **Endereço** e **Versão em uso** nos aparelhos. O endereço precisa ser `https://serimora.netlify.app` nos dois, e o identificador deve ser igual. `Desenvolvimento (arquivos de origem)` indica execução do checkout/GitHub Pages ou diretório de publicação incorreto, em vez do pacote gerado em dist.

Verificação pública automatizada, em uma rede com acesso ao site:

```
npm run verify:published -- https://serimora.netlify.app/ COMMIT_ESPERADO
```

O comando confere o commit, HTML, CSS, módulos, worker e hashes dos arquivos realmente servidos, e retorna erro se houver versão incorreta ou conteúdo misturado. Não usa credenciais, não altera a publicação e não testa login/dados privados. Os testes locais `python3 tests/releases.py` simulam versões A/B, atualização de uma sessão aberta, preservação de dados, desktop/celular, modo offline e rejeição de pacote corrompido.

Se a publicação ainda não corresponder ao GitHub, confira **Deploys** no Netlify: último commit publicado, status Published/Failed/Cancelled/Paused, branch de produção `main`, build `npm run build` e diretório `dist`. Uma mudança enviada ao GitHub não comprova que o deploy foi aceito. Verifique também eventual divisão de tráfego entre versões e se o endereço é o de produção, não uma prévia. Não limpe os dados do site para tentar resolver: isso pode apagar o planejamento local; exporte uma cópia antes de qualquer limpeza manual.
