# Saldo

Controle financeiro leve em português, compatível com Safari no iOS. Sem dependências externas, contas, anúncios ou fontes remotas.

## Executar

Requisitos: Python 3; Node.js 18+ para os testes.

```sh
npm start
npm test
```

O servidor de desenvolvimento usa a porta 8000. Para instalar no iPhone, publique os arquivos estáticos em HTTPS e, no Safari, use Compartilhar → Adicionar à Tela de Início. Após o primeiro carregamento completo, o service worker disponibiliza os arquivos offline. HTTP remoto não permite instalação/offline. Não há etapa de build.

## Funcionalidades

- Lançamentos em reais, com data, categoria e tipo fixo/variável.
- Recorrência mensal opcional para gastos fixos, desde o mês inicial, sem data final. Excluir uma série remove todas as ocorrências, inclusive anteriores; para gastos com valor diferente em cada mês, use lançamentos individuais.
- Resumo mensal, comparação com mês anterior, gráfico de seis meses e totais por categoria.
- Tema escuro com detalhes em azul e verde-água.
- Exportação direta em PDF do mês selecionado, com resumo, comparação de seis meses, categorias e detalhes paginados. O relatório inclui todos os gastos do mês, independentemente do filtro da lista.
- Backup JSON separado e restauração com validação e confirmação antes de substituir dados. O PDF é para leitura; a restauração usa JSON.

Os valores são armazenados em centavos. Os gastos recorrentes são compromissos projetados, sem confirmação de pagamento. Os dados ficam no localStorage do navegador; não há sincronização entre aparelhos. Faça backups antes de limpar o navegador ou mudar de dispositivo. Não existe edição nesta versão: exclua e lance novamente. O comparativo considera apenas despesas registradas, sem receitas ou saldo bancário.

## Validação

`npm test` cobre valores, recorrência, mudança de ano e validação de backups, estrutura do PDF e paginação. A experiência de instalação e armazenamento deve ser conferida em um iPhone real antes de distribuição pública.
