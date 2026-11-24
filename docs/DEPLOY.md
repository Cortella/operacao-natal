# Deploy em produção

O projeto foi feito para a Vercel com um PostgreSQL gerenciado e um storage compatível com S3. O deploy em si ainda não foi feito: ele depende de contas e credenciais suas.

## O que você precisa ter

| Item                                 | Para quê                       | Exemplos                                |
| ------------------------------------ | ------------------------------ | --------------------------------------- |
| Conta na Vercel                      | Hospedar a aplicação           | —                                       |
| PostgreSQL gerenciado                | Banco de dados                 | Neon, Supabase, Vercel Postgres         |
| Bucket S3                            | Fotos e músicas                | Cloudflare R2, AWS S3, Supabase Storage |
| Conta no Resend e domínio verificado | E-mail de recuperação de senha | —                                       |
| Gateway de pagamento                 | PIX e cartão                   | ver [PAGAMENTOS.md](PAGAMENTOS.md)      |
| Domínio                              | Endereço público               | —                                       |

## Passo a passo

### 1. Banco de dados

Crie o banco e copie a URL de conexão para `DATABASE_URL`. Em provedores com pool de conexões, use a URL do pool.

### 2. Storage

Crie o bucket e uma chave de acesso com permissão de leitura e escrita nele. Preencha as variáveis `S3_*` em um `.env` local apontando para o bucket de produção e rode:

```bash
npm run storage:init
```

O script libera a leitura pública dos arquivos e configura o CORS para o domínio em `APP_URL`. Se o serviço não aceitar essas configurações pela API (o script avisa), faça pelo painel dele:

- leitura pública dos objetos (ou um domínio público/CDN na frente do bucket, informado em `S3_PUBLIC_URL`);
- CORS permitindo `POST` e `GET` a partir do seu domínio.

### 3. Variáveis de ambiente na Vercel

Todas estão descritas em [.env.example](../.env.example).

| Variável                                                                                             | Valor em produção                                      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `APP_URL`                                                                                            | `https://seudominio.com`, sem barra no final           |
| `DATABASE_URL`                                                                                       | URL do banco                                           |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | Dados do bucket                                        |
| `S3_FORCE_PATH_STYLE`                                                                                | `true` apenas se o serviço exigir (R2 e S3 não exigem) |
| `RESEND_API_KEY`, `EMAIL_FROM`                                                                       | Credenciais do Resend                                  |
| `LEGAL_NAME`, `LEGAL_DOCUMENT`, `LEGAL_EMAIL`                                                        | Responsável pela plataforma                            |
| `CRON_SECRET`                                                                                        | Valor aleatório longo (`openssl rand -hex 32`)         |
| `PAYMENT_PROVIDER`, `PAYMENT_ACCESS_TOKEN`, `PAYMENT_WEBHOOK_SECRET`                                 | Do gateway escolhido                                   |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                                                      | Usados só pelo seed                                    |

**Não use `PAYMENT_PROVIDER="teste-local"` em produção.** Fora de `localhost` ele é recusado e os pagamentos ficam desabilitados.

### 4. Primeiro deploy

Importe o repositório na Vercel. O [vercel.json](../vercel.json) já define:

- o comando de build, que aplica as migrations antes de compilar (`prisma migrate deploy && next build`);
- a limpeza diária em `/api/cron/limpeza`.

### 5. Dados iniciais e administrador

Com as variáveis de produção em um `.env` local (incluindo `ADMIN_EMAIL` e `ADMIN_PASSWORD`), rode uma vez:

```bash
npm run db:seed
```

Isso cria os modelos, as músicas da biblioteca, as configurações padrão e o administrador. Rodar de novo não sobrescreve nada. Depois do primeiro login, troque a senha em `/conta`.

Para promover outra conta a administrador:

```sql
UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'pessoa@exemplo.com';
```

### 6. Domínio e webhook

1. Aponte o domínio para o projeto na Vercel e confira se `APP_URL` é exatamente esse endereço.
2. No painel do gateway, cadastre o webhook `https://seudominio.com/api/webhooks/pagamento/<nome-do-gateway>`.

### 7. Conferência final

- [ ] A landing abre e mostra o preço.
- [ ] Cadastro, login e recuperação de senha (o e-mail chega).
- [ ] Upload de foto e de música no editor.
- [ ] Um pagamento real de valor baixo publica a página e o link abre em aba anônima.
- [ ] `/privacidade` e `/termos` não mostram o aviso de documento incompleto.
- [ ] O painel em `/admin` abre com a conta de administrador.

## Outra hospedagem

Qualquer ambiente com Node.js 24 serve: `npm ci`, `npx prisma migrate deploy`, `npm run build`, `npm start`. Coloque um proxy com HTTPS na frente, que sobrescreva o cabeçalho `x-forwarded-for`, e agende uma chamada diária a `/api/cron/limpeza` com o cabeçalho `Authorization: Bearer <CRON_SECRET>`.
