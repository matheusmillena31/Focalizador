# Firebase do Focalizador

Projeto criado: **Focalizador** (`focalizador-3d5d3`).

- Plano Spark, sem ativação de faturamento por uso.
- Authentication: e-mail/senha ativado.
- Firestore Standard: banco `(default)` na região `southamerica-east1` (São Paulo).
- Regras publicadas conforme `firebase/firestore.rules`: cada usuário autenticado acessa somente seus registros, sem acesso público ao banco.
- Aplicativo Web registrado: Focalizador Web.
- Os identificadores públicos necessários já estão preenchidos na versão atualizada. Não há credencial administrativa ou senha no código.

## Conectar seus registros

1. Na versão anterior, exporte um backup em Ajustes antes de trocar o arquivo.
2. Abra o novo Focalizador.html, usando a mesma pasta e perfil de navegador.
3. Em Ajustes, escolha Criar conta e defina seu e-mail e uma nova senha para o Focalizador. Não é necessário usar sua senha da conta Google. Se você já criou uma conta de aplicativo neste projeto, use Entrar.
4. Depois de entrar, importe seu backup para transferir os registros locais à conta.
5. Use Sincronizar agora e aguarde a confirmação. Não apague o backup antes de conferir seus registros.

Se houver configuração personalizada de outro projeto salva no navegador, ela será preservada. Para usar este projeto, saia da conta e preencha Project ID e Web API Key em Ajustes > Configurar conexões, usando os valores de `src/project.js`. A chave Web identifica o projeto e não substitui a autenticação ou as regras do banco.

## Site publicado

O projeto Firebase está criado e configurado, e a interface está disponível em
[https://focalizador-3d5d3.web.app](https://focalizador-3d5d3.web.app). Para
publicar uma atualização, execute `Publicar no Firebase.cmd` ou
`node scripts/publish-firebase.mjs` a partir da raiz do repositório. O processo
gera novamente a interface e publica somente o conteúdo de `web-public`.

Não existe senha ou conta pessoal embutida no código. Os registros só chegam ao
Firestore depois que o usuário cria ou acessa sua conta e solicita a
sincronização.

Na versão atual, a sincronização ocorre com o aplicativo aberto. A sessão da conta dura até fechar completamente a página/aplicativo; entre novamente quando necessário. Alarmes com a página fechada dependem da versão nativa Android.
