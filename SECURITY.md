# Segurança

## Relatar uma vulnerabilidade

Não publique credenciais, dados pessoais ou uma exploração funcional em uma
issue pública. Entre em contato diretamente com o responsável pelo repositório
e inclua os passos de reprodução, o impacto esperado e a versão afetada.

## Configuração Firebase

O `Project ID` e a Web API Key em `src/project.js` identificam o aplicativo Web
e não são credenciais administrativas. A proteção dos dados depende da
autenticação e das regras em `firebase/firestore.rules`. Nunca adicione ao
repositório contas de serviço, chaves privadas, arquivos de assinatura Android,
senhas ou segredos OAuth.

O projeto é pessoal. Antes de ampliar o acesso, revise cotas, criação de contas,
App Check e restrições adequadas no Firebase e no Google Cloud.

