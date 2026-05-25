import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const immutableMediaCacheControl =
  "public, max-age=31536000, immutable";

export type ObjectStorageClient = {
  putObject: (input: {
    Bucket: string;
    Key: string;
    Body: Uint8Array;
    ContentType?: string;
    CacheControl?: string;
  }) => Promise<void>;
  deleteObject: (input: { Bucket: string; Key: string }) => Promise<void>;
};

export function createCloudflareR2ObjectClient(input: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}): ObjectStorageClient {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${input.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey,
    },
  });

  return {
    async putObject(params) {
      await client.send(new PutObjectCommand(params));
    },
    async deleteObject(params) {
      await client.send(new DeleteObjectCommand(params));
    },
  };
}
