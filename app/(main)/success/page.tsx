"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, ArrowLeft, LayoutDashboard, ExternalLink } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getActiveGroupLink, getNextAvailableQR, submitPayment } from "@/lib/supabase-actions";

export default function SuccessPage() {
    const [groupLink, setGroupLink] = useState<string | null>(null);

    useEffect(() => {
        // Fetch WhatsApp Group Link using the robust helper
        const fetchLink = async () => {
            try {
                // For the success page, we'll try to get the user's college from local storage or context if available
                // for now defaulting to RGM as it's the primary venue
                const link = await getActiveGroupLink("RGM College");
                if (link) setGroupLink(link);
            } catch (err) {
                // Silently fail if group link fetch fails
            }
        };
        fetchLink();
    }, []);

    return (
        <div className="min-h-screen bg-transparent flex items-center justify-center px-4 pt-20 relative z-10 text-white font-sans">            <div className="max-w-md w-full text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="mb-8 flex justify-center"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
                    <CheckCircle2 className="w-24 h-24 text-cyan-500 relative" />
                </div>
            </motion.div>

            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"
            >
                Registration Submitted
            </motion.h1>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 mb-8 space-y-6 backdrop-blur-xl"
            >
                <div className="text-center pb-4 border-b border-white/10">
                    <p className="text-2xl font-bold text-white mb-2">Wait for Verification 🚀</p>
                    <p className="text-sm text-white/40">You are one step away from Hackathon 2K26.</p>
                </div>

                <div className="flex items-start gap-4 text-left">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-white">Payment Received</p>
                        <p className="text-sm text-white/40 text-pretty">We have your receipt. Manual verification takes 1-6 hours.</p>
                    </div>
                </div>

                <div className="flex items-start gap-4 text-left">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-white">Keep an eye on Email</p>
                        <p className="text-sm text-white/40 text-pretty">Approval email with your Digital Ticket will be sent shortly.</p>
                    </div>
                </div>

                {/* WhatsApp Group Button */}
                {groupLink && (
                    <Link
                        href={groupLink}
                        target="_blank"
                        className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366]/10 text-[#25D366] rounded-xl font-bold hover:bg-[#25D366]/20 transition-all border border-[#25D366]/20"
                    >
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                        Join WhatsApp Group
                    </Link>
                )}

                <Link
                    href="/dashboard"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                    <LayoutDashboard className="w-5 h-5" /> Go to My Dashboard
                </Link>
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
            </motion.div>
        </div>
        </div>
    );
}
