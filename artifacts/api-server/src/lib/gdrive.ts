import { google } from "googleapis";
import { logger } from "./logger";
import fs from "fs";

// To use Google Drive API, a Service Account JSON key is required.
// Set the path to it via GOOGLE_APPLICATION_CREDENTIALS env var.
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let driveClient: any = null;

if (keyFilePath && fs.existsSync(keyFilePath)) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
    driveClient = google.drive({ version: "v3", auth });
    logger.info("Google Drive client initialized.");
  } catch (error) {
    logger.error({ error }, "Failed to initialize Google Drive client.");
  }
} else {
  logger.warn("No GOOGLE_APPLICATION_CREDENTIALS provided. Google Drive sync will be disabled.");
}

export async function uploadToDrive(filePath: string, fileName: string, mimeType: string, folderId?: string) {
  if (!driveClient) {
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

    const response = await driveClient.files.create({
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
