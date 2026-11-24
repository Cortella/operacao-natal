# Oficina do Noel

Plataforma para criar e vender páginas de Natal personalizadas: o comprador monta a página com fotos, música e mensagem, paga e recebe um link exclusivo para presentear alguém.

## Situação

O sistema está implementado e coberto por testes, com três pendências antes de vender:

| Pendência                                                 | Detalhes                                 |
| --------------------------------------------------------- | ---------------------------------------- |
| Integrar o gateway de pagamento de produção               | [docs/PAGAMENTOS.md](docs/PAGAMENTOS.md) |
| Fazer o deploy e configurar e-mail, storage e domínio     | [docs/DEPLOY.md](docs/DEPLOY.md)         |
| Revisão jurídica dos textos legais e dados do responsável | [docs/SEGURANCA.md](docs/SEGURANCA.md)   |

O plano original, em 13 steps, está em [docs/ROADMAP.md](docs/ROADMAP.md).

## O que existe

- **Landing page** com preço, promoção com contagem regressiva e textos editáveis pelo painel.
- **Conta**: cadastro, login, recuperação e troca de senha, exportação e exclusão dos dados.
- **Editor em 7 etapas** com salvamento automático, prévia em tempo real e retomada do rascunho.
- **Página do presente** em `/presente/<slug>`, com capa de abertura, galeria e música.
- **Checkout** com PIX, cupom, webhook assinado e publicação automática após a confirmação.
- **Compartilhamento** por link e WhatsApp; o dono pode editar, tirar do ar ou excluir a página.
- **Painel administrativo** em `/admin`: indicadores, páginas, vendas, preço, cupons, músicas, modelos e textos.
- **Design System "Oficina do Noel"** compartilhado por todas as telas, com vitrine em `/design-system`.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, PostgreSQL, Prisma 7, Zod, storage compatível com S3, Vitest e Playwright.

## Rodando localmente

Requisitos: Node.js 24 e Docker.

```bash
npm install
cp .env.example .env    # defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo de 10 caracteres)
npm run db:up           # PostgreSQL (porta 54329) e storage S3 local (porta 59000), e cria o bucket
npm run db:migrate      # cria as tabelas
npm run db:seed         # modelos, músicas, configurações e administrador
npm run dev             # http://localhost:3000
```

O `.env.example` já vem com os valores do ambiente local, inclusive um gateway de testes que não cobra ninguém. Para concluir uma compra de teste, gere o PIX no checkout e rode:

```bash
npm run pagamento:teste
```

## Scripts

| Script                        | O que faz                                                       |
| ----------------------------- | --------------------------------------------------------------- |
| `npm run dev`                 | Servidor de desenvolvimento                                     |
| `npm run build` / `npm start` | Build e servidor de produção                                    |
| `npm run lint`                | ESLint                                                          |
| `npm run typecheck`           | Gera os tipos de rota e roda o TypeScript                       |
| `npm test`                    | Testes de unidade (Vitest)                                      |
| `npm run test:e2e`            | Testes de fluxo no navegador (Playwright), em celular e desktop |
| `npm run format`              | Prettier                                                        |
| `npm run db:up`               | Sobe PostgreSQL e storage locais e cria o bucket                |
| `npm run db:migrate`          | Cria e aplica migrations                                        |
| `npm run db:seed`             | Popula dados iniciais                                           |
| `npm run db:studio`           | Abre o Prisma Studio                                            |
| `npm run storage:init`        | Cria o bucket e configura leitura pública e CORS                |
| `npm run pagamento:teste`     | Confirma a cobrança pendente no gateway de testes local         |

Os testes de fluxo precisam do banco e do storage no ar (`npm run db:up`) e usam o Chrome instalado na máquina.

## Estrutura

```
src/
  app/
    (marketing)/       landing, privacidade, termos
    (auth)/            entrar, cadastro, recuperação de senha
    criar/             editor
    checkout/          pagamento e página de sucesso
    presente/[slug]/   página pública do presente
    minhas-paginas/    páginas do comprador
    conta/             dados da conta (LGPD)
    admin/             painel administrativo
    api/               upload de fotos, webhook, exportação, limpeza
  components/ui/       Design System
  components/          telas por área (editor, gift, checkout, admin…)
  modules/             regras de negócio por domínio
  integrations/        storage, pagamento, e-mail
  lib/                 autenticação, banco, validação de arquivos, limites
prisma/                schema, migrations e seed
e2e/                   testes de fluxo
docs/                  roadmap, pagamentos, segurança e deploy
```

## Documentação

- [docs/PAGAMENTOS.md](docs/PAGAMENTOS.md): situação dos pagamentos e como integrar o gateway.
- [docs/DEPLOY.md](docs/DEPLOY.md): passo a passo de produção.
- [docs/SEGURANCA.md](docs/SEGURANCA.md): o que está protegido, onde, e os limites conhecidos.
- [docs/ROADMAP.md](docs/ROADMAP.md): plano original.
