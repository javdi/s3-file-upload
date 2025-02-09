interface MediaConfig {
  s3Endpoint: string;
  s3Region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

interface UploadUrlParams {
  sourceUrl: string;
  destinationDir: string
}

export {
    MediaConfig,
    UploadUrlParams
}