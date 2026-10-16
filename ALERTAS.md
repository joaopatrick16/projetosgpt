# Vencimentos: sininho, calendário e e-mail

O sininho usa as contas não pagas de **Planejamento** da própria conta/navegador, inclusive para superadmin. Mostra atrasos e os próximos 7 dias. Marcar uma conta como paga remove o alerta. O bloco lateral **Seu próximo passo** prioriza vencimentos, depois limites mensais a partir de 80%, depois uma meta não concluída; sem dados, convida a definir um orçamento. Lançamentos abre a lista em Relatórios; Assistente Serimora abre a revisão por texto.

## Avisos que já podem ser testados

- **No app**: a lista e o contador são atualizados ao alterar o planejamento e, com a página visível, a cada minuto. A permissão do sistema só é solicitada ao clicar em Ativar avisos neste aparelho. Contas de hoje ou atrasadas geram um aviso por dia/conta, agrupado, com deduplicação local. A disponibilidade depende do navegador; não há inscrição em Web Push nem entrega garantida em segundo plano. Se o navegador suspender ou fechar o app, o timer para. No iPhone, a disponibilidade varia com versão e instalação na tela inicial; o calendário é a alternativa.
- **Calendário (.ics)**: importa contas futuras não pagas como eventos às 09h de Brasília com lembretes um dia antes e no vencimento. O usuário precisa abrir o arquivo, escolher um calendário e confirmar a importação. A exibição do aviso depende das permissões e do comportamento do calendário do celular. O arquivo não é uma assinatura sincronizada: após pagar, alterar ou remover uma conta, ajuste o evento também no calendário. Importações repetidas podem criar eventos duplicados em alguns aplicativos.
- **WhatsApp**: não há envio automático nesta versão. Um link de compartilhamento manual, se implementado posteriormente, ainda exigirá escolher o contato e confirmar Enviar. Automação exigiria integração oficial da plataforma WhatsApp Business, opt-in e eventuais custos do provedor.

## Ativar e-mail automático

A rotina `due-reminders` está programada no Netlify para todos os dias às **09h de Brasília**. Envia um resumo por usuário no vencimento e 3 dias antes, somente a endereços de perfil confirmados no Supabase. Não usa um destinatário fixo nem e-mail fornecido no texto de uma conta.

1. Execute `supabase/reminders.sql` no SQL Editor. Cria as cópias de lembretes com RLS por proprietário, RPC de substituição atômica e registro privado de entregas. O SQL de backup semanal é separado.
2. Configure no Netlify, escopo **Functions / Production**: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` e `MAIL_FROM` (remetente autorizado). `SUPABASE_URL` é opcional, com padrão no projeto público já usado pelo app. Nunca coloque chaves privadas em config.js, no GitHub ou no chat. O SMTP de login do Supabase não configura o Resend desta rotina.
3. Republique no Netlify para aplicar as variáveis. Verifique a função agendada **due-reminders** e seus logs. Sem credenciais, o botão não promete ativação e mostra a pendência.
4. Entre com um e-mail confirmado, abra o sininho e clique em **Ativar avisos por e-mail**. Confirme o destinatário exibido. A lista de contas não pagas deste navegador é copiada para o servidor. A ativação só é mostrada após a gravação ter sido aceita.
5. Para testar entrega, crie uma conta com vencimento hoje, sincronize e use **Run now** na função. Confira a entrega no e-mail e no Resend. Os testes automatizados não enviam mensagens reais.

Alterações, pagamentos e exclusões feitas neste navegador atualizam a lista quando há conexão e a opção está ativa. Se a sincronização falhar, o servidor conserva a última lista; use **Sincronizar contas para e-mail** após restabelecer a conexão. O planejamento continua local nesta versão; não ocorre sincronização completa entre aparelhos. Ativar outro navegador substitui os lembretes pelos dados daquele navegador. A preferência indicada na interface é deste navegador. Desativar remove seus lembretes do servidor; sair da conta não cancela a opção já ativada.

A função ignora e-mails não confirmados e contas fora dos dias programados. Registra entregas por usuário/dia e usa idempotência do Resend nas tentativas próximas; repetir no mesmo dia não manda novos lembretes para usuários já registrados. Contas novas sincronizadas depois do envio daquele dia não são enviadas novamente naquele dia. Não há recuperação automática dos dias em que a rotina não rodou; atrasos continuam visíveis no sininho. HTTP 200 indica processamento/aceitação pelo provedor, não comprova chegada à caixa de entrada. Falhas são registradas nos logs; não há alerta independente de falha.

As cópias de lembretes e registros de entrega não são incluídos no backup semanal de dados do app nesta versão. O serviço de e-mail pode cobrar pelo uso. Push com o app fechado e WhatsApp automático não foram ativados.

## Quadro de avisos

A aba **Notificações** e o sininho abrem o mesmo quadro. O selo vermelho mostra o total de contas atrasadas ou dos próximos 7 dias mais os limites de orçamento atingidos/ultrapassados no mês selecionado. A contagem não é de mensagens não lidas: abrir o quadro não elimina pendências. Marcar uma conta como paga, remover o lembrete ou ajustar um orçamento atualiza o total. Sem pendências, o selo fica oculto. Há filtros por atrasos, próximos vencimentos e orçamento; estes não alteram o total geral. O quadro segue apenas os dados do próprio perfil, mesmo no painel geral do superadmin. Os avisos de orçamento são do app, não entram no envio de e-mails de vencimento.

Cada cartão de aviso (inclusive o botão Ver conta/Ver orçamento) abre o registro exato no Planejamento, em uma visão com somente esse item, sem exigir procurar nas páginas da lista. O item recebe foco e destaque temporário; o tremor respeita movimento reduzido. O bloco Seu próximo passo também direciona para a conta, orçamento ou meta correspondente. As listas completas têm busca, filtros e páginas de 10 itens.
