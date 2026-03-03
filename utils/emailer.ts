import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS."
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const tx = getTransporter();
    const fromAddress = options.from ?? env.SMTP_FROM ?? env.SMTP_USER;

    const info = await tx.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    });

    console.log("Email sent:", info.messageId);
  } catch (err: unknown) {
    console.error("Error sending email", err);
    throw new Error("Failed to send email");
  }
}
