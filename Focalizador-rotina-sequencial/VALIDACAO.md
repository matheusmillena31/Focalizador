# Validação da versão 0.1

Atualização de rotina sequencial: **54 testes aprovados**. Os quatro novos cenários verificam limites fixos apesar de valores antigos, rejeição de prévias abaixo/acima dos limites, sequência da mesma tarefa nos dias da semana, meta de 60 minutos sem resto inferior a 15 e respeito a compromissos fixos/disponibilidade fragmentada. No Chrome, foram verificados remoção dos campos, salvamento das preferências, períodos consecutivos e horários de início/fim juntos em 1440, 390 e 320 px, sem transbordamento ou erros de JavaScript. Capturas de computador/celular foram inspecionadas. Esta atualização foi preparada localmente, sem publicação.

A revisão de polimento está documentada em **POLIMENTO.md**. Os 50 testes continuam aprovados, agora com a regressão de mensagens visíveis dentro do formulário de entrada. A cobertura do navegador inclui as cinco telas em 320, 390, 768 e 1440 px e o fluxo local de gerar, confirmar, editar e reabrir a rotina.

Resultado: **50 testes aprovados**, sem falhas. Build estático e arquivo independente gerados. Os testes incluem os fluxos da versão modular e do HTML independente, além dos cenários de armazenamento bloqueado.

## Agenda por horas de cada tarefa

Quatro testes novos verificam agrupamento por atividade/título, atividades distintas com mesmo nome, preservação dos registros originais, tarefas concluídas/excluídas, recorte à meia-noite, sobreposição de períodos e formato de horas/minutos.

Uma verificação em Chrome real com dados fictícios confirmou três tarefas a partir de cinco compromissos, barras proporcionais, totais diário e mensal, edição de um horário com recálculo após salvar/reabrir, preservação da opção de alerta, expansão dos detalhes e fundo azul do dia atual. As larguras de 320, 360, 390 e 1440 pixels passaram sem transbordamento horizontal; não houve erros de JavaScript. As capturas de computador e celular foram inspecionadas visualmente.

O usuário confirmou o acesso da versão anterior pelo computador e celular. A publicação desta atualização não foi executada neste ambiente: é necessário executar **Publicar no Firebase.cmd** da pasta atualizada para disponibilizar a nova interface no endereço existente.

Os testes exercitam:

- Cronômetro com pausa, retomada e reabertura dos dados.
- Divisão correta do tempo entre dias, excluindo pausas.
- Filtros de estatísticas por período.
- Conclusão e início de novas sessões sem reutilizar um registro removido.
- Falha de armazenamento sem alterar parcialmente os dados em memória.
- Importação validada antes de gravar e separação entre contas.
- Supressão de alertas desativados, concluídos, antigos ou já exibidos.
- Validação de compromissos.
- Inicialização com porta livre, reutilização de uma instância reconhecida, porta ocupada por outro programa e falhas ao identificar a instância. Esses cenários usam um servidor simulado e não encerram processos nem mudam de porta.
- Precondições de gravação e conflitos concorrentes de sincronização.
- Reconhecimento de gravações cuja resposta se perdeu.
- Edições locais durante um envio e recuperação após falha de rede.
- Entrega de arquivos e bloqueio de caminhos internos pelo tratamento HTTP, exercitado diretamente sem conexão de rede.
- Fluxo integrado da interface com uma representação mínima do documento: cadastrar atividade, escapar texto inserido, iniciar/pausar/continuar/concluir sessão, criar compromisso sem alerta, concluir compromisso, navegar por progresso e salvar configurações. Esse teste não mede renderização ou layout de um navegador real.

Também foram verificadas a sintaxe dos módulos JavaScript, dos arquivos Electron e do script de preparação Android.

## Validação adicional da agenda mensal

A disponibilidade variável recebeu testes de três ou mais faixas, zero/uma faixa, ordenação e sobreposição, leitura de campos após remover linhas, cópia por grupo sem compartilhar referências e cálculo de períodos desocupados com intervalos, eventos sobrepostos, concluídos e excluídos. O planejador foi testado usando a terceira faixa quando as outras estavam ocupadas. No Chrome, foram verificados adicionar/remover, cópia para dias úteis e fins de semana, confirmação/cancelamento, preservação dos outros dias, gravação somente ao salvar, atualização do tempo livre após criar/excluir compromisso, persistência após reabrir e apresentação em 320 e 390 pixels.

O planejador semanal recebeu oito testes adicionais: preferência de dever sobre hobby, ordenação por prazo, intervalos e eventos ocupados, distribuição em dias, desconto de tempo praticado e já planejado, metas zero e prazos vencidos, conflitos em horários editados e validação da disponibilidade. No Chrome, foi verificado o cadastro real de horários e metas, a geração de prévia sem alteração da agenda, a confirmação, a ausência de duplicação ao gerar novamente e a apresentação em largura de celular. O teste usou armazenamento isolado, sem alterar dados pessoais.

Além dos testes automatizados de datas e intervalos, a versão independente foi aberta em uma instância limpa de Chrome headless. Foram verificadas a troca pelos botões Semana/Mês, a preservação do dia selecionado, a criação de três compromissos na mesma data, o indicador de compromissos extras, a lista completa do dia, a passagem de janeiro para fevereiro, o botão Hoje, a preferência de visualização após reabrir e o controle de importação de backup oculto. A apresentação foi conferida em computador e em largura de celular. Não ocorreram erros de JavaScript durante esse fluxo.

## Limites da validação inicial e dos serviços externos

A preparação de publicação recebeu testes para restringir o envio à interface, conferir o projeto de destino e reconhecer sites existentes sem criar outro diante de respostas inválidas. A ferramenta oficial Firebase CLI foi instalada no ambiente, mas a solicitação de login ao serviço `auth.firebase.tools` falhou. A política de aprovação rejeitou a tentativa de ampliar esse acesso. Não ocorreu implantação no Hosting nesta etapa, nem validação de um endereço publicado. O iniciador **Publicar no Firebase.cmd** foi preparado para a autorização e publicação pelo usuário em seu computador; não foi executado com uma conta autenticada aqui.

O ambiente bloqueou o download de bibliotecas com erro de resolução de endereço. A política de aprovação também rejeitou a solicitação de acesso ampliado. Por isso, não se instalou Electron/Capacitor, não foi gerado arquivo de lock e não foram compilados EXE ou APK.

O navegador de teste não conseguiu acessar o servidor local. Uma tentativa de conexão local por teste também foi negada com `EACCES`. O tratamento HTTP foi então testado diretamente; não se afirma que a rede local ou o layout tenham sido verificados em um navegador real neste ambiente.

Firebase e Google Agenda foram exercitados com respostas simuladas, sem contas, credenciais ou autorização reais. Depois de configurar os projetos, valide login, recuperação de senha, sincronização entre dois dispositivos e autorização OAuth. Teste alertas reais com a tela apagada, aplicativo minimizado, após reiniciar o Android e após suspender o Windows. Essas verificações dependem das permissões e preferências do sistema.

## Roteiro rápido em um dispositivo

1. Abra o aplicativo, crie uma atividade e inicie uma sessão.
2. Pause, reabra e confirme que o tempo ficou parado; continue e conclua.
3. Confira o tempo em Progresso e crie um registro manual em outro horário.
4. Agende três compromissos próximos: sem alerta, notificação e alarme.
5. Verifique o som escolhido e a interrupção do alarme; teste também fora do primeiro plano na versão nativa.
6. Exporte um backup, abra a conta/configuração em outro dispositivo e importe-o.
7. Edite registros distintos nos dois dispositivos e sincronize; em seguida, edite o mesmo registro offline nos dois para verificar a resolução de conflitos.
8. Autorize Google Agenda, envie um compromisso salvo e repita o envio: deve atualizar a mesma entrada, sem duplicar.
