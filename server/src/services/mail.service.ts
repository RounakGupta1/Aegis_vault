import nodemailer from "nodemailer";
import type { Env } from "../config/env.js";

function transport(env: Env) {
  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return null;
}

export async function sendMail(
  env: Env,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const mailer = transport(env);
  if (!mailer) {
    if (env.NODE_ENV === "development") {
      console.info(`[mail:dev] to=${to} subject=${subject}`);
      console.info(text);
    }
    return;
  }
  await mailer.sendMail({ from: env.SMTP_FROM, to, subject, text });
}
