"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, User, Users, CheckCircle, XCircle, Clock, LogOut, Ticket, Crown, MessageSquare, Send, ChevronRight, Copy, ShieldCheck, Plus, Sparkles, Upload, Mail, Phone } from "lucide-react";
import { submitPayment, getNextAvailableQR, getUserJoinRequest, getJoinRequests, respondToJoinRequest } from "@/lib/supabase-actions";
import { motion, AnimatePresence } from "framer-motion";
import { getFriendlyError } from "@/lib/error-handler";
import { submitSupportTicket, getUserSupportTickets } from "@/lib/support-actions";

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [team, setTeam] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [ticketForm, setTicketForm] = useState({ type: "PAYMENT", description: "" });
    const [submittingTicket, setSubmittingTicket] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<any>(null);
    const [joinRequest, setJoinRequest] = useState<any>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    // Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [assignedQR, setAssignedQR] = useState<any>(null);
    const [paymentData, setPaymentData] = useState({ transactionId: '' });
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);

    const router = useRouter();

    const fetchDashboard = useCallback(async (silent: boolean = false) => {
        // 1. Get Session
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as any);

        const userId = cookies['student_session'];
        if (!userId) {
            router.push("/login");
            return;
        }

        try {
            if (!silent) setLoading(true);
            // 2. Fetch User & Team
            const { data: userData, error: uErr } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();

            if (uErr) {
                if (uErr.code === 'PGRST116') {
                    document.cookie = "student_session=; path=/; max-age=0;";
                    router.push("/login");
                    return;
                }
                throw uErr;
            }

            // Safety: If user is deleted via admin but cookie persists, clear and redirect
            if (!userData) {
                document.cookie = "student_session=; path=/; max-age=0;";
                router.push("/login");
                return;
            }

            setUser(userData);

            if (userData.team_id) {
                // ... same logic as before ...
                const [teamRes, membersRes] = await Promise.all([
                    supabase.from("teams").select("*").eq("id", userData.team_id).single(),
                    supabase.from("users").select("name, role, status").eq("team_id", userData.team_id)
                ]);

                if (teamRes.error && teamRes.error.code !== 'PGRST116') {
                    console.error("Team fetch error:", teamRes.error);
                }

                if (teamRes.data) {
                    setTeam({ ...teamRes.data, members: membersRes.data || [] });

                    // 2b. If leader, fetch pending join requests
                    if (userData.role === 'LEADER') {
                        const reqs = await getJoinRequests(userData.team_id);
                        setPendingRequests(reqs || []);
                    }
                } else {
                    setTeam(null);
                }
                setJoinRequest(null);
            } else {
                setTeam(null);
                // 3. If no team, check for pending join requests
                const request = await getUserJoinRequest(userId);
                setJoinRequest(request);
            }

            // Fetch tickets in parallel or after user data is confirmed
            const ticketsData = await getUserSupportTickets(userId);
            setTickets(ticketsData || []);
        } catch (err: any) {
            setError(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    }, [router]);

    const debouncedFetch = useCallback((silent: boolean = true) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const timeout = setTimeout(() => {
            fetchDashboard(silent);
        }, 200);
        setDebounceTimer(timeout);
    }, [debounceTimer, fetchDashboard]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    useEffect(() => {
        const sessionCookie = document.cookie.split(';').find(c => c.trim().startsWith('student_session='));
        const userId = sessionCookie?.split('=')[1];

        if (userId) {
            const dashboardChannel = supabase.channel(`dashboard_sync_${userId}`);

            dashboardChannel
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, () => debouncedFetch(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: user?.team_id ? `id=eq.${user.team_id}` : undefined }, () => debouncedFetch(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: user?.team_id ? `team_id=eq.${user.team_id}` : undefined }, () => debouncedFetch(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests', filter: user?.team_id ? `team_id=eq.${user.team_id}` : undefined }, () => debouncedFetch(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${userId}` }, () => debouncedFetch(true))
                .subscribe();

            return () => { dashboardChannel.unsubscribe(); };
        }
    }, [user?.team_id, debouncedFetch]);

    const handleInitiatePayment = async () => {
        try {
            setLoading(true);
            let amount = 800;
            // Check team mode
            if (team?.payment_mode === 'BULK' && user.role === 'LEADER') {
                amount = 800 * (team.members?.length || 1);
            }
            // Fetch QR for the calculated amount
            const qr = await getNextAvailableQR(amount);
            setAssignedQR(qr);
            setShowPaymentModal(true);
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentData.transactionId || !screenshotFile) {
            alert("Please provide both Transaction ID and Screenshot File.");
            return;
        }
        try {
            setPaymentSubmitting(true);

            // 1. Upload Screenshot to Supabase Storage
            const fileExt = screenshotFile.name.split('.').pop();
            const fileName = `${user.reg_no}_${Date.now()}.${fileExt}`;
            const { data: upData, error: upErr } = await supabase.storage
                .from("screenshots")
                .upload(fileName, screenshotFile);

            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage
                .from("screenshots")
                .getPublicUrl(upData.path);

            // 2. Submit Payment Metadata
            await submitPayment(user.id, {
                transaction_id: paymentData.transactionId,
                screenshot_url: publicUrl,
                assigned_qr_id: assignedQR?.id
            });

            setShowPaymentModal(false);
            setPaymentData({ transactionId: '' });
            setScreenshotFile(null);
            alert("Payment submitted successfully! Verification is now pending.");
            fetchDashboard();
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const handleLogout = () => {
        document.cookie = "student_session=; path=/; max-age=0;";
        router.push("/login");
    };

    const handleTicketSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketForm.description.trim()) return;
        try {
            setSubmittingTicket(true);
            await submitSupportTicket({
                user_id: user.id,
                issue_type: ticketForm.type,
                description: ticketForm.description
            });
            setShowSupportModal(false);
            setTicketForm({ type: "PAYMENT", description: "" });
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setSubmittingTicket(false);
        }
    };

    const handleRespondToRequest = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            setLoading(true);
            await respondToJoinRequest(requestId, status);
            alert(`Request ${status.toLowerCase()} successfully!`);
            fetchDashboard(true);
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                <p className="text-sm font-black uppercase tracking-widest text-white/40 animate-pulse">Initializing Interface...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-black relative">
            <div className="glass-card p-8 rounded-3xl text-center max-w-sm relative z-10">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Sync Failed</h2>
                <p className="text-white/40 text-sm mb-6">{error}</p>
                <button onClick={() => window.location.reload()} className="w-full py-3 bg-white text-black font-bold rounded-xl">Try Again</button>
            </div>
        </div>
    );

    if (!user) return null;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${user.id}`;

    return (
        <div className="min-h-screen text-white relative overflow-x-hidden selection:bg-cyan-500/30 font-sans bg-transparent">
            <div className="pt-28 pb-20 px-4 relative z-10">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2"
                        >
                            <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-500 tracking-tighter">
                                WELCOME BACK,<br />
                                <span className="text-white">{user.name.split(' ')[0]}</span>
                            </h1>
                            <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                System Online • {new Date().toLocaleDateString()}
                            </p>
                        </motion.div>

                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={handleLogout}
                            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 w-fit"
                        >
                            <LogOut className="w-4 h-4" /> Terminate Session
                        </motion.button>
                    </div>

                    {/* Status Banner */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className={`p-1 rounded-[2.5rem] bg-gradient-to-r ${user.status === 'APPROVED' ? 'from-green-500/20 to-emerald-600/20' : user.status === 'REJECTED' ? 'from-red-500/20 to-orange-600/20' : 'from-yellow-500/20 to-orange-500/20'}`}
                    >
                        <div className="bg-black/80 backdrop-blur-xl rounded-[2.3rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                            <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20 ${user.status === 'APPROVED' ? 'bg-green-500' : 'bg-orange-500'}`} />

                            <div className={`relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 transform transition-transform group-hover:rotate-0 ${user.status === 'APPROVED' ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-black' : user.status === 'REJECTED' ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white' : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black'
                                }`}>
                                {user.status === 'APPROVED' ? <CheckCircle className="w-10 h-10" /> :
                                    user.status === 'REJECTED' ? <XCircle className="w-10 h-10" /> :
                                        <Clock className="w-10 h-10" />}
                            </div>

                            <div className="text-center md:text-left relative z-10">
                                <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight mb-2">
                                    {user.status === 'APPROVED' ? 'Access Granted' :
                                        user.status === 'REJECTED' ? 'Access Denied' :
                                            'Verification Pending'}
                                </h2>
                                <p className="text-sm font-medium text-white/50 max-w-lg leading-relaxed">
                                    {user.status === 'APPROVED' ? 'Your identity has been verified. You are authorized to enter the arena. Please keep your QR code ready.' :
                                        user.status === 'REJECTED' ? 'Your registration was flagged. Please contact support immediately for manual review.' :
                                            user.status === 'UNPAID' ?
                                                (joinRequest ? "Awaiting captain's approval. Your payment window will activate once you're officially in the squad." : "Your registration is incomplete. Join a crew or finalize your payment to lock your slot.") :
                                                'Our sentinels are verifying your payment details. This process typically takes 2-4 hours.'}
                                </p>

                                {user.status === 'UNPAID' && user.team_id && !joinRequest && (
                                    <div className="mt-6">
                                        <button
                                            onClick={handleInitiatePayment}
                                            className="px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2"
                                        >
                                            Initialize Payment Sequence <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Digital ID Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-cyan-500/30 transition-colors"
                        >
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                <Ticket className="w-64 h-64 -mr-16 -mt-16 rotate-12" />
                            </div>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                                    <Ticket className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">DIGITAL PERMIT</h3>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/30">Entry Authorization</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center text-center space-y-8 py-4">
                                {user.status === 'APPROVED' ? (
                                    <div className="relative group/qr">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[2.2rem] blur opacity-20 group-hover/qr:opacity-50 transition-opacity" />
                                        <div className="bg-white p-6 rounded-[2rem] relative shadow-2xl transform transition-transform group-hover/qr:scale-105">
                                            <img src={qrUrl} alt="Ticket QR" className="w-48 h-48 sm:w-56 sm:h-56 mix-blend-multiply" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-48 h-48 sm:w-56 sm:h-56 flex flex-col items-center justify-center text-white/20 text-center p-8 border-2 border-dashed border-white/5 rounded-[2rem] bg-black/20">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 animate-pulse">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Permit Locked<br />Pending Approval</p>
                                    </div>
                                )}

                                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                    <div className="text-left">
                                        <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Registration ID</p>
                                        <p className="font-mono text-xl font-black text-cyan-400 tracking-wider">{user.reg_no}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Size</p>
                                        <p className="font-mono text-xl font-black text-purple-400 tracking-wider">{user.tshirt_size || 'M'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Status</p>
                                        <p className={`font-mono text-[10px] font-black tracking-wider uppercase ${user.status === 'APPROVED' ? 'text-green-500' : 'text-yellow-500'}`}>{user.status}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Squad Grid UI */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col gap-6"
                        >
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden min-h-[500px] flex flex-col">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                                    <Users className="w-64 h-64 -mr-16 -mt-16 rotate-12" />
                                </div>

                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                            <Users className="w-6 h-6 text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black tracking-tight">SQUAD GRID</h3>
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-white/30">Unit Status</p>
                                        </div>
                                    </div>
                                    {team && (
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${team.payment_mode === 'BULK' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
                                            {team.payment_mode}
                                        </div>
                                    )}
                                </div>

                                {team ? (
                                    // ... team members display ...
                                    <div className="flex-1 flex flex-col gap-6">
                                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                            <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-1">Squad Designation</p>
                                            <p className="text-3xl font-black text-white">{team.name}</p>
                                            <div className="flex items-center gap-3 mt-4">
                                                <div className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 font-mono text-xs text-purple-400 font-bold tracking-widest flex items-center gap-2">
                                                    {team.unique_code}
                                                    <button onClick={() => navigator.clipboard.writeText(team.unique_code)} className="hover:text-white transition-colors"><Copy className="w-3 h-3" /></button>
                                                </div>
                                                <p className="text-[10px] text-white/30 font-medium">Share this code to recruit</p>
                                            </div>
                                        </div>

                                        {/* Pending Requests Alert for Leader */}
                                        {user.role === 'LEADER' && pendingRequests.length > 0 && (
                                            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-3xl p-6 animate-pulse">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                                                    </div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-cyan-400">New Recruit Signal Detected</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    {pendingRequests.map((req: any) => (
                                                        <div key={req.id} className="flex flex-col gap-3 p-4 bg-black/40 rounded-3xl border border-white/5">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <p className="text-sm font-black text-white">{req.users?.name || req.name || "Unknown Warrior"}</p>
                                                                    <p className="text-[10px] text-white/40 uppercase font-mono tracking-tighter">{req.users?.reg_no || req.reg_no || "---"} • {req.users?.college || req.college || "N/A"}</p>
                                                                </div>
                                                                <div className="flex gap-2 shrink-0">
                                                                    <button
                                                                        onClick={() => handleRespondToRequest(req.id, 'ACCEPTED')}
                                                                        className="px-4 py-2 bg-cyan-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                                                    >
                                                                        Accept
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRespondToRequest(req.id, 'REJECTED')}
                                                                        className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-xl hover:bg-red-500 hover:text-white border border-red-500/20 transition-all"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-3 pt-3 border-t border-white/5">
                                                                <div className="flex items-center gap-2 text-[9px] text-white/50 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                                    <Mail className="w-3 h-3 text-cyan-400" />
                                                                    {req.users?.email || "---"}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[9px] text-white/50 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                                    <Phone className="w-3 h-3 text-cyan-400" />
                                                                    {req.users?.phone || "---"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 gap-3">
                                            {/* 5-Slot Grid Visualization */}
                                            {Array.from({ length: 5 }).map((_, i) => {
                                                const member = team.members?.[i];
                                                const isLeader = member?.role === 'LEADER';

                                                if (member) {
                                                    return (
                                                        <div key={i} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-2xl transition-transform hover:scale-[1.02]">
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 backdrop-blur-md border border-white/10 flex items-center justify-center font-bold text-white relative shrink-0">
                                                                {member.name[0]}
                                                                {isLeader && <div className="absolute -top-1 -right-1"><Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" /></div>}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold text-sm truncate">{member.name}</div>
                                                                <div className={`text-[9px] font-black uppercase tracking-widest ${member.status === 'APPROVED' ? 'text-green-500' :
                                                                    member.status === 'REJECTED' ? 'text-red-500' : 'text-yellow-500'
                                                                    }`}>{member.status}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={i} className="flex items-center gap-4 p-3 border-2 border-dashed border-white/5 rounded-2xl opacity-50">
                                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                                            <Plus className="w-5 h-5 text-white/20" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="font-bold text-sm text-white/30 uppercase tracking-widest">Vacant Slot</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : joinRequest ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-cyan-500/5 border-2 border-dashed border-cyan-500/20 rounded-3xl animate-pulse">
                                        <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6">
                                            <Clock className="w-8 h-8 text-cyan-400" />
                                        </div>
                                        <h4 className="text-xl font-black text-white mb-2 italic">AWAITING ORDERS</h4>
                                        <p className="text-xs text-white/50 max-w-xs leading-relaxed mb-4">
                                            Your signal has been sent to the captain of <span className="text-cyan-400 font-bold">"{joinRequest.teams?.name}"</span>.
                                        </p>
                                        <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                            Request Status: Pending
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/20 border-2 border-dashed border-white/5 rounded-3xl group cursor-pointer hover:border-purple-500/30 transition-all">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <Sparkles className="w-8 h-8 text-purple-400" />
                                        </div>
                                        <h4 className="text-xl font-black text-white mb-2">Lone Wolf?</h4>
                                        <p className="text-xs text-white/50 max-w-xs leading-relaxed mb-6">
                                            You are currently operating as a freelancer. Create a specific unit or join an existing one to unlock squad benefits.
                                        </p>
                                        <button
                                            onClick={() => router.push('/team')}
                                            className="px-8 py-3 bg-white text-black font-black uppercase text-xs rounded-xl hover:bg-purple-500 hover:text-white transition-all"
                                        >
                                            Initialize Squad
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Support Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 glass-card p-8 flex flex-col justify-between rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                            <div>
                                <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-orange-400"><MessageSquare className="w-5 h-5" /> Help Desk</h3>
                                <p className="text-xs text-white/40 mb-6 font-medium leading-relaxed">Facing issues with payment or registration? Our Ops team is active 24/7.</p>
                            </div>
                            <button
                                onClick={() => setShowSupportModal(true)}
                                className="w-full py-4 bg-orange-500 text-black font-black rounded-2xl text-[10px] uppercase hover:bg-orange-400 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] tracking-widest"
                            >
                                Dispatch Signal
                            </button>
                        </div>

                        <div className="md:col-span-2 glass-card p-8 rounded-[2.5rem] border border-white/10">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-6">Transmission Log</h3>
                            {tickets.length > 0 ? (
                                <div className="space-y-3">
                                    {tickets.slice(0, 3).map((t: any) => (
                                        <div key={t.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black uppercase text-cyan-400">{t.issue_type}</span>
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase ${t.status === 'RESOLVED' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                                                        {t.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/60 line-clamp-1">{t.description}</p>
                                                {t.admin_response && (
                                                    <div className="mt-2 pl-3 border-l-2 border-cyan-500/30">
                                                        <p className="text-[9px] font-bold text-cyan-400 uppercase">Support Response:</p>
                                                        <p className="text-[10px] text-white/80">{t.admin_response}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[8px] text-white/20 font-mono shrink-0">
                                                {new Date(t.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-32 flex flex-col items-center justify-center text-white/10 italic border border-dashed border-white/5 rounded-2xl">
                                    <p className="text-xs font-bold uppercase tracking-widest">No active communications</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Modal */}
            <AnimatePresence>
                {showSupportModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-neutral-900 border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">New Transmission</h2>
                                <button onClick={() => setShowSupportModal(false)} className="text-white/40 hover:text-white"><XCircle className="w-6 h-6" /></button>
                            </div>

                            <form onSubmit={handleTicketSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Issue Category</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['PAYMENT', 'TEAM', 'ACCOUNT', 'OTHER'].map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setTicketForm({ ...ticketForm, type: cat })}
                                                className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${ticketForm.type === cat ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-white/5 text-white/40 border-white/10'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Describe your problem</label>
                                    <textarea
                                        required
                                        value={ticketForm.description}
                                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 min-h-[120px] outline-none focus:border-cyan-500/50 transition-all font-medium text-sm text-white"
                                        placeholder="Explain clearly so we can help you faster..."
                                    />
                                </div>

                                <button
                                    disabled={submittingTicket}
                                    className="w-full py-4 bg-white text-black font-black rounded-2xl text-xs uppercase hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {submittingTicket ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Dispatch Ticket</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-neutral-900 border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Secure Payment</h2>
                                <button onClick={() => setShowPaymentModal(false)} className="text-white/40 hover:text-white"><XCircle className="w-6 h-6" /></button>
                            </div>

                            <div className="space-y-8">
                                <div className="text-center space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Scan to Pay</p>
                                    <div className="text-4xl font-black text-white tracking-tighter">₹{assignedQR?.amount}</div>
                                    <div className="w-full aspect-square relative bg-white rounded-2xl p-4 max-w-[200px] mx-auto overflow-hidden">
                                        {assignedQR?.qr_image_url ? (
                                            <img src={assignedQR.qr_image_url} alt="Payment QR" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-black font-bold text-xs uppercase text-center">QR Loading...</div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-cyan-400 font-mono">{assignedQR?.upi_id || "Loading UPI..."}</p>
                                </div>

                                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-black text-white/30 tracking-widest pl-1">Transaction ID (UTR)</label>
                                        <input
                                            required
                                            value={paymentData.transactionId}
                                            onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-cyan-500/50 transition-all font-mono text-sm text-white"
                                            placeholder="12-20 character UTR ID"
                                            maxLength={20}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-black text-white/30 tracking-widest pl-1">Payment Proof (Screenshot)</label>
                                        <div className="relative group/upload">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                required
                                                onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                                                className="hidden"
                                                id="screenshot-upload"
                                            />
                                            <label
                                                htmlFor="screenshot-upload"
                                                className="flex flex-col items-center justify-center w-full min-h-[100px] bg-white/5 border border-dashed border-white/10 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer p-4 group"
                                            >
                                                {screenshotFile ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                                        <span className="text-[10px] text-white/60 font-mono truncate max-w-[200px]">{screenshotFile.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Upload className="w-8 h-8 text-white/20 group-hover:text-cyan-400 transition-colors" />
                                                        <div className="text-center">
                                                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Select Evidence</p>
                                                            <p className="text-[8px] text-white/20 mt-1">JPG, PNG or WEBP (Max 5MB)</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        disabled={paymentSubmitting}
                                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-xl text-xs uppercase hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                                    >
                                        {paymentSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Transaction"}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
