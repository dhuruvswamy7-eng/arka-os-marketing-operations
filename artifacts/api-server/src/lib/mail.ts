import nodemailer from "nodemailer";
import { logger } from "./logger";

// Hostinger SMTP configuration via environment variables
// Ensure these are set in your .env file
const smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!smtpUser || !smtpPass) {
    logger.warn("Email not sent: SMTP_USER or SMTP_PASS is missing in environment.");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"ARKA-OS" <${smtpUser}>`,
      to,
      subject,
      html,
    });
    logger.info({ messageId: info.messageId }, "Email sent successfully");
    return true;
  } catch (error) {
    logger.error({ error }, "Error sending email");
    return false;
  }
}
