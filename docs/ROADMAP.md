# Roadmap — Oficina do Noel

Plataforma comercial para criar e vender páginas de Natal personalizadas (fotos, música, mensagem), publicadas em um link exclusivo após pagamento confirmado.

O trabalho está dividido em 13 steps. Cada step tem uma issue correspondente no GitHub, termina com algo executável e só é considerado concluído quando os critérios de aceite passam.

## Decisões de arquitetura

| Camada       | Escolha                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Next.js (App Router) + React + TypeScript                                                                                     |
| Estilo       | Tailwind CSS com tokens do Design System                                                                                      |
| Backend      | Route Handlers e Server Actions                                                                                               |
| Banco        | PostgreSQL + Prisma                                                                                                           |
| Autenticação | Auth.js (e-mail/senha), papéis `USER` e `ADMIN`                                                                               |
| Storage      | S3 compatível (AWS S3, Cloudflare R2 ou Supabase Storage) com URL pré-assinada                                                |
| Pagamento    | Gateway com PIX e cartão atrás de uma interface `PaymentProvider`. Sugestão: Mercado Pago. A decisão final é tomada no Step 7 |
| Validação    | Zod, com o mesmo schema no frontend e no backend                                                                              |
| Testes       | Vitest (unidade/integração) e Playwright (fluxos)                                                                             |
| Hospedagem   | Vercel + Postgres gerenciado                                                                                                  |

### Estrutura de pastas

```
src/
  app/
    (marketing)/        landing, privacidade, termos
    (auth)/             login, cadastro, recuperação de senha
    criar/              editor em etapas
    checkout/           pagamento e status
    presente/[slug]/    página pública do presente
    admin/              painel administrativo
    api/                webhooks, uploads, status de pagamento
  components/ui/        Design System
  modules/              pages, photos, music, templates, orders, payments, coupons, settings
  integrations/         payment/, storage/
  lib/                  auth, db, validação, utilidades
prisma/                 schema, migrations, seed
```

### Regras que valem para todos os steps

- Toda tela usa o Design System. Nada de aparência genérica de dashboard SaaS, inclusive no admin.
- Mobile primeiro.
- Nenhuma credencial no frontend; tudo em variáveis de ambiente.
- Nenhuma funcionalidade fictícia: o que depender de credencial externa fica implementado e documentado como "falta configurar".
- Pagamento só é aprovado por confirmação validada no backend, nunca pelo retorno à página de sucesso.

---

## Step 0 — Fundação do projeto

**Entregas**

- Projeto Next.js + TypeScript + Tailwind, ESLint e Prettier.
- Estrutura de pastas acima.
- `docker-compose` com PostgreSQL local, Prisma conectado.
- `.env.example` com todas as variáveis previstas, validadas na inicialização.
- CI no GitHub Actions: lint, typecheck, testes e build.

**Aceite:** `npm run dev` sobe a aplicação; `npm run build` e o CI passam.

## Step 1 — Design System "Oficina do Noel"

**Tokens**

```css
:root {
  --color-primary: #a01020;
  --color-primary-hover: #800c19;
  --color-wood-dark: #503020;
  --color-wood-medium: #805020;
  --color-wood-light: #a06040;
  --color-elf-green: #208050;
  --color-green-dark: #104030;
  --color-cream: #f0f0e0;
  --color-gold: #f0b040;
  --color-white: #ffffff;
  --color-text-dark: #38251b;
  --color-text-light: #fff9ef;
}
```

- Vermelho: identidade, CTAs e banners. Marrom escuro: ambientes e fundos. Madeira: texturas e superfícies. Verde: botões secundários, música e duendes. Creme: formulários, cartões e leitura. Dourado: promoções e etiquetas.
- Tipografia: Fredoka nos títulos, Nunito Sans nos textos e (em peso forte) nos preços.
- Espaçamentos, bordas e sombras centralizados.

**Entregas**

- Textura de madeira em tábuas horizontais (ilustrada, leve, em CSS/SVG) e fundos alternativos: vermelho, verde-escuro, creme e madeira clara.
- Duendes em cartoon 2D (roupa verde, gorro vermelho, detalhes amarelos) em SVG, com variações de pose.
- Componentes: `PrimaryButton`, `SecondaryButton`, botão promocional, `ChristmasCard`, `ElfCharacter`, `WoodBackground`, `ChristmasHeader`, `ChristmasFooter`, `FormInput`, `MusicPlayer`, `PhotoGallery`, `PromotionBanner`, `LoadingAnimation`, `SuccessMessage`, `ErrorMessage`.
- Botões com os estados normal, hover, active, disabled e loading.
- Animações: entrada de elementos, neve, movimento dos duendes, transições, microinterações. Todas respeitam `prefers-reduced-motion`.
- Página interna `/design-system` com todos os componentes.

**Aceite:** a vitrine mostra todos os componentes e estados em celular e desktop; contraste de texto legível sobre todos os fundos.

## Step 2 — Banco de dados

**Entidades:** `User` (com papel), `GiftPage`, `Photo`, `Music`, `Template`, `Message`, `Order`, `Payment`, `Coupon`, `Setting`.

**Entregas**

- Schema Prisma e migrations.
- `GiftPage` com id único, slug público único, status (`DRAFT`, `PENDING_PAYMENT`, `PUBLISHED`, `DISABLED`, `EXPIRED`) e data de expiração.
- Relações página → comprador → pedido → pagamentos.
- `Payment` guarda o histórico de eventos do gateway.
- Seed: administrador inicial, modelos, músicas da plataforma, preço de R$ 19,90 e textos padrão da landing.

**Aceite:** `prisma migrate` e `prisma db seed` rodam do zero sem erro.

## Step 3 — Autenticação e controle de acesso

**Entregas**

- Cadastro, login, logout e recuperação de senha.
- Senhas com hash forte; sessão em cookie `httpOnly`.
- Middleware protegendo `/criar`, `/checkout`, `/minhas-paginas` e `/admin`.
- Verificação de papel e de dono do recurso em todas as rotas e actions.
- Rate limit em login e cadastro.

**Aceite:** usuário comum não acessa `/admin` nem páginas de outro usuário, nem pela API.

## Step 4 — Landing page

**Entregas**

- Banner principal, título, subtítulo e CTA "Criar minha página de Natal".
- Demonstração visual de uma página personalizada.
- Como funciona, exemplos, recursos, preço em destaque, FAQ e chamada final.
- Preço, promoção e prazo da oferta lidos das configurações (com contagem regressiva quando houver validade).
- Textos editáveis pelo admin.
- SEO e Open Graph.

**Aceite:** alterar preço ou texto nas configurações reflete na landing; boa nota de performance no celular.

## Step 5 — Editor de páginas

**Etapas**

1. Informações básicas: quem cria, quem recebe, título, mensagem principal, introdução.
2. Fotos: upload, pré-visualização, remover, substituir, reordenar.
3. Música: escolher da biblioteca ou enviar a própria (com declaração de direitos autorais), área "Nossa música".
4. Mensagem especial em cartão natalino.
5. Modelo visual: cores, animações, layout de fotos, estilo das mensagens e decoração.
6. Pré-visualização fiel à página final, com retorno a qualquer etapa.
7. Finalização (leva ao checkout).

**Entregas**

- Indicador de progresso e navegação entre etapas.
- Rascunho salvo automaticamente no banco; "continuar depois" em `/minhas-paginas`.
- Pré-visualização em tempo real.
- Upload por URL pré-assinada, com validação de tipo, tamanho e quantidade no frontend e no backend.
- Mensagens claras de erro e sucesso.

**Aceite:** criar um rascunho no celular, fechar o navegador, voltar e continuar de onde parou.

## Step 6 — Página pública do presente

**Entregas**

- Rota `/presente/[slug]`, independente do painel.
- Animação de abertura do presente, cenário natalino, duendes, cartão central com o nome de quem recebe, mensagem especial, galeria animada e player de música.
- Música só toca após interação do usuário (política de autoplay dos navegadores).
- Renderização por modelo (templates reutilizáveis).
- Só responde para páginas publicadas e não expiradas; os demais estados mostram uma tela amigável.
- Open Graph para o link ficar bonito no WhatsApp.

**Aceite:** a página pública é idêntica à pré-visualização do editor; rascunho e página desativada não abrem pelo link.

## Step 7 — Pagamentos

**Entregas**

- Interface `PaymentProvider` e implementação do gateway escolhido.
- Checkout com valor, cupom, PIX (QR code e copia-e-cola) e cartão de crédito.
- Criação da cobrança no backend, com o valor calculado no servidor.
- Webhook com validação de assinatura, idempotência e reconsulta do pagamento no gateway antes de aprovar.
- Tela de status que consulta o backend.
- Histórico de transações por pedido.

**Aceite:** em sandbox, PIX e cartão aprovados publicam a página; acessar a URL de sucesso sem pagamento não publica nada; webhook com assinatura inválida é rejeitado.

**Depende de:** credenciais do gateway (sandbox e produção).

## Step 8 — Publicação e compartilhamento

**Entregas**

- Após pagamento confirmado: gerar o slug (ex.: `joao-e-maria`, com tratamento de colisão), publicar e exibir o link.
- Página de sucesso com duende, botão de copiar link e botão de WhatsApp.
- `/minhas-paginas`: listar, editar depois de publicada, despublicar.
- Expiração configurável, aplicada automaticamente.

**Aceite:** o link funciona em aba anônima logo após a confirmação do pagamento.

## Step 9 — Painel administrativo

**Entregas**

- Dashboard: páginas criadas, vendas, faturamento, pagamentos pendentes e aprovados, páginas publicadas.
- Páginas: listar, pesquisar por nome, ver comprador, destinatário e status, editar, desativar e excluir (respeitando retenção).
- Comercial: preço, promoções, validade de ofertas, transações e cupons.
- Conteúdo: músicas autorizadas, modelos, elementos visuais e textos da landing.
- Visual da Oficina do Noel, organizado para desktop.

**Aceite:** todos os números do dashboard conferem com o banco; toda rota do admin exige papel `ADMIN`.

## Step 10 — Segurança, privacidade e LGPD

**Entregas**

- Revisão de validação (Zod) em todas as entradas.
- Validação real do conteúdo dos arquivos enviados, limites de tamanho e rate limit nos endpoints sensíveis.
- Cabeçalhos de segurança e CSP.
- Política de privacidade e termos de uso; consentimento no cadastro.
- Exportação e exclusão de dados pelo titular; regras de retenção.
- Logs sem dados pessoais desnecessários.

**Aceite:** checklist de segurança revisado item a item, sem pendência crítica.

## Step 11 — Testes dos fluxos principais

**Entregas**

- Unidade: cálculo de preço e cupom, geração de slug, validação de webhook, regras de publicação e expiração.
- Integração: webhook de pagamento e permissões.
- E2E (Playwright, com viewport de celular): cadastro → editor → checkout em sandbox → página publicada → compartilhar; e fluxo do admin.

**Aceite:** suíte verde no CI.

## Step 12 — Documentação e deploy

**Entregas**

- README com instalação, variáveis de ambiente, migrations e seed.
- Guias: configurar o gateway e o webhook, configurar o storage, criar o primeiro administrador.
- Deploy na Vercel com banco gerenciado e domínio.
- Lista explícita do que depende de credenciais externas.

**Aceite:** uma pessoa segue o README em uma máquina limpa e chega ao fluxo completo.

---

## Ordem e dependências

```
0 → 1 → 2 → 3 → 4
              ├→ 5 → 6 → 7 → 8
              └→ 9 (após 7)
10, 11 e 12 fecham o projeto; 10 e 11 também são aplicados ao longo dos steps.
```

## O que precisa vir de fora

- Vídeo de referência do anúncio (ou capturas de tela), para garantir fidelidade visual no Step 1.
- Conta e credenciais do gateway de pagamento.
- Bucket de storage e credenciais.
- Músicas licenciadas para a biblioteca da plataforma.
- Domínio.
