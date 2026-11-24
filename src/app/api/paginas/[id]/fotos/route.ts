import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvalidImageError, processPhoto } from "@/lib/images";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import {
  deleteObject,
  isStorageConfigured,
  newStorageKey,
  publicUrl,
  putObject,
} from "@/integrations/storage";
import { PHOTO_MAX_BYTES } from "@/modules/pages/schema";
import { getSettings } from "@/modules/settings/service";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Envio de uma foto para a página (ou troca de uma existente, com `replace`).
 * O arquivo passa pelo servidor para ser conferido e regravado sem metadados.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/paginas/[id]/fotos">) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Sua sessão expirou. Entre de novo para continuar.");

  const { id } = await context.params;
  const page = await db.giftPage.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!page) return fail(404, "Não encontramos esta página na sua conta.");

  if (!isStorageConfigured()) {
    return fail(503, "O envio de fotos está indisponível no momento.");
  }

  // Recusa cedo requisições grandes demais, antes de ler o corpo.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > PHOTO_MAX_BYTES + 64 * 1024) {
    return fail(413, "A foto precisa ter no máximo 8 MB.");
  }

  const limit = await rateLimit(`foto:${user.id}`, 120, 10 * 60);
  if (!limit.allowed) return fail(429, retryMessage(limit.retryAfterSeconds));

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Não recebemos a foto. Tente de novo.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail(400, "Escolha uma foto para enviar.");
  if (file.size > PHOTO_MAX_BYTES) return fail(413, "A foto precisa ter no máximo 8 MB.");

  const replaceId = form.get("replace");
  const replacing =
    typeof replaceId === "string" && replaceId
      ? await db.photo.findFirst({
          where: { id: replaceId, pageId: page.id },
          select: { id: true, storageKey: true },
        })
      : null;
  if (replaceId && !replacing) return fail(404, "A foto que você quer trocar não existe mais.");

  if (!replacing) {
    const [{ pages }, count] = await Promise.all([
      getSettings(),
      db.photo.count({ where: { pageId: page.id } }),
    ]);
    if (count >= pages.maxPhotos) {
      return fail(409, `Cada página pode ter até ${pages.maxPhotos} fotos.`);
    }
  }

  let processed;
  try {
    processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof InvalidImageError) return fail(415, error.message);
    throw error;
  }

  const key = newStorageKey("fotos", processed.extension);
  await putObject(key, processed.data, processed.mimeType);

  const data = {
    storageKey: key,
    url: publicUrl(key),
    mimeType: processed.mimeType,
    sizeBytes: processed.data.length,
  };
  const select = { id: true, url: true, caption: true } as const;

  try {
    if (replacing) {
      const photo = await db.photo.update({ where: { id: replacing.id }, data, select });
      await deleteObject(replacing.storageKey).catch(() => undefined);
      return NextResponse.json({ photo });
    }
    const last = await db.photo.aggregate({
      where: { pageId: page.id },
      _max: { sortOrder: true },
    });
    const photo = await db.photo.create({
      data: { ...data, pageId: page.id, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      select,
    });
    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    // Sem registro no banco, o arquivo recém-enviado ficaria órfão.
    await deleteObject(key).catch(() => undefined);
    throw error;
  }
}
