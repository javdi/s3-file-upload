import express from "express";
import { Media } from "./services/media.js";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import yaml from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const NODE_ENV = process.env.NODE_ENV || "local";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const mediaUploader = new Media({
  s3Endpoint: process.env.S3_ENDPOINT as string,
  s3Region: process.env.S3_REGION as string,
  bucket: process.env.S3_BUCKET as string,
  accessKeyId: process.env.S3_ACCESS_KEY as string,
  secretAccessKey: process.env.S3_SECRET_KEY as string,
});


// Load Swagger YAML file
const swaggerDocument = yaml.load(path.join(__dirname, "../src/swagger.yml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.post("/upload-url", async (req: any, res: any) => {
  try {
    const { sourceUrl, destinationDir } = req.body;
    if (!sourceUrl || !destinationDir) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const filePath = await mediaUploader.uploadUrl({ sourceUrl, destinationDir });
    res.status(200).json( { success: true, message: "File uploaded successfully", filePath: `${filePath}`});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (NODE_ENV === "local") {
    console.log(`Access the Swagger UI at http://localhost:${PORT}/api-docs`);
  }
});

export { app }
