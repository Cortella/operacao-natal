import "server-only";
import { randomBytes } from "node:crypto";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { env } from "@/lib/env";

/**
 * Storage de arquivos em qualquer serviço compatível com S3 (AWS S3, Cloudflare R2,
 * Supabase Storage e similares). As credenciais ficam só no servidor.
 */

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Storage não configurado: defina as variáveis S3_* no ambiente.");
  }
}

type Config = { client: S3Client; bucket: string; publicUrl: string };

let cached: Config | undefined;

function config(): Config {
  if (cached) return cached;
  const e = env();
  if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY || !e.S3_PUBLIC_URL) {
    throw new StorageNotConfiguredError();
  }
  cached = {
    bucket: e.S3_BUCKET,
    publicUrl: e.S3_PUBLIC_URL.replace(/\/+$/, ""),
    client: new S3Client({
      region: e.S3_REGION ?? "auto",
      endpoint: e.S3_ENDPOINT,
      forcePathStyle: e.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY },
    }),
  };
  return cached;
}

export function isStorageConfigured(): boolean {
  const e = env();
  return Boolean(e.S3_BUCKET && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY && e.S3_PUBLIC_URL);
}

/**
 * Chave com 128 bits aleatórios: o endereço público não pode ser adivinhado
 * a partir do id da página ou do usuário.
 */
export function newStorageKey(folder: "fotos" | "musicas", extension: string): string {
  return `${folder}/${randomBytes(16).toString("hex")}.${extension}`;
}

export function publicUrl(key: string): string {
  return `${config().publicUrl}/${key}`;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { client, bucket } = config();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const { client, bucket } = config();
  for (let i = 0; i < keys.length; i += 1000) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}

/** Tamanho e tipo de um objeto já enviado, ou null se não existe. */
export async function headObject(
  key: string,
): Promise<{ size: number; contentType: string } | null> {
  const { client, bucket } = config();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? "" };
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw error;
  }
}

/** Primeiros bytes de um objeto, para conferir o formato real do arquivo. */
export async function readObjectStart(key: string, length: number): Promise<Buffer> {
  const { client, bucket } = config();
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=0-${length - 1}` }),
  );
  const bytes = await response.Body?.transformToByteArray();
  return Buffer.from(bytes ?? []);
}

/**
 * Autorização para o navegador enviar um arquivo direto ao storage.
 * A política assinada fixa a chave, o tipo e o tamanho máximo; o storage recusa
 * qualquer envio fora disso.
 */
export async function createUpload(options: {
  key: string;
  contentType: string;
  maxBytes: number;
  expiresSeconds?: number;
}): Promise<{ url: string; fields: Record<string, string> }> {
  const { client, bucket } = config();
  return createPresignedPost(client, {
    Bucket: bucket,
    Key: options.key,
    Expires: options.expiresSeconds ?? 300,
    Fields: { "Content-Type": options.contentType },
    Conditions: [
      ["content-length-range", 1, options.maxBytes],
      ["eq", "$Content-Type", options.contentType],
    ],
  });
}
