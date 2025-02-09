import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage"; 
import { fetch } from "undici";
import { Readable, PassThrough, pipeline } from "stream";
import { promisify } from "util";
import path from "path";
import mime from "mime";
import { MediaConfig, UploadUrlParams } from "../types/media-type.js";

const maxFileSize = 200 * 1000 * 1000 * 1000; // 200GB
const pipelineAsync = promisify(pipeline);

export class Media {
  private s3Client: S3Client;
  private bucket: string;

  constructor(config: MediaConfig) {
    this.s3Client = new S3Client({
      region: config.s3Region,
      endpoint: config.s3Endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
    this.bucket = config.bucket;
  }

  private validateResponse(response: Response) {
    let contentLength = parseInt(response.headers.get("content-length") || "0", 10);

    if (!contentLength) {
      console.warn("Content-Length is missing. Will validate file size dynamically.");
    } else if (contentLength > maxFileSize) {
      throw new Error("File exceeds maximum size limit");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType) throw new Error("Unable to determine content type");

    const fileExt = mime.getExtension(contentType);
    if (!fileExt) throw new Error("Unsupported file type");

    const allowedMimeTypes = ["image/jpeg", "image/png", "video/mp4", "video/mkv", "application/pdf", "text/plain", "text/plain; charset=UTF-8"];
    if (!allowedMimeTypes.includes(contentType)) {
      throw new Error("Unsupported content type");
    }

    return { fileExt, contentType, contentLength };
  }

  async uploadUrl({ sourceUrl, destinationDir }: UploadUrlParams): Promise<string> {
    try {
      if (!sourceUrl || !destinationDir) {
        throw new Error("Missing required parameters: sourceUrl and destinationDir are required");
      }

      const response: any = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);

      const { fileExt, contentType, contentLength } = this.validateResponse(response);

      const fileName = `${Date.now()}.${fileExt}`;
      const s3Key = path.posix.join(destinationDir, fileName);

      if (!response.body) {
        throw new Error("Response body is null");
      }
      const nodeReadableStream = Readable.fromWeb(response.body as any);
      const passThrough = new PassThrough();
      let streamedSize = 0; 

      nodeReadableStream.on("data", (chunk: any) => {
        streamedSize += chunk.length;
        if (streamedSize > maxFileSize) {
          nodeReadableStream.destroy();
          throw new Error("File exceeds maximum size limit");
        }
      });

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: s3Key,
          Body: passThrough,
          ContentType: contentType,
        },
      });

      const uploadPromise = upload.done();

      await pipelineAsync(nodeReadableStream, passThrough);
      await uploadPromise;

      console.log(`Upload completed: ${s3Key}, Size: ${streamedSize} bytes`);
      return s3Key;
    } catch (error: any) {
      console.error("Upload failed:", error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}
