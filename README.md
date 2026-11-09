# Focalizador · versão 0.1

[![Validar projeto](https://github.com/matheusmillena31/Focalizador/actions/workflows/ci.yml/badge.svg)](https://github.com/matheusmillena31/Focalizador/actions/workflows/ci.yml)

Aplicativo pessoal de foco e disciplina para Web, Windows e Android. O código
do projeto fica na raiz do repositório e utiliza Node.js **22.12 ou superior**.

## Começar pelo código-fonte

```powershell
git clone https://github.com/matheusmillena31/Focalizador.git
cd Focalizador
npm ci
npm test
npm run build
```

Para testar sem instalar dependências, abra `Focalizador.html`. O arquivo é
gerado pelo build e reúne a interface e o código em uma versão independente.

## Agenda por horas de cada tarefa

O planejador usa limites fixos de **15 a 50 minutos por período**; os campos de duração mínima/máxima foram removidos das preferências. Valores antigos de duração deixam de orientar as novas sugestões. Prioridade, meta semanal, dias desejados e prazo opcional continuam disponíveis.

Ao distribuir a meta entre os dias, o planejador procura reservar o tempo daquele dia em períodos seguidos da mesma atividade, mantendo os intervalos configurados antes de passar à próxima tarefa. Compromissos existentes, disponibilidade fragmentada e prazos podem impedir uma sequência contínua. Metas de 60 minutos, por exemplo, podem ser divididas em 45 + 15 minutos para respeitar os limites.

Início e término aparecem juntos na lista de compromissos, por exemplo **13:00 – 13:50**. As regras de distribuição valem para novas sugestões: compromissos já salvos não são movidos automaticamente.

A agenda reúne os períodos da mesma atividade em uma linha por dia, com seu tempo total planejado: por exemplo, **Treino de xadrez · 2 horas**. As barras comparam a duração das tarefas no dia; deveres/compromissos de alta urgência aparecem em laranja. Minutos são preservados, como **1 hora e 35 min**.

Abra uma tarefa para consultar os horários e editar cada compromisso e seus alertas. O calendário mensal também reúne tarefas repetidas; o semanal mostra o tempo total planejado. O dia atual recebe o fundo azul em gradiente nos dois modos. Os horários livres continuam descontando os compromissos e intervalos cadastrados.

Os totais se referem ao planejamento. O tempo efetivamente praticado continua sendo registrado pelo cronômetro ou pelo registro manual. A atualização lê os compromissos existentes, sem conversão dos registros.

Para levar esta versão ao celular e ao computador, extraia o pacote atualizado e execute **Publicar no Firebase.cmd** dessa pasta. Após a mensagem de sucesso, atualize a página no endereço que você já utiliza. Veja **PUBLICAR-NO-CELULAR.md**.

Aplicativo pessoal de foco e disciplina, com uma interface compartilhada para Android e Windows. Inspirado no conceito localizado no Canva: [Focalizador: Foco e Disciplina](https://www.canva.com/d/2y2NeAn1ZVpxSVO), design `DAHaNJOI7UU`, e na imagem fornecida. O design de referência não foi alterado. Os cartões, a paleta azul e os gradientes foram traduzidos para uma interface real, com textos legíveis e disposição adaptável ao celular.

## Testar agora, sem instalação nem CMD

A versão independente está no arquivo **Focalizador.html**. Ela reúne o aplicativo, o visual e o código em um só arquivo e não precisa de Node.js, internet, porta 4173 ou servidor para testar os recursos locais.

1. Abra a pasta deste projeto.
2. Dê dois cliques em **Focalizador.html** e abra no Chrome ou Edge do computador. **Iniciar Focalizador.cmd** também abre esse arquivo, sem iniciar um servidor.
3. Use **Nova atividade** ou **Usar atividades iniciais** para começar. Não acesse o endereço 127.0.0.1 para esse modo.

Mantenha o arquivo na mesma pasta e use o mesmo navegador/perfil. O armazenamento de arquivos locais varia entre navegadores; guarde backups em **Ajustes > Exportar backup**, principalmente antes de mover/substituir o arquivo. Se o navegador bloquear armazenamento, aparece um aviso de teste temporário: nesse caso, exportar o backup antes de fechar é necessário para preservar o que você fez. Veja a [documentação do armazenamento local](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

O arquivo independente usa um espaço de armazenamento diferente da versão que abre em `127.0.0.1`: dados anteriores não aparecem automaticamente. Transfira-os por backup, se necessário. Para lembretes neste modo, mantenha o arquivo aberto; notificações podem aparecer dentro da própria página e o alarme precisa da interação inicial para liberar som. Isso não substitui os alertas de sistema dos aplicativos nativos.

## Modo com servidor local (opcional)

Este modo exige **Node.js 22 ou superior**. Abra **Iniciar com servidor.cmd**. Ele mantém os endereços e o armazenamento da versão anterior.

Alternativa pelo terminal, dentro desta pasta:

```powershell
npm start
```

Use sempre o mesmo endereço e perfil do navegador para acessar os dados locais desse modo. Não abra `index.html` diretamente: ele é a entrada modular para o servidor e os aplicativos nativos; o arquivo para abrir diretamente é **Focalizador.html**. Para desligar o servidor, feche a janela dele ou pressione Ctrl+C.

Se aparecer `EADDRINUSE` ou uma mensagem de porta ocupada, já existe um programa usando o endereço. Primeiro tente abrir [http://127.0.0.1:4173](http://127.0.0.1:4173): pode ser o próprio Focalizador que continua aberto em outra janela. Se não houver resposta, use **Focalizador.html**, que não depende dessa porta. Não é necessário encerrar processos desconhecidos nem mudar configurações de rede. Para iniciar o servidor atualizado, feche a janela original do Focalizador e abra **Iniciar com servidor.cmd** novamente. Mantenha a mesma porta para acessar registros locais anteriores.

## O que esta versão faz

### Planejador de rotina semanal

Na **Agenda**, use o painel **Rotina semanal**:

1. **Horários livres:** use **Adicionar faixa** e **×** para configurar uma, três ou mais faixas por dia. Sem faixas, o dia fica indisponível. Os horários se repetem como disponibilidade habitual, com intervalo configurável de 0 a 60 minutos entre sessões. Horários antigos são preservados.

   Em **Repetir horários**, escolha o dia de origem e use **Segunda a sexta** ou **Finais de semana** para copiar todas as suas faixas para o grupo. A substituição é confirmada antes de aplicar e não modifica os outros dias. Você pode personalizar cada dia em seguida. As alterações só são gravadas ao clicar em **Salvar horários**; fechar sem salvar mantém a configuração anterior. Para limpar um grupo, use como origem um dia sem faixas.
2. **Prioridades e metas:** informe meta em horas, prioridade, dias desejados e duração mínima/preferida das sessões. Para deveres, há prazo opcional. Meta 0 exclui a atividade das sugestões.
3. Selecione no calendário uma data da semana que deseja planejar e use **Sugerir rotina**. O planejador não sugere horários passados.
4. Revise a prévia, desmarque sessões ou edite os horários. Escolha se quer alertas. Somente **Confirmar na agenda** cria os compromissos.

**Deveres recebem preferência automática sobre hobbies**, mesmo quando sua prioridade manual é baixa. Entre deveres, o prazo mais próximo vem primeiro, depois a prioridade manual; entre hobbies, vale a prioridade manual. Essa regra pode deixar hobbies de fora quando houver muitos deveres. A prévia explica as metas não atendidas, em vez de inventar tempo disponível.

O planejador procura distribuir cada atividade entre dias diferentes, orientado pela frequência desejada, e pode usar mais de uma sessão no mesmo dia quando necessário. A duração preferida também funciona como limite máximo por sessão. A frequência é uma preferência, não uma garantia. Intervalos e compromissos existentes são respeitados. Deveres com prazo vencido ficam de fora para revisão manual.

O tempo já registrado na semana e os compromissos criados pelo próprio planejador reduzem a meta restante. Compromissos manuais ocupam o horário, mas não contam automaticamente como horas praticadas. Confirmar uma rotina não cria sessões de foco concluídas. Reabrir **Sugerir rotina** considera os compromissos já existentes; não substitui nem apaga eventos. Para refazer uma rotina aprovada, edite/remova os compromissos na Agenda e gere novamente.

Se a disponibilidade ou as atividades mudarem durante uma prévia, gere novamente. Horários editados são validados antes da confirmação para impedir conflitos, falta de intervalo, saída da disponibilidade ou violação do prazo. A confirmação só adiciona eventos ao Focalizador; não os envia automaticamente ao Google Agenda.

Horários e preferências entram no backup e na sincronização da conta. Atualize também os outros dispositivos para esta versão antes de sincronizar ou importar um backup novo. Os backups antigos continuam aceitos. Na versão independente, mantenha a página aberta para alertas e exporte backups regularmente.

### Horários desocupados na Agenda

Ao selecionar uma data, em modo mês ou semana, a seção **Horários livres do dia** mostra as partes da sua disponibilidade que ainda não têm compromisso, dever ou hobby agendado. Os períodos são atualizados ao criar, editar, remover ou sincronizar compromissos, respeitando também o intervalo configurado ao redor de cada evento. Eles não são novos eventos nem são inseridos na agenda.

Um dia sem compromissos não é automaticamente considerado disponível: é necessário cadastrar horários para aquele dia da semana. Compromissos concluídos mantêm a reserva do horário original; excluir o compromisso libera o período. A visualização mostra o dia selecionado inteiro, inclusive quando se trata de uma data passada.

A atualização visual inclui uma agenda mensal e semanal, alternadas pelos botões **Semana** e **Mês** no cabeçalho. A escolha fica salva neste navegador. As setas avançam conforme o modo ativo, e **Hoje** retorna à data atual. O dia de hoje e o dia selecionado têm destaques diferentes. No mês, aparecem até dois compromissos por dia e um indicador dos demais; selecionar a data mostra a lista completa abaixo. No celular, pontos indicam os compromissos, e os detalhes ficam na lista do dia. Os meses são calculados com todas as datas reais, incluindo anos bissextos e meses de seis linhas.

Atividades ganhou uma apresentação mais leve, sem filtros fixos. Quando houver mais de oito atividades, aparece uma busca por nome. Os rótulos e totais do Progresso continuam calculados a partir dos seus registros, sem números copiados do desenho do Canva.

**Para atualizar sem perder registros:** exporte um backup na versão anterior, feche a página e substitua apenas **Focalizador.html** na mesma pasta pelo arquivo atualizado. Reabra no mesmo navegador e perfil. Se usar uma pasta diferente, importe o backup em Ajustes. Não é necessário iniciar servidor ou acessar a porta 4173.

- Criar, editar e remover hobbies e deveres, com cor e meta semanal opcional.
- Manter uma sessão de foco por vez, pausar, continuar e concluir. O tempo continua correto após minimizar, bloquear ou reabrir o aplicativo, pois depende de horários salvos, não de contagens na tela.
- Registrar tempo manualmente, com validação de períodos futuros e sobrepostos. Remover registros do histórico.
- Exibir tempo diário, distribuição por atividade e histórico de 7 ou 30 dias. Pausas são excluídas e sessões que atravessam meia-noite são divididas corretamente entre os dias.
- Criar, editar, concluir e remover compromissos. Navegação semanal e seleção de data.
- Escolher **alarme**, **notificação** ou **sem alerta**, além de antecedência e urgência. Urgência é uma sinalização visual e não muda o tipo de alerta escolhido.
- Exportar/importar backup JSON e exportar compromissos em `.ics`.
- Entrar/criar conta por e-mail e senha com Firebase Authentication; recuperação de senha; sincronizar dados com Firestore quando configurado.
- Conectar o Google Agenda nos aplicativos nativos, enviar/atualizar compromissos e consultar os próximos 30 eventos da agenda principal, depois de configurar OAuth.

Os dados começam vazios. O botão **Usar atividades iniciais** adiciona Xadrez, Leitura e Estudos, sem inventar histórico ou estatísticas.

## Aplicativo Windows independente

Com acesso à internet, dentro da pasta do projeto:

```powershell
npm install
npm run desktop
```

Para gerar o executável portátil:

```powershell
npm run windows
```

O arquivo será criado em `release/Focalizador-0.1.0-Windows.exe`. Não é necessário hospedar um servidor para usar esse executável. O projeto usa Electron com isolamento de contexto, ambiente restrito no renderizador e comunicação limitada com o sistema. A interface e os dados do executável ficam separados dos do navegador; use backup para transferir dados locais.

Ao fechar a janela, o aplicativo continua **na bandeja do Windows**, e os alertas seguem ativos. Clique no ícone para reabrir ou no menu **Sair e desativar alertas** para encerrar. O aplicativo não inicia automaticamente com o Windows e não acorda um computador desligado. Após suspensão, compromissos atrasados em até 5 minutos ainda podem disparar. O arquivo de agendamentos é salvo na pasta de dados do aplicativo.

O executável gerado não terá assinatura comercial. Não há certificado de assinatura incluído neste projeto.

## Gerar APK Android

Pré-requisitos: Node.js 22+, Android Studio, SDK Android compatível com Capacitor 7 (API 35) e JDK 21. Não é necessário publicar na Play Store.

```powershell
npm install
npm run android:init
npm run android:open
```

O primeiro comando `android:init` cria a pasta Android com Capacitor, copia o código Java próprio, acrescenta as permissões e prepara a integração Google. Execute-o uma única vez. No Android Studio, aguarde a sincronização do Gradle e use **Build > Generate App Bundles or APKs > Generate APKs**. Para uma instalação pessoal de teste, o arquivo fica normalmente em `android/app/build/outputs/apk/debug/app-debug.apk`.

Também é possível gerar pelo terminal após criar a plataforma e configurar o SDK:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Para versões pessoais permanentes, crie uma chave de assinatura de release e guarde-a: futuras atualizações devem manter pacote e assinatura para preservar os dados e a identidade OAuth. Nenhuma chave privada é fornecida no projeto.

Após editar a interface:

```powershell
npm run android:sync
```

Após editar `native/android/`, copie novamente o código e sincronize:

```powershell
node scripts/android-setup.mjs
npm run android:sync
```

No celular, permita notificações e **Alarmes e lembretes** quando solicitado. Se a tela de permissão abrir, autorize e volte para salvar o compromisso novamente. Alarmes usam o som de alarme do sistema, tocam em um serviço visível com notificação e podem ser interrompidos pelo botão **Parar alarme** na notificação. Por proteção contra um alarme esquecido, param após 10 minutos. Notificações comuns respeitam o canal e as preferências de som do Android. O aplicativo não altera volume nem força a passagem pelo modo Não Perturbe.

Os lembretes futuros são armazenados nativamente e reagendados após reiniciar ou atualizar o APK. Forçar a parada do app nas configurações do Android, remover permissões, desativar canais ou restrições de bateria do fabricante pode impedir alertas até reabrir o aplicativo. Reabra-o depois dessas mudanças. O código não lê o uso de outros aplicativos.

## Conta e sincronização Firebase

O modo local funciona imediatamente. A sincronização exige um **projeto seu**; não há credenciais nem conta de serviço embutidas.

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Em **Authentication > Sign-in method**, ative **Email/Password**.
3. Crie o **Cloud Firestore**, em modo de produção. Escolha a região antes de armazenar seus dados.
4. Abra a aba **Rules** e publique exatamente as regras de `firebase/firestore.rules`. Elas isolam os registros por UID e negam os demais caminhos. Não use regras públicas de teste.
5. Nas configurações do projeto, registre um aplicativo Web para consultar o **Project ID** e a **Web API Key**. Esta é uma chave de identificação do cliente, não uma credencial administrativa. Não use arquivos de conta de serviço.
6. No Focalizador, abra **Ajustes > Configurar conexões** e preencha esses dois campos em cada dispositivo.
7. Crie a conta no primeiro dispositivo; nos demais, entre com o mesmo e-mail e senha.

As requisições seguem as [APIs oficiais Firebase Authentication](https://firebase.google.com/docs/reference/rest/auth) e [Firestore REST](https://firebase.google.com/docs/firestore/use-rest-api). Os tokens são enviados por HTTPS e mantidos somente na sessão do aplicativo. **Ao fechar completamente e reabrir, entre novamente.** O cache local dos dados da conta é preservado por dispositivo, mas o modo local reaparece até fazer login. Fechar apenas a janela Windows para a bandeja mantém a sessão.

O modo local e cada conta/projeto possuem espaços separados. Para transferir registros locais para a conta, exporte no modo local, entre na conta e importe o arquivo. Sair da conta não apaga os dados previamente baixados do armazenamento deste dispositivo. Exporte backups antes de limpar o perfil do navegador ou desinstalar o APK.

A sincronização ocorre depois das mudanças, quando a interface volta ao primeiro plano e a cada 30 segundos enquanto visível. **Não há sincronização contínua em segundo plano entre dispositivos.** Os alertas recebidos da nuvem são agendados quando o app sincroniza. Abra/sincronize o celular antes de depender de um compromisso criado no computador.

Cada registro tem uma versão independente. Alterações concorrentes no mesmo registro ficam em **Ajustes > Alterações em conflito**, com as duas versões disponíveis para escolha; não são silenciosamente sobrescritas. A gravação usa precondições do Firestore. Remoções são marcadas nos registros para propagá-las aos outros dispositivos. Um envio cuja resposta se perdeu pode ser reconhecido na tentativa seguinte, sem duplicar sessões. A política de conflito também se aplica ao cronômetro compartilhado: evite iniciar sessões em dois aparelhos simultaneamente; sincronize antes de trocar de dispositivo.

Como o projeto é pessoal, você pode restringir ainda mais as regras a um UID fixo depois de criar sua conta, acrescentando `request.auth.uid == 'SEU_UID'` às condições de leitura e escrita. O serviço permanece sujeito às cotas e preços do Firebase; não se presume custo sempre zero.

## Google Agenda

Esta integração **não substitui** a sincronização de atividades do Firebase. A conta Google autorizada pode ser diferente do e-mail usado no Focalizador. Enviar ao Google transmite o título, a anotação, os horários e o lembrete do compromisso para a agenda principal da conta escolhida.

1. No [Google Cloud Console](https://console.cloud.google.com/), habilite **Google Calendar API**.
2. Configure a tela de consentimento OAuth para seu projeto e adicione sua conta aos usuários de teste, quando aplicável. Solicite o escopo `https://www.googleapis.com/auth/calendar.events`.
3. **Windows:** crie um cliente OAuth de tipo **Desktop app**. Copie o Client ID e o Client secret desse cliente para os Ajustes. Não use uma credencial Web. O aplicativo abre o navegador padrão, valida `state`, usa PKCE e recebe o retorno apenas em `127.0.0.1`, conforme o [fluxo oficial para desktop](https://developers.google.com/identity/protocols/oauth2/native-app).
4. **Android:** crie um cliente OAuth de tipo **Android**, pacote `com.focalizador.personal`, com o SHA-1 da assinatura do APK que será instalado. Consulte-o por `gradlew.bat signingReport` na pasta Android. APK de debug e de release possuem assinaturas distintas. A autorização usa [Google Identity Services](https://developer.android.com/identity/authorization) e requer Google Play Services no aparelho; não há cliente desktop nem segredo no código Android.
5. Em **Agenda**, escolha **Conectar Google** e autorize. Para consultar, use **Atualizar eventos**.
6. Salve um compromisso, abra-o e use **Enviar ao Google**. Se editar o compromisso, salve e depois escolha **Atualizar no Google**.

Os botões enviam **a versão já salva**, mediante confirmação. Cada compromisso recebe um identificador estável no Google para evitar duplicatas em tentativas repetidas. **Não há sincronização bidirecional automática:** eventos consultados do Google são apenas exibidos; mudanças externas não alteram o registro local. Ao remover um compromisso do Focalizador, a cópia Google permanece e pode ser removida no Google Agenda. O aviso explica isso antes de confirmar.

O Google Agenda não tem o mesmo modo de alarme persistente do Focalizador: recebe um lembrete `popup` quando você escolhe notificação ou alarme; sem alerta, recebe uma lista vazia de lembretes. Tokens Google ficam só em memória; se expirarem, reconecte. As exigências de verificação e duração de tokens dependem da configuração OAuth e das políticas atuais do Google.

No navegador local, utilize **Calendário (.ics)** para abrir/importar no calendário de sua preferência. A autorização OAuth direta está implementada nos aplicativos nativos, não no navegador local.

## Organização para futuras atualizações

```text
src/domain.js        Regras de cronômetro, intervalos, estatísticas e validações
src/store.js         Persistência local por conta, importação e exportação
src/cloud.js         Login Firebase, renovação de token e fila de sincronização
src/platform.js      Adaptação de alertas e autorização para cada plataforma
src/app.js           Telas, formulários e fluxos de uso
src/styles.css       Identidade visual e adaptação a celular/computador
desktop/             Aplicativo Electron, bandeja, lembretes e OAuth com PKCE
native/android/      Plugin Capacitor, alarmes, notificações e autorização Google
scripts/             Servidor sem dependências e preparação dos aplicativos
firebase/            Regras de acesso ao Firestore
tests/               Testes de regras, persistência, sincronização e fluxos
```

O núcleo e a interface usam JavaScript padrão, sem serviços obrigatórios. O build copia os arquivos, e os invólucros nativos podem ser substituídos sem reescrever as regras centrais. Estimativas de horas por pesquisa/IA, captura de uso de outros apps, recorrência de compromissos, anexos e alarmes snooze ficam para atualizações futuras.

## Validar

```powershell
npm test
npm run build
```

Esses dois comandos funcionam sem instalar dependências. Para gerar as versões
Windows ou Android, use `npm ci` e instale os pré-requisitos nativos. O
`package-lock.json` faz parte do repositório para manter instalações
reproduzíveis. A validação automática do GitHub executa instalação, auditoria
das dependências de produção, testes e build em cada pull request para `main`.

## Licença

Código disponibilizado para visualização e avaliação de portfólio. Nenhuma
licença de reutilização é concedida sem autorização prévia; consulte `LICENSE`.

Nesta entrega, os testes automatizados usam serviços simulados: não se criou conta Firebase, não se autorizou uma conta Google e não se enviaram dados pessoais a esses serviços. O acesso ao navegador de teste falhou; a renderização visual e a compilação/execução em dispositivos reais Android e Windows devem ser verificadas após instalar as dependências. Não há APK ou EXE já compilado incluído.
