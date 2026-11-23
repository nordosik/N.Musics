import { S3Client } from "@aws-sdk/client-s3";

export const obsideoClient = new S3Client({
  region: process.env.NEXT_PUBLIC_OBSIDEO_REGION || "us-east-1",
  endpoint: process.env.NEXT_PUBLIC_OBSIDEO_ENDPOINT,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_OBSIDEO_ACCESS_KEY!,
    secretAccessKey: process.env.NEXT_PUBLIC_OBSIDEO_SECRET_KEY!,
  },
  forcePathStyle: true,
  // ВОТ ЭТА СТРОКА ЛЕЧИТ ОШИБКУ
  requestChecksumCalculation: "WHEN_REQUIRED",
});

export const OBSIDEO_BUCKET = process.env.NEXT_PUBLIC_OBSIDEO_BUCKET!;