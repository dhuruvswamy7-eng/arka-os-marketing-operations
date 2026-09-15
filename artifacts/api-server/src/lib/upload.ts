import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";

const USE_S3 = process.env.USE_S3 === "true";

// S3 Configuration
const s3Config = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Local Storage Configuration
const localUploadDir = path.join(process.cwd(), "uploads");
if (!USE_S3 && !fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, localUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// S3 Storage Configuration
const s3Storage = USE_S3
  ? multerS3({
      s3: s3Config,
      bucket: process.env.AWS_S3_BUCKET || "my-bucket",
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "uploads/" + file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
      },
    })
  : null;

export const upload = multer({
  storage: USE_S3 && s3Storage ? s3Storage : localStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});
