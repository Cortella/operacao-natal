// Prepara o bucket do storage: cria se não existir, libera a leitura pública dos
// arquivos (os endereços são aleatórios) e permite o envio direto pelo navegador.
// Usa as variáveis S3_* do .env. Uso: node scripts/storage-init.mjs
import "dotenv/config";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error("Defina S3_BUCKET, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY no .env.");
  process.exit(1);
}

const client = new S3Client({
  region: S3_REGION || "auto",
  endpoint: S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
});

const origin = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

async function waitUntilReady() {
  for (let attempt = 1; ; attempt++) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
      return true;
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;
      if (status === 404) return false;
      if (status && status !== 503) throw error;
      if (attempt >= 30) throw new Error("O storage não respondeu a tempo.");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/** Alguns serviços não oferecem uma das configurações; o aviso explica o que fazer. */
async function optional(label, command) {
  try {
    await client.send(command);
    console.log(`${label}: ok`);
  } catch (error) {
    console.warn(`${label}: não aplicado (${error.name}). Configure pelo painel do serviço.`);
  }
}

if (await waitUntilReady()) {
  console.log(`Bucket "${S3_BUCKET}" já existe.`);
} else {
  await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
  console.log(`Bucket "${S3_BUCKET}" criado.`);
}

await optional(
  "Leitura pública",
  new PutBucketPolicyCommand({
    Bucket: S3_BUCKET,
    Policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "LeituraPublica",
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${S3_BUCKET}/*`],
        },
      ],
    }),
  }),
);

await optional(
  `CORS para ${origin}`,
  new PutBucketCorsCommand({
    Bucket: S3_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [origin, "http://localhost:3000", "http://localhost:3100"],
          AllowedMethods: ["GET", "POST"],
          AllowedHeaders: ["*"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);
