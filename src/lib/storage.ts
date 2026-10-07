import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ImageRef } from "@/db/schema";

const globalForS3 = globalThis as unknown as { s3?: S3Client };

function env(name: string, ...fallbacks: string[]) {
  for (const key of [name, ...fallbacks]) {
    const v = process.env[key];
    if (v) return v;
  }
  return undefined;
}

export function bucketName() {
  const b = env("S3_BUCKET", "BUCKET");
  if (!b) throw new Error("S3_BUCKET ist nicht gesetzt");
  return b;
}

export function s3() {
  if (!globalForS3.s3) {
    const accessKeyId = env("S3_ACCESS_KEY_ID", "ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID");
    const secretAccessKey = env("S3_SECRET_ACCESS_KEY", "SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY");
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("S3-Zugangsdaten fehlen (S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY)");
    }
    globalForS3.s3 = new S3Client({
      endpoint: env("S3_ENDPOINT", "ENDPOINT", "AWS_ENDPOINT_URL"),
      region: env("S3_REGION", "REGION", "AWS_REGION") ?? "auto",
      forcePathStyle: env("S3_FORCE_PATH_STYLE") === "true",
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return globalForS3.s3;
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );
}

export async function getObject(key: string) {
  return s3().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
}

export async function deleteObjects(keys: string[]) {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return;
  try {
    for (let i = 0; i < unique.length; i += 1000) {
      await s3().send(
        new DeleteObjectsCommand({
          Bucket: bucketName(),
          Delete: { Objects: unique.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  } catch (err) {
    console.error("[storage] Löschen fehlgeschlagen", err);
  }
}

export function imageKeys(images: ImageRef[] | null | undefined) {
  return (images ?? []).flatMap((i) => [i.key, i.thumb]);
}

/** Deletes objects that were attached before but are no longer referenced. */
export async function deleteRemovedImages(before: ImageRef[], after: ImageRef[]) {
  const keep = new Set(imageKeys(after));
  await deleteObjects(imageKeys(before).filter((k) => !keep.has(k)));
}
