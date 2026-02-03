"use client";

import { useState, useEffect } from "react";
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Users, ArrowLeft, QrCode as QrIcon } from "lucide-react";
import { getFriendlyError } from "@/lib/error-handler";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import FloatingLines from "@/components/FloatingLines";

export default function AdminScanPage() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [scanData, setScanData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
    const [paused, setPaused] = useState(false);

    // Statistics
    const [stats, setStats] = useState({ totalApproved: 0, totalCheckedIn: 0 });

    useEffect(() => {
        fetchStats();
        // Set up real-time subscription for stats
        const sub = supabase.channel('checkin_stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchStats())
            .subscribe();
        return () => { sub.unsubscribe(); };
    }, []);

    const fetchStats = async () => {
        const { count: approvedCount } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq('status', 'APPROVED');
        const { count: checkedInCount } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq('status', 'APPROVED').eq('checked_in', true);
        setStats({ totalApproved: approvedCount || 0, totalCheckedIn: checkedInCount || 0 });
    };

    const handleScan = async (text: string) => {
        if (paused || loading || !text) return;
        if (text === scanResult) return; // Debounce same result

        setPaused(true);
        setScanResult(text);
        setLoading(true);
        setMessage(null);

        try {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text);

            let query = supabase
                .from("users")
                .select("id, name, reg_no, status, checked_in, team_id, teams!team_id(name)");

            if (isUUID) {
                query = query.eq("id", text);
            } else {
                query = query.eq("reg_no", text);
            }

            const { data: user, error } = await query.single();

            if (error || !user) throw new Error("User not found");

            setScanData(user);

            if (user.status !== "APPROVED") {
                setMessage({ type: 'error', text: `ACCESS DENIED` });
                return;
            }

            if (user.checked_in) {
                setMessage({ type: 'warning', text: "ALREADY IN!" });
                return;
            }

            // Mark as Checked In
            const { error: updateError } = await supabase
                .from("users")
                .update({ checked_in: true })
                .eq("id", user.id);

            if (updateError) throw updateError;

            setMessage({ type: 'success', text: "ACCESS GRANTED" });
            fetchStats();

        } catch (err: any) {
            setMessage({ type: 'error', text: getFriendlyError(err) });
            setScanData(null);
        } finally {
            setLoading(false);
            // Auto Resume after 3 seconds
            setTimeout(() => {
                setPaused(false);
                setScanResult(null);
                setScanData(null);
                setMessage(null);
            }, 3000);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center relative overflow-hidden">
            <FloatingLines />

            <div className="relative z-10 w-full max-w-sm flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/admin/main-dashboard" className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="text-right">
                        <h1 className="text-xl font-black tracking-tighter uppercase italic">Arena Access</h1>
                        <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Entry Control System</p>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center backdrop-blur-sm">
                        <p className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Approved</p>
                        <p className="text-3xl font-black text-cyan-400">{stats.totalApproved}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center backdrop-blur-sm">
                        <p className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Checked-in</p>
                        <p className="text-3xl font-black text-purple-500">{stats.totalCheckedIn}</p>
                    </div>
                </div>

                <div className={`w-full aspect-square bg-neutral-900/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden border-2 transition-all duration-300 relative shadow-2xl ${message?.type === 'success' ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
                    message?.type === 'error' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' :
                        message?.type === 'warning' ? 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]' :
                            'border-white/10'
                    }`}>
                    {!paused && (
                        <Scanner
                            onScan={(result) => result?.[0]?.rawValue && handleScan(result[0].rawValue)}
                            scanDelay={500}
                        />
                    )}

                    {loading && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                                <p className="text-xs font-black uppercase tracking-widest text-cyan-500 animate-pulse">Verifying ID Protocol...</p>
                            </motion.div>
                        </div>
                    )}

                    {paused && !loading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    )}
                </div>

                <div className="mt-8">
                    <AnimatePresence mode="wait">
                        {message ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-4"
                            >
                                {scanData && (
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col items-center text-center backdrop-blur-md">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-2xl font-black mb-3 shadow-lg">
                                            {scanData.name[0]}
                                        </div>
                                        <h2 className="text-2xl font-black tracking-tight">{scanData.name}</h2>
                                        <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4 bg-white/5 px-3 py-1 rounded-lg">{scanData.reg_no}</p>

                                        {scanData.teams && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full">
                                                <Users className="w-3.5 h-3.5 text-cyan-400" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{scanData.teams.name}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    className={`p-8 rounded-[2rem] flex flex-col items-center text-center shadow-2xl relative overflow-hidden ${message.type === 'success' ? 'bg-gradient-to-br from-green-500 to-emerald-700 text-white' :
                                        message.type === 'warning' ? 'bg-gradient-to-br from-yellow-500 to-orange-600 text-black' :
                                            'bg-gradient-to-br from-red-500 to-rose-700 text-white'
                                        }`}
                                >
                                    <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
                                    <div className="relative z-10 flex flex-col items-center">
                                        {message.type === 'success' && <CheckCircle className="w-16 h-16 mb-2 drop-shadow-lg" />}
                                        {message.type === 'warning' && <AlertTriangle className="w-16 h-16 mb-2 drop-shadow-lg" />}
                                        {message.type === 'error' && <XCircle className="w-16 h-16 mb-2 drop-shadow-lg" />}
                                        <h2 className="text-4xl font-black uppercase italic tracking-tighter drop-shadow-md">{message.text}</h2>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ) : (
                            !loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12"
                                >
                                    <div className="inline-flex p-6 rounded-full bg-white/5 border border-white/10 mb-6 relative group cursor-pointer hover:bg-white/10 transition-colors">
                                        <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <QrIcon className="w-10 h-10 text-cyan-400 relative z-10" />
                                    </div>
                                    <p className="font-black uppercase tracking-widest text-xs text-white/40">Ready to Scan Protocol</p>
                                    <p className="text-[10px] text-white/20 mt-2">Align User Ticket within the scanner frame</p>
                                </motion.div>
                            )
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function QrCode(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="5" height="5" x="3" y="3" rx="1" />
            <rect width="5" height="5" x="16" y="3" rx="1" />
            <rect width="5" height="5" x="3" y="16" rx="1" />
            <path d="M21 16V10" />
            <path d="M10 21h7" />
            <path d="M10 10V3" />
            <path d="M3 10h7" />
            <path d="M16 10h5" />
            <path d="M21 21v-5" />
            <path d="M10 16v5" />
            <path d="M16 16h1" />
            <path d="M16 10V16" />
        </svg>
    )
}
