import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { deleteObjects } from "@/integrations/storage";

/** Tudo o que a plataforma guarda sobre a pessoa, em formato legível (LGPD, art. 18). */
export async function exportUserData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      createdAt: true,
      acceptedTermsAt: true,
      pages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          slug: true,
          status: true,
          senderName: true,
          recipientName: true,
          title: true,
          introText: true,
          mainMessage: true,
          createdAt: true,
          publishedAt: true,
          expiresAt: true,
          template: { select: { name: true } },
          music: { select: { title: true, artist: true } },
          messages: { select: { content: true, signature: true } },
          photos: { orderBy: { sortOrder: "asc" }, select: { url: true, caption: true } },
        },
      },
      orders: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          priceCents: true,
          discountCents: true,
          totalCents: true,
          createdAt: true,
          paidAt: true,
          payments: {
            select: { method: true, status: true, amountCents: true, createdAt: true },
          },
        },
      },
      musics: { select: { title: true, url: true, createdAt: true, rightsDeclaredAt: true } },
    },
  });
  if (!user) return null;
  return { exportadoEm: new Date().toISOString(), conta: user };
}

async function removeFiles(keys: string[]) {
  await deleteObjects(keys).catch((error) =>
    console.error("[conta] Falha ao apagar arquivos do storage.", error),
  );
}

/** Exclui uma página do próprio usuário, com as fotos. Pedidos pagos são mantidos. */
export async function deleteOwnedPage(pageId: string, ownerId: string): Promise<boolean> {
  const page = await db.giftPage.findFirst({
    where: { id: pageId, ownerId },
    select: { id: true, photos: { select: { storageKey: true } } },
  });
  if (!page) return false;
  await db.giftPage.delete({ where: { id: page.id } });
  await removeFiles(page.photos.map((photo) => photo.storageKey));
  return true;
}

/**
 * Exclusão da conta a pedido do titular.
 *
 * Páginas, fotos, mensagens, músicas enviadas e sessões são apagadas. Se houver
 * pedidos, o cadastro é anonimizado em vez de removido: os registros financeiros
 * precisam ser guardados (obrigação legal), mas deixam de identificar a pessoa.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const [photos, musics, orders] = await Promise.all([
    db.photo.findMany({ where: { page: { ownerId: userId } }, select: { storageKey: true } }),
    db.music.findMany({ where: { ownerId: userId }, select: { storageKey: true } }),
    db.order.count({ where: { userId } }),
  ]);
  const keys = [
    ...photos.map((photo) => photo.storageKey),
    ...musics.flatMap((music) => (music.storageKey ? [music.storageKey] : [])),
  ];

  await db.$transaction(async (tx) => {
    await tx.giftPage.deleteMany({ where: { ownerId: userId } });
    await tx.music.deleteMany({ where: { ownerId: userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    if (orders === 0) {
      await tx.user.delete({ where: { id: userId } });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: "Conta excluída",
          email: `excluida-${userId}@anonimo.invalid`,
          // Hash aleatório: ninguém consegue entrar nesta conta de novo.
          passwordHash: `excluida$${randomBytes(24).toString("hex")}`,
          role: "USER",
        },
      });
    }
  });
  await removeFiles(keys);
}
