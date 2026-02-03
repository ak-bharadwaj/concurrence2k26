"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { GlassNavbar } from "@/components/glass-navbar";
import { getFriendlyError } from "@/lib/error-handler";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [regNo, setRegNo] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Verify credentials against 'users' table
            const { data, error } = await supabase
                .from("users")
                .select("id, name, email")
                .eq("email", email)
                .eq("reg_no", regNo)
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error("Invalid email or registration number.");

            // 2. Set Session Cookie (Persistent - 30 days)
            // Session persists until explicit logout
            document.cookie = `student_session=${data.id}; path=/; max-age=${60 * 60 * 24 * 30};`; // 30 days

            // 3. Redirect
            router.push("/dashboard");
        } catch (err: any) {
            setError(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md glass-card p-6 sm:p-8 shadow-2xl relative z-10"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">Student Login</h1>
                    <p className="text-white/40">Access your dashboard & ticket</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-white/40 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-white/20" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="john@example.com"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all text-white placeholder:text-white/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-white/40 ml-1">Registration Number</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-white/20" />
                                <input
                                    type="text"
                                    required
                                    value={regNo}
                                    onChange={(e) => setRegNo(e.target.value)}
                                    placeholder="22091A..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all text-white placeholder:text-white/20"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Sign In"} <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
