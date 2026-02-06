import nodemailer from 'nodemailer';
import { supabase } from './supabase';

export async function sendEmail(to: string, subject: string, html: string) {
    let transporter: any;
    let fromEmail = process.env.EMAIL_USER;
    let senderName = 'Hackathon Event';

    try {
        // 1. Try to fetch active email account from Supabase
        const { data: dbAccountsData } = await supabase
            .from("email_accounts")
            .select("*")
            .eq("active", true)
            .limit(1);

        const dbAccount = dbAccountsData?.[0];

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
            senderName = dbAccount.sender_name || 'Hackathon Event';
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
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: auto; line-height: 1.8; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Welcome to Hackathon 2K26</h1>
            </div>
            <div style="padding: 40px; background-color: white;">
                <p style="font-size: 18px; font-weight: 600; margin-top: 0;">Hi ${name},</p>
                <p>We're absolutely thrilled to have you join the elite ranks of Hackathon 2K26! Your initial registration has been successfully logged into our systems.</p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0;">
                    <p style="margin: 0; font-weight: 600; color: #0c4a6e;">Essential Next Steps:</p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #334155;">
                        <li><strong>Secure Your Spot:</strong> If you haven't completed your payment, please head to your dashboard and finalize it to lock in your registration.</li>
                        <li><strong>Upload Proof:</strong> Already paid? Ensure your transaction screenshot is clearly uploaded for our fast-track verification.</li>
                    </ul>
                </div>

                <p>Once our team completes the manual audit of your payment, you'll receive your <strong>Official Digital Entry Pass</strong> along with your unique participant credentials.</p>
                
                <p style="margin-bottom: 0;">Push the limits,<br/><strong>The Hackathon Management Team</strong></p>
            </div>
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
                This is an automated operational message. Please do not reply directly to this email.
            </div>
        </div>
    `,
    PAYMENT_RECEIVED: (name: string) => `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: auto; line-height: 1.8; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Payment Received</h1>
            </div>
            <div style="padding: 40px; background-color: white;">
                <p style="font-size: 18px; font-weight: 600; margin-top: 0;">Hi ${name},</p>
                <p>Thank you for completing your transaction! We have successfully received your payment proof for Hackathon 2K26.</p>
                
                <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 12px; margin: 25px 0;">
                    <p style="margin: 0; color: #92400e; font-weight: 600;">Verification in Progress:</p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f;">Our finance team performs a <strong>manual audit</strong> on every transaction to ensure absolute accuracy. This process typically takes a short while depending on the volume of entries.</p>
                </div>

                <p><strong>What to do next?</strong><br/>Sit tight! You'll receive a confirmation email with your QR Entry Pass as soon as your status is flipped to 'Approved' by our specialists.</p>
                
                <p style="margin-bottom: 0;">Thank you for your cooperation,<br/><strong>The Hackathon Audit Team</strong></p>
            </div>
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
                Hackathon 2K26 Global Command Center • Automated Notification
            </div>
        </div>
    `,
    PAYMENT_VERIFIED: (name: string, qrUrl: string, finalId: string, whatsappLink?: string) => `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: auto; line-height: 1.8; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <span style="font-size: 30px;">✅</span>
                </div>
                <h1 style="color: white; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 3px;">Access Granted!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px; font-weight: 600; letter-spacing: 1px;">YOU ARE OFFICIALLY VERIFIED</p>
            </div>
            <div style="padding: 40px; background-color: white;">
                <p style="font-size: 18px; font-weight: 600; margin-top: 0;">Welcome to the Arena, ${name}!</p>
                <p>Great news! Your credentials have been audited and verified. You are now fully authorized to participate in <strong>Hackathon 2K26</strong>.</p>
                
                <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; padding: 25px; border-radius: 15px; margin: 30px 0; text-align: center;">
                    <p style="text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; color: #64748b; margin: 0 0 10px 0;">Official Participant ID</p>
                    <p style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #0ea5e9; margin: 0; letter-spacing: 2px;">${finalId}</p>
                </div>

                <p style="font-weight: 700; color: #475569; margin-bottom: 10px; text-align: center;">YOUR DIGITAL ENTRY PASS:</p>
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="${qrUrl}" alt="Entry QR" style="width: 220px; height: 220px; border: 8px solid #f8fafc; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
                    <p style="font-size: 11px; color: #94a3b8; margin-top: 10px;">Please have this QR ready at the entrance gate for rapid check-in.</p>
                </div>

                ${whatsappLink ? `
                    <div style="background: linear-gradient(to right, #ecfdf5, #f0fdf4); border: 1px solid #10b981; padding: 25px; border-radius: 16px; margin: 30px 0; text-align: center;">
                        <p style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 14px;">Connect with your fellow participants in the official WhatsApp group for real-time strategic updates:</p>
                        <a href="${whatsappLink}" style="background: #25D366; color: white; padding: 14px 30px; border-radius: 10px; text-decoration: none; font-weight: 800; display: inline-block; font-size: 14px; box-shadow: 0 4px 14px 0 rgba(37, 211, 102, 0.39);">
                            JOIN COMMUNICATIONS CHANNEL
                        </a>
                    </div>
                ` : ''}

                <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; margin-top: 30px;">
                    <p style="font-size: 14px; color: #475569;"><strong>Arrival Logistics:</strong> Please arrive at the venue at least 30 minutes before the scheduled start time. Ensure you have a valid college ID card for secondary verification.</p>
                </div>
                
                <p style="margin-top: 30px; margin-bottom: 0; font-weight: 700;">Prepare for Greatness,<br/>The Hackathon Organizing Committee</p>
            </div>
            <div style="background-color: #f8fafc; padding: 25px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                Hackathon 2K26 • Authorized Entry Document • Digital Signature Verified
            </div>
        </div>
    `,
    PAYMENT_REJECTED: (name: string) => `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: auto; line-height: 1.8; border: 1px solid #fee2e2; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Verification Issue</h1>
            </div>
            <div style="padding: 40px; background-color: white;">
                <p style="font-size: 18px; font-weight: 600; margin-top: 0;">Action Required, ${name}</p>
                <p>During our manual audit, we encountered a discrepancy with your payment verification. Unfortunately, we were unable to approve your registration at this stage.</p>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0;">
                    <p style="margin: 0; font-weight: 600; color: #991b1b;">Next Steps to Resolve:</p>
                    <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #7f1d1d; font-size: 14px;">
                        <li>Log in to your dashboard and re-verify your transaction reference number.</li>
                        <li>Ensure the uploaded screenshot clearly shows the UTR/Transaction ID and timestamp.</li>
                        <li>Re-submit the proof with correct details.</li>
                    </ol>
                </div>

                <div style="background: linear-gradient(to right, #eff6ff, #dbeafe); border: 1px solid #3b82f6; padding: 20px; border-radius: 12px; margin: 25px 0;">
                    <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e40af;">Need Help? Contact Support:</p>
                    <p style="margin: 5px 0; font-size: 14px; color: #1e3a8a;">📧 Email: <a href="mailto:dornipaduakshith@gmail.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">dornipaduakshith1@gmail.com</a></p>
                    <p style="margin: 10px 0 0 0; font-size: 13px; color: #475569;">Our support team is available to assist you with any questions or concerns.</p>
                </div>

                <p>We want to ensure you don't miss out on Hackathon 2K26. Please address this update as soon as possible to secure your participation.</p>
                
                <p style="margin-bottom: 0;">Regards,<br/><strong>Hackathon Audit Department</strong></p>
            </div>
            <div style="background-color: #fef2f2; padding: 20px; text-align: center; font-size: 12px; color: #b91c1c;">
                Urgent Status Update • Manual Review Required
            </div>
        </div>
    `,
    CUSTOM: (name: string, subject: string, message: string) => `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: auto; line-height: 1.8; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.1);">
            <div style="background: #0ea5e9; padding: 25px; text-align: center; color: white;">
                <h2 style="margin: 0; text-transform: uppercase; letter-spacing: 2px; font-size: 20px;">Administrative Bulletin</h2>
            </div>
            <div style="padding: 40px; background-color: white;">
                <p style="font-size: 18px; font-weight: 600; margin-top: 0;">Attention: ${name},</p>
                <div style="color: #334155; font-size: 16px;">
                    ${message.replace(/\n/g, '<br/>')}
                </div>
                <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Official Dispatch from:<br/><strong style="color: #0ea5e9;">Hackathon 2K26 High Command</strong></p>
                </div>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8;">
                This document is part of the official Hackathon 2K26 communications protocol.
            </div>
        </div>
    `
};
