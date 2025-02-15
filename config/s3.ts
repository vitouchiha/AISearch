// This is an expensive operation.
// rpdb recommends caching the results in S3 to avoid repeated requests.
// To keep the user from making a shit ton of requests, we should cache.
// The trade off is speed. This will also run our function longer, and runs the risk of putting us over the rate limit.


import {
    S3Client,
    HeadObjectCommand,
    PutObjectCommand,
  } from "./deps.ts";

  import { S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_KEY, S3_BUCKET_NAME } from "./env.ts";

  const s3Client = new S3Client({
    region: S3_REGION, 
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_KEY,
    },
  });
  
  const BUCKET_NAME = S3_BUCKET_NAME;
  

  export async function cacheImageCloud(imageUrl: string, cacheKey: string): Promise<string> {
    const objectKey = `${cacheKey}.jpg`;

    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      }));
      console.log("Cache hit for", objectKey);
      return `https://${BUCKET_NAME}.s3.amazonaws.com/${objectKey}`;
    } catch (error: any) {
      if (error.name !== "NotFound") {
        console.error("Error checking S3 object:", error);
        throw error;
      }
      console.log("Cache miss for", objectKey);
    }

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const imageData = new Uint8Array(await response.arrayBuffer());

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: imageData,
      ContentType: "image/jpeg",
      ACL: "public-read",
    }));
  
    console.log("Cached image in S3:", objectKey);
    return `https://${BUCKET_NAME}.s3.amazonaws.com/${objectKey}`;
  }
  