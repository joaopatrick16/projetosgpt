# Saldo

App financeiro leve em português, com tema escuro em azul-marinho, azul e ciano, compatível com Safari no iPhone. HTML/CSS/JavaScript sem framework, fontes remotas, dependências de execução ou build. A fonte Inter é servida localmente em WOFF2 (48 KB), com licença em fonts/OFL.txt.

## Executar

Python 3 para o servidor; Node.js 24+ para a suíte (inclui testes da Edge Function TypeScript).

```sh
npm start
npm test
```

Porta 8000. Se estiver ocupada, use `python3 -m http.server 8010 --bind 127.0.0.1`. Para instalar no iPhone, publique os arquivos estáticos em HTTPS e use Safari → Compartilhar → Adicionar à Tela de Início.

## Visual e interações

Layout com menu lateral recolhível no computador e gaveta no celular, inspirado em painéis de relatórios. Abas Dashboard, Relatórios, Usuários (super admin), Configurações, Meu perfil e Exportar PDF. O perfil está disponível para contas autenticadas. A navegação mantém mês e escopo selecionados e preserva o foco pelo teclado.

O dashboard combina cartões 2×2, barras mensais lado a lado e distribuição por categoria em pizza ou rosca. A preferência de visualização fica salva no aparelho. Relatórios traz comparação de seis meses, barras de participação por categoria/pagamento e lançamentos; a exportação possui um resumo antes do download. Os gráficos usam apenas saídas, incluindo compromissos recorrentes.

Paleta baseada em #001D39, #0A4174, #49769F, #4E8EA2, #6EA2B3, #7BBDE8 e #BDD8E9, com degradês e botões arredondados. Efeitos curtos de onda, destaque, abertura de painel e feedback de erro ocorrem somente nas interações, via Web Animations API. Não há animações em loop. A preferência `prefers-reduced-motion` desativa os efeitos e transições. A cor personalizada pelo super admin continua disponível; o antigo azul padrão recebe a nova tonalidade.

## Modos

- **Local:** dados no navegador, sem contas ou sincronização. Preserva os gastos da primeira versão; faça backups.
- **Contas:** autenticação Supabase com e-mail/senha e confirmação. Banco com RLS, foto privada reduzida a 256×256, nome e e-mail confirmado para extratos. Os dados pertencem à conta, com leitura geral pelo super admin.
- **Super admin:** visão geral/por perfil, categorias (adicionar/renomear/excluir preservando histórico), nome e cor do app, envio de extratos PDF e mensagens via Edge Function/Resend. Não edita despesas de terceiros.

Consulte [CONFIGURAR-CONTAS.md](CONFIGURAR-CONTAS.md) para ativar o backend. Sem configuração, a tela informa a pendência e permite continuar no modo local. Não existe autenticação simulada. O GitHub Pages hospeda a interface; Supabase hospeda autenticação, banco, fotos e função de envio.

## Finanças e relatórios

Entradas (créditos) e saídas (débitos) são separadas das formas de pagamento: crédito, débito, dinheiro ou Pix/transferência. O saldo é entradas menos saídas registradas, não saldo bancário. Não há parcelamento nem fechamento de faturas.

Gastos fixos/variáveis, categorias, recorrência mensal opcional, comparação de seis meses, receitas e saldo. Um recorrente é um compromisso projetado, não confirmação de pagamento; excluir remove a série inteira, inclusive o passado. Valores em centavos. Para mudar um lançamento, exclua e registre novamente.

PDF direto com resumo, comparação, categorias, despesas e receitas paginadas. O PDF considera toda a visualização mensal, independentemente do filtro da lista; no painel admin, confira o escopo selecionado. Exportação JSON individual e importação aditiva sem apagar dados existentes. Até 500 lançamentos por importação cloud; repetir cria duplicatas.

A lista renderiza 50 lançamentos por vez, com botão para carregar mais. O carregamento cloud busca seis meses mais os recorrentes anteriores, com paginação, e sincroniza nas ações e na troca do mês. Não há polling nem sincronização offline. Fotos privadas e respostas autenticadas não entram no service worker. Perfis, categorias e configurações são leves; a visualização é limitada a 100 mil linhas por consulta. O cache armazena apenas os arquivos da interface.

## Validação

- `npm test`: cálculos, backups, PDF e função de envio (provedor simulado).
- `tests/navigation.py`: menu expandido/compacto, persistência, gaveta mobile, foco e Esc, abas, pizza/rosca, PDF e larguras de 320 a 1440 pixels.
- `tests/browser.py`: interface mobile/local e fluxos cloud contra fixtures (não comprova uma integração Supabase publicada).
- `tests/security.mjs`: schema e políticas executados em PostgreSQL embarcado/PGlite com dois usuários e um admin. Não faz parte do app nem exige dependência em produção.

Para repetir as verificações adicionais:

```sh
npm install --prefix /tmp/saldo-validation --cache /tmp/saldo-npm-cache --no-audit --no-fund --package-lock=false @electric-sql/pglite
node tests/security.mjs /tmp/saldo-validation/node_modules/@electric-sql/pglite/dist/index.js
# Playwright instalado e Chromium disponível:
SALDO_TEST_URL=http://127.0.0.1:8000 python3 tests/browser.py
SALDO_TEST_URL=http://127.0.0.1:8000 python3 tests/navigation.py
```

Os testes SQL usam schemas auth/storage de suporte para avaliar RLS; não substituem a ativação e testes no Supabase real. Login, fotos, confirmação de e-mail e entrega precisam ser validados no projeto configurado. O Safari/iPhone real ainda exige validação.
