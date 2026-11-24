# Oficina do Noel

Plataforma para criar e vender páginas de Natal personalizadas: o comprador monta a página com fotos, música e mensagem, paga por PIX ou cartão e recebe um link exclusivo para presentear alguém.

O plano de desenvolvimento está em [docs/ROADMAP.md](docs/ROADMAP.md), dividido em 13 steps. Cada step tem uma issue neste repositório.

**Status:** Steps 0 a 6 e 8 concluídos. O Step 7 (pagamentos) está pronto, exceto a ligação com o gateway de produção, que ainda não foi escolhido: veja [docs/PAGAMENTOS.md](docs/PAGAMENTOS.md). Faltam o painel administrativo, a revisão de segurança/LGPD e a documentação de deploy.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, PostgreSQL, Prisma 7, Zod, Vitest e Playwright.

## Rodando localmente

Requisitos: Node.js 24 e Docker.

```bash
npm install
cp .env.example .env
npm run db:up        # sobe o PostgreSQL (porta 54329) e o storage S3 local (porta 59000), e cria o bucket
npm run db:migrate   # cria as tabelas
npm run db:seed      # modelos, músicas, configurações e administrador (ADMIN_EMAIL/ADMIN_PASSWORD)
npm run dev          # http://localhost:3000
```

## Scripts

| Script                    | O que faz                                               |
| ------------------------- | ------------------------------------------------------- |
| `npm run dev`             | Servidor de desenvolvimento                             |
| `npm run build`           | Build de produção                                       |
| `npm run lint`            | ESLint                                                  |
| `npm run typecheck`       | Gera os tipos de rota e roda o TypeScript               |
| `npm test`                | Testes de unidade (Vitest)                              |
| `npm run test:e2e`        | Testes de fluxo no navegador (Playwright)               |
| `npm run format`          | Prettier                                                |
| `npm run db:up`           | Sobe PostgreSQL e storage locais (Docker)               |
| `npm run db:migrate`      | Cria e aplica migrations                                |
| `npm run db:seed`         | Popula dados iniciais                                   |
| `npm run pagamento:teste` | Confirma a cobrança pendente no gateway de testes local |
| `npm run db:studio`       | Abre o Prisma Studio                                    |

## Variáveis de ambiente

Todas estão descritas em [.env.example](.env.example) e são validadas em [src/lib/env.ts](src/lib/env.ts). O `.env.example` já vem com os valores do ambiente local (banco, storage e gateway de testes).
