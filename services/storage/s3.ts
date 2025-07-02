// services/storage/s3.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;

export const getUploadUrl = async (filename: string, fileType: string) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: filename,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  return url;
};

export const getDownloadUrl = async (filename: string) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: filename,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  return url;
};
