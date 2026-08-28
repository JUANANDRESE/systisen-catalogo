import nodemailer from 'nodemailer';
import { orderToText } from './whatsapp.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendOrderEmail(order) {
  const t = getTransporter();
  const to = process.env.EMAIL_TO;
  if (!t || !to) {
    console.log('[email] SMTP no configurado — se omite el envío de email del pedido.');
    return { sent: false };
  }

  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: `Nuevo pedido ${order.id} — ${order.nombreCliente}`,
    text: orderToText(order),
  });

  return { sent: true };
}
