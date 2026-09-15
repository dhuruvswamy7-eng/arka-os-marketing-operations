import { google } from "googleapis";
import { logger } from "./logger";
import fs from "fs";

const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let calendarClient: any = null;

if (keyFilePath && fs.existsSync(keyFilePath)) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
    calendarClient = google.calendar({ version: "v3", auth });
    logger.info("Google Calendar client initialized.");
  } catch (error) {
    logger.error({ error }, "Failed to initialize Google Calendar client.");
  }
}

export async function addEventToCalendar(summary: string, description: string, startTime: string, endTime: string) {
  if (!calendarClient) {
    logger.warn("Calendar client not initialized.");
    return null;
  }

  try {
    const event = {
      summary,
      description,
      start: {
        dateTime: startTime, // ISO format
        timeZone: "UTC",
      },
      end: {
        dateTime: endTime,
        timeZone: "UTC",
      },
    };

    const response = await calendarClient.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      requestBody: event,
    });

    logger.info({ eventId: response.data.id }, "Successfully added event to Calendar");
    return response.data;
  } catch (error) {
    logger.error({ error }, "Error adding event to Calendar");
    return null;
  }
}
