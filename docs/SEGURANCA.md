# Segurança e privacidade

Checklist do que está implementado, com o local no código, e do que ainda depende de decisão ou configuração.

## Implementado

### Contas e sessões

| Item                                                                                                | Onde                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Senhas com scrypt e sal por usuário; parâmetros gravados junto do hash                              | [src/lib/password.ts](../src/lib/password.ts)                                                              |
| Sessão em cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção; só o hash do token fica no banco | [src/lib/auth.ts](../src/lib/auth.ts), [sessions.ts](../src/modules/auth/sessions.ts)                      |
| Troca ou redefinição de senha encerra as outras sessões                                             | [account/actions.ts](../src/modules/account/actions.ts), [auth/actions.ts](../src/modules/auth/actions.ts) |
| Link de redefinição de uso único, válido por 1 hora                                                 | [auth/actions.ts](../src/modules/auth/actions.ts)                                                          |
| Login e recuperação não revelam se o e-mail tem conta                                               | [auth/actions.ts](../src/modules/auth/actions.ts)                                                          |
| Destino pós-login restrito a caminhos internos                                                      | [auth/constants.ts](../src/modules/auth/constants.ts)                                                      |
| Limite de tentativas gravado no banco (login, cadastro, senha, uploads, checkout)                   | [src/lib/rate-limit.ts](../src/lib/rate-limit.ts)                                                          |

### Permissões

| Item                                                                        | Onde                                                |
| --------------------------------------------------------------------------- | --------------------------------------------------- |
| Proxy barra visitantes sem cookie nas áreas restritas                       | [src/proxy.ts](../src/proxy.ts)                     |
| Sessão e papel conferidos no servidor em cada página, action e rota         | `requireUser`, `requireAdmin`, `ownedPage`          |
| Toda ação sobre uma página confere se ela pertence a quem pediu             | [pages/actions.ts](../src/modules/pages/actions.ts) |
| Página de outra conta responde como inexistente                             | editor, checkout e upload                           |
| Página bloqueada pela administração não pode ser recolocada no ar pelo dono | `blockedByAdmin`                                    |

### Dados de entrada e arquivos

| Item                                                                                                                                    | Onde                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Validação com Zod no servidor, com os mesmos limites do formulário                                                                      | `schema.ts` de cada módulo                                                                              |
| Fotos: formato conferido pelos bytes, regravadas em WebP, sem metadados (EXIF/GPS), com limite de tamanho, de dimensões e de quantidade | [src/lib/images.ts](../src/lib/images.ts), [rota de upload](../src/app/api/paginas/[id]/fotos/route.ts) |
| Músicas: tipo e tamanho fixados na política assinada do storage; conteúdo conferido antes de ativar                                     | [pages/actions.ts](../src/modules/pages/actions.ts)                                                     |
| Arquivos em endereços aleatórios de 128 bits                                                                                            | [storage](../src/integrations/storage/index.ts)                                                         |
| Textos dos usuários são exibidos como texto, nunca como HTML                                                                            | componentes React                                                                                       |

### Pagamentos

Ver [PAGAMENTOS.md](PAGAMENTOS.md): valor calculado no servidor, webhook com assinatura e idempotência, nova consulta ao gateway com conferência do valor, e nenhuma aprovação pelo retorno à página de sucesso.

### Navegador

| Item                                                                                                       | Onde                                |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS | [next.config.ts](../next.config.ts) |
| Credenciais apenas em variáveis de ambiente do servidor; módulos sensíveis marcados com `server-only`      | [src/lib/env.ts](../src/lib/env.ts) |
| Páginas de presente e áreas restritas fora dos buscadores                                                  | `robots` nas páginas                |

### LGPD

| Item                                                                                     | Onde                                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Política de privacidade e termos de uso                                                  | `/privacidade`, `/termos`                               |
| Aceite registrado com data no cadastro                                                   | `User.acceptedTermsAt`                                  |
| Titular baixa seus dados                                                                 | `/conta` → `/api/conta/exportar`                        |
| Titular exclui uma página ou a conta inteira                                             | `/minhas-paginas`, `/conta`                             |
| Exclusão apaga páginas, fotos, músicas e sessões; pedidos são mantidos sem identificação | [account/service.ts](../src/modules/account/service.ts) |
| Limpeza diária de sessões, tokens e envios abandonados                                   | `/api/cron/limpeza`                                     |
| Único cookie é o de sessão (estritamente necessário)                                     | —                                                       |
| Dados de cartão não passam pelos servidores da plataforma                                | interface do gateway                                    |

## Pendências e limites conhecidos

Nenhum item abaixo impede o uso em desenvolvimento. Os três primeiros precisam ser resolvidos antes de vender.

1. **Gateway de produção não integrado.** Ver [PAGAMENTOS.md](PAGAMENTOS.md).
2. **Textos legais precisam de revisão jurídica.** A política e os termos foram escritos para refletir o que o sistema faz, mas não substituem a análise de um advogado. As variáveis `LEGAL_NAME`, `LEGAL_DOCUMENT` e `LEGAL_EMAIL` precisam ser preenchidas; sem elas as páginas mostram um aviso de documento incompleto.
3. **E-mail transacional não configurado.** Sem `RESEND_API_KEY` e `EMAIL_FROM`, a recuperação de senha não envia e-mail em produção.
4. **Cadastro não confirma o e-mail.** Alguém pode criar conta com o e-mail de outra pessoa (sem conseguir acessar a caixa dela). O limite de cadastros por IP reduz o abuso.
5. **A CSP permite scripts e estilos inline.** É a condição para as páginas serem pré-renderizadas; uma política com nonce tornaria todas as páginas dinâmicas.
6. **Página de presente inexistente responde com status 200.** O visitante vê "Não encontramos esta página" e a resposta leva `noindex`, mas o código HTTP não é 404, porque a resposta é transmitida aos poucos.
7. **O limite por IP confia no cabeçalho `x-forwarded-for`.** É correto atrás da Vercel ou de um proxy que sobrescreve esse cabeçalho; em hospedagem própria, configure o proxy para isso.
8. **Direitos autorais de músicas enviadas dependem da declaração do comprador.** Não há verificação automática. A administração pode desativar a página; não há ainda uma tela para listar músicas enviadas por compradores.
9. **Arquivos enviados não passam por antivírus.** As fotos são regravadas do zero, o que neutraliza conteúdo embutido; os áudios são apenas conferidos pelo formato.
10. **Backups e retenção fiscal** dependem do provedor do banco e da orientação contábil; não há rotina de backup no código.
