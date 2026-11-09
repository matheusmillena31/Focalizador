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

## O que ainda falta para o celular

O projeto Firebase está criado e configurado. O site ainda não foi publicado e não há link de aplicativo disponível no celular. O próximo passo é publicar somente a interface no Firebase Hosting, para usar o mesmo endereço e a mesma conta nos dois dispositivos. Não foi criada senha nem conta de aplicativo em seu nome, e seus registros pessoais ainda não foram enviados ao banco por este processo de configuração.

Na versão atual, a sincronização ocorre com o aplicativo aberto. A sessão da conta dura até fechar completamente a página/aplicativo; entre novamente quando necessário. Alarmes com a página fechada dependem da versão nativa Android.
