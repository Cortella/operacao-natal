import type { MusicUpload } from "@/modules/pages/actions";

const MAX_SIDE = 2000;

/**
 * Reduz a foto no próprio aparelho antes de enviar: o upload fica rápido mesmo
 * no 4G. Se o navegador não conseguir abrir o arquivo, ele segue como está e o
 * servidor decide se aceita.
 */
async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export type UploadedPhoto = { id: string; url: string; caption: string };

export async function uploadPhoto(
  pageId: string,
  file: File,
  replaceId?: string,
): Promise<UploadedPhoto> {
  const body = new FormData();
  body.set("file", await shrinkPhoto(file), "foto");
  if (replaceId) body.set("replace", replaceId);

  let response: Response;
  try {
    response = await fetch(`/api/paginas/${pageId}/fotos`, { method: "POST", body });
  } catch {
    throw new Error("Sem conexão. Confira sua internet e tente de novo.");
  }
  const json = (await response.json().catch(() => null)) as {
    photo?: UploadedPhoto;
    error?: string;
  } | null;
  if (!response.ok || !json?.photo) {
    throw new Error(json?.error ?? "Não foi possível enviar a foto. Tente de novo.");
  }
  return json.photo;
}

/** Envia o áudio direto ao storage usando a autorização emitida pelo servidor. */
export async function uploadMusicFile(upload: MusicUpload, file: File): Promise<void> {
  const body = new FormData();
  for (const [name, value] of Object.entries(upload.fields)) body.set(name, value);
  body.set("file", file);
  let response: Response;
  try {
    response = await fetch(upload.url, { method: "POST", body });
  } catch {
    throw new Error("Sem conexão. Confira sua internet e tente de novo.");
  }
  if (!response.ok) throw new Error("Não foi possível enviar a música. Tente de novo.");
}
