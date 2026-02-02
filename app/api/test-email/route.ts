import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const { emailId, testTo } = await req.json();

        if (!emailId || !testTo) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        // Fetch credentials from DB
        const { data: emailAcc, error: dbErr } = await supabase
            .from("email_accounts")
            .select("*")
            .eq("id", emailId)
            .single();

        if (dbErr || !emailAcc) {
            return NextResponse.json({ error: "Email account not found" }, { status: 404 });
        }

        // Setup transporter
        const transporter = nodemailer.createTransport({
            host: emailAcc.smtp_host || 'smtp.gmail.com',
            port: parseInt(emailAcc.smtp_port) || 465,
            secure: (parseInt(emailAcc.smtp_port) || 465) === 465,
            auth: {
                user: emailAcc.email_address,
                pass: emailAcc.app_password,
            },
        });

        // Send test mail
        await transporter.sendMail({
            from: `"${emailAcc.sender_name || 'TechSprint Admin'}" <${emailAcc.email_address}>`,
            to: testTo,
            subject: "🚀 TechSprint SMTP Connectivity Test",
            text: "Success! Your SMTP configuration is working correctly.",
            html: "<b>Success!</b> Your TechSprint SMTP configuration is working correctly.",
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("SMTP Test Error:", err);
        return NextResponse.json({ error: err.message || "Failed to send test email" }, { status: 500 });
    }
}
