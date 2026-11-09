# Revisão do Focalizador — 7 de novembro de 2026

## Resultado

O site publicado foi acessado em https://focalizador-3d5d3.web.app pelo navegador integrado. As cinco telas foram navegadas em modo local, sem entrar em conta ou alterar registros reais. Nessa visita, a agenda publicada ainda exibia compromissos individuais: o agrupamento por horas e o fundo azul do dia atual do pacote anterior ainda não estavam presentes.

As correções abaixo estão nos arquivos locais deste pacote. Não foi feita publicação.

| Achado e evidência | Impacto | Correção |
| --- | --- | --- |
| Entrar → Esqueci a senha, com e-mail vazio: nenhum aviso visível no formulário publicado. O aviso era colocado atrás da janela modal. | Usuário não sabe o que precisa preencher; também afeta mensagens de outras ações em formulários. | Mensagens também aparecem numa área de status dentro da janela, anunciada por leitores de tela. |
| Em 768 px, rótulos da navegação são ocultados e os ícones têm aria-hidden. | Botões ficam sem nome para tecnologias assistivas. | Nome acessível explícito e título em cada botão de navegação. |
| Textos de apoio claros em fundo branco e campos pequenos no celular. | Leitura difícil; campos podem provocar ampliação automática no navegador móvel. | Contraste reforçado nos textos de apoio/formulários e fonte de 16 px nos campos comuns no celular. |
| Resumo semanal com gráfico posicionado ao lado do total em telas de 320 px. | Valores maiores disputam espaço com o gráfico. | Em até 420 px o gráfico fica abaixo do total, dentro do mesmo cartão. |
| Tempo do indicador Foco hoje quebrava entre horas e minutos em 320 px. | Leitura fragmentada do valor. | Espaçamento ajustado e duração mantida na mesma linha. |
| Histórico/distribuição sem regra para nomes extensos. | Risco de texto invadir valores ou ampliar a página. | Quebra de texto nos nomes e verificação com atividade de nome longo. |

## Cobertura efetivamente verificada

- Publicado: navegação por Hoje, Atividades, Agenda mensal, Progresso e Ajustes; entrada e validação de recuperação sem e-mail. Consulta sem autenticação, sem envio de recuperação ou criação de conta.
- Prévia local em Chrome: cinco telas em 1440, 768, 390 e 320 px; estados vazios e sem transbordamento horizontal.
- Formulários locais inspecionados: entrada, criação de conta, conexões, novo compromisso, horários livres, prioridades/metas e prévia de rotina. Interação por Tab e fechamento por Escape no editor de atividade.
- Jornada local com dados descartáveis: atividades iniciais → disponibilidade de segunda a sexta → geração de rotina de semana futura → confirmação → expansão de tarefa → edição de compromisso → reabertura e conferência dos dados na data planejada.
- Hoje, Atividades e Progresso com atividade/histórico de nome longo em 1440, 390 e 320 px.
- Mensagem de recuperação sem e-mail visível dentro do formulário. Sem chamadas de autenticação ou e-mails reais.
- 50 testes automatizados aprovados, incluindo regressão do aviso dentro do modal nos fluxos modular e HTML independente. Nenhum erro de JavaScript no roteiro do navegador.

As capturas de formulário e celular foram inspecionadas visualmente. A navegação e os testes locais usam dados sintéticos, sem copiar dados de contas reais.

## Limites e próximos passos

Não foram verificados nesta revisão login real, sincronização de contas, conflitos reais entre dispositivos, permissões/sons reais, envio ao Google Agenda, recuperação de senha por e-mail ou aplicativos nativos. A estrutura, as regras de planejamento e o modelo dos registros foram preservados.

Para aplicar as correções ao mesmo endereço, extraia o pacote e execute **Publicar no Firebase.cmd**. Após a mensagem de sucesso, atualize a página no computador e no celular. O pacote inclui a agenda por horas entregue anteriormente.
