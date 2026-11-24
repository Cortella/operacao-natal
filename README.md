# Oficina do Noel

Plataforma para criar e vender páginas de Natal personalizadas: o comprador monta a página com fotos, música e mensagem, paga por PIX ou cartão e recebe um link exclusivo para presentear alguém.

O plano de desenvolvimento está em [docs/ROADMAP.md](docs/ROADMAP.md), dividido em 13 steps. Cada step tem uma issue neste repositório.

**Status:** Steps 0 a 5 concluídos (fundação, Design System, banco de dados, autenticação, landing page e editor). A vitrine dos componentes fica em `/design-system`.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, PostgreSQL, Prisma 7, Zod, Vitest e Playwright.

## Rodando localmente

Requisitos: Node.js 24 e Docker.

```bash
npm install
cp .env.example .env
npm run db:up        # sobe o PostgreSQL (porta 54329) e o storage MinIO (porta 59000)
npm run db:migrate   # cria as tabelas
npm run db:seed      # modelos, músicas, configurações e administrador (ADMIN_EMAIL/ADMIN_PASSWORD)
npm run dev          # http://localhost:3000
```

## Scripts

| Script               | O que faz                                 |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento               |
| `npm run build`      | Build de produção                         |
| `npm run lint`       | ESLint                                    |
| `npm run typecheck`  | Gera os tipos de rota e roda o TypeScript |
| `npm test`           | Testes de unidade (Vitest)                |
| `npm run test:e2e`   | Testes de fluxo no navegador (Playwright) |
| `npm run format`     | Prettier                                  |
| `npm run db:up`      | Sobe PostgreSQL e storage locais (Docker) |
| `npm run db:migrate` | Cria e aplica migrations                  |
| `npm run db:seed`    | Popula dados iniciais                     |
| `npm run db:studio`  | Abre o Prisma Studio                      |

## Variáveis de ambiente

Todas estão descritas em [.env.example](.env.example) e são validadas em [src/lib/env.ts](src/lib/env.ts). Storage e gateway de pagamento ficam vazios até os steps 5 e 7.
