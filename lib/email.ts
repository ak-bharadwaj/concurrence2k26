import nodemailer from 'nodemailer';
import { supabase } from './supabase';

export async function sendEmail(to: string, subject: string, html: string) {
    let transporter: any;
    let fromEmail = process.env.EMAIL_USER;
    let senderName = 'TechSprint Event';

    try {
        // 1. Try to fetch active email account from Supabase
        const { data: dbAccount } = await supabase
            .from("email_accounts")
            .select("*")
            .eq("active", true)
            .limit(1)
            .single();

        if (dbAccount) {
            transporter = nodemailer.createTransport({
                host: dbAccount.smtp_host || 'smtp.gmail.com',
                port: dbAccount.smtp_port || 465,
                secure: (dbAccount.smtp_port || 465) === 465,
                auth: {
                    user: dbAccount.email_address,
                    pass: dbAccount.app_password,
                },
            });
            fromEmail = dbAccount.email_address;
            senderName = dbAccount.sender_name || 'TechSprint Event';
        } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            // 2. Fallback to Env Variables
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        }
    } catch (err) {
        console.warn("Ready to send but SMTP config failed, using fallback/simulation.");
    }

    if (!transporter) {
        console.warn("⚠️ No SMTP credentials found. Email simulation:");
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"${senderName}" <${fromEmail}>`,
            to,
            subject,
            html,
        });
        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

export const EMAIL_TEMPLATES = {
    WELCOME: (name: string) => `
        <div style="font-family: sans-serif; color: #333;">
            <h1 style="color: #06b6d4;">Welcome to TechSprint 2K26! 🚀</h1>
            <p>Hi ${name},</p>
            <p>We have received your registration details.</p>
            <p>If you have already made the payment, please wait for our admin to verify your transaction. You will receive another email once verified.</p>
            <p>If you haven't paid yet, please complete the payment to secure your spot.</p>
            <br/>
            <p>Best Regards,<br/>TechSprint Team</p>
        </div>
    `,
    PAYMENT_VERIFIED: (name: string, qrUrl: string, finalId: string, whatsappLink?: string) => `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; line-height: 1.6;">
            <h1 style="color: #22c55e;">You're In! 🎉</h1>
            <p>Hi ${name},</p>
            <p>Your payment has been <strong>VERIFIED</strong>. You are officially registered for TechSprint 2K26.</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 15px; margin: 20px 0; text-align: center;">
                <p style="text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; color: #64748b; margin-bottom: 5px;">Your Entry ID</p>
                <p style="font-family: monospace; font-size: 24px; font-weight: bold; color: #0ea5e9; margin: 0;">${finalId}</p>
            </div>

            <p>Please show the QR code below at the venue entry:</p>
            <div style="text-align: center; margin: 20px 0;">
                <img src="${qrUrl}" alt="Entry QR" style="width: 200px; height: 200px; border: 2px solid #ddd; border-radius: 10px;" />
            </div>

            ${whatsappLink ? `
                <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 15px; margin: 20px 0; text-align: center;">
                    <p style="color: #065f46; margin-bottom: 15px; font-weight: 500;">Join the official WhatsApp group for real-time updates:</p>
                    <a href="${whatsappLink}" style="background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                        JOIN WHATSAPP GROUP
                    </a>
                </div>
            ` : ''}

            <p>See you at the event!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">This is an automated message. Please do not reply.</p>
        </div>
    `,
    PAYMENT_REJECTED: (name: string) => `
        <div style="font-family: sans-serif; color: #333;">
            <h1 style="color: #ef4444;">Payment Issue ⚠️</h1>
            <p>Hi ${name},</p>
            <p>Unfortunately, we could not verify your payment transaction.</p>
            <p>Please log in to your dashboard or contact support to resolve this issue.</p>
            <br/>
            <p>TechSprint Team</p>
        </div>
    `
};
