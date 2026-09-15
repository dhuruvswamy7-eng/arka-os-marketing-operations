import { logger } from "./logger";
import fs from "fs";

// To use Google Drive API, a Service Account JSON key is required.
// Set the path to it via GOOGLE_APPLICATION_CREDENTIALS env var.
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let driveClient: any = null;

async function getDriveClient() {
  if (driveClient) return driveClient;
  if (keyFilePath && fs.existsSync(keyFilePath)) {
    try {
      const { google } = await import("googleapis");
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });
      driveClient = google.drive({ version: "v3", auth });
      logger.info("Google Drive client initialized.");
      return driveClient;
    } catch (error) {
      logger.error({ error }, "Failed to initialize Google Drive client.");
      return null;
    }
  }
  return null;
}

export async function uploadToDrive(filePath: string, fileName: string, mimeType: string, folderId?: string) {
  const client = await getDriveClient();
  if (!client) {
    logger.warn("Drive client not initialized. Cannot upload file.");
    return null;
  }

  try {
    const fileMetadata: any = {
      name: fileName,
    };
    if (folderId) {
      fileMetadata.parents = [folderId];
    }
    
    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath),
    };

    const response = await client.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });

    logger.info({ fileId: response.data.id }, "Successfully uploaded to Google Drive");
    return response.data;
  } catch (error) {
    logger.error({ error }, "Error uploading to Google Drive");
    return null;
  }
}
