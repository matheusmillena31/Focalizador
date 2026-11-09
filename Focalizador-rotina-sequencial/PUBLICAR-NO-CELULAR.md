# Abrir o Focalizador no celular

Você já confirmou o acesso pelo computador e pelo celular. Este pacote contém uma nova versão da agenda, com horas por tarefa e destaque azul para o dia atual. Execute o iniciador abaixo para atualizar o mesmo endereço; esta atualização ainda não foi publicada daqui.

## Publicar pelo seu computador

1. Extraia todo o ZIP para uma pasta e abra **Publicar no Firebase.cmd**. Essa etapa exige Node.js 22+ e internet. Não execute dentro do ZIP.
2. Aguarde o download da ferramenta oficial do Firebase pelo npm. Se forem feitas perguntas sobre recursos Gemini ou coleta de uso, você pode responder **N**: não são necessários para a publicação.
3. A ferramenta mostrará um endereço para entrar na conta Google que é proprietária do projeto **Focalizador**. Essa é a conta do console Firebase, não necessariamente o e-mail cadastrado no aplicativo.
4. Faça a autorização diretamente na página oficial do Google/Firebase. Confira as permissões e o identificador da sessão apresentados. Se receber um código de autorização, cole-o na própria janela do iniciador. Não envie senha, código ou token no chat.
5. Depois do login, o iniciador confere/cria o site do projeto e publica somente a interface. Ele não altera as regras do banco, o login, o plano de faturamento ou os seus registros.
6. Aguarde a mensagem **Publicação concluída**. Depois, atualize a página em `https://focalizador-3d5d3.web.app` nos dois dispositivos para carregar a nova versão. Se aparecer erro, guarde a mensagem para investigarmos, sem incluir códigos de autorização.

O modo de autorização sem localhost segue a [documentação oficial da Firebase CLI](https://firebase.google.com/docs/cli#log-in-test-cli). Foi escolhido para não depender das portas locais que falharam anteriormente.

## Usar nos dois dispositivos

Abra o endereço publicado no computador e no celular e entre com o mesmo e-mail e senha **do Focalizador** que você acabou de criar. Use **Ajustes > Sincronizar agora**. Os registros da conta devem aparecer; dados que ficaram somente no modo local precisam ser transferidos por backup.

A publicação atualiza a interface e mantém os registros da conta no Firebase. Confira o total planejado de uma tarefa conhecida após atualizar a página. O computador não precisa ficar ligado para o celular acessar a versão online.

No navegador do celular, lembretes e som continuam dependendo da página aberta e das permissões. Não foi entregue APK nem serviço de alarmes em segundo plano nesta etapa.

## O que será publicado

Somente `web-public/index.html`, gerado com a interface e os identificadores públicos do projeto. Backups, dados salvos no navegador, senhas, tokens, arquivos de desenvolvimento e registros do banco não fazem parte desse envio. A interface ficará acessível pelo endereço, enquanto os registros sincronizados permanecem sujeitos ao login e às regras por usuário no Firestore.
