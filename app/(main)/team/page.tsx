"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getJoinRequests, respondToJoinRequest, removeMemberFromTeam, leaveTeam, updateTeamSettings, addMemberToTeam, updateMemberDetails, deleteTeam, submitPayment, getNextAvailableQR } from "@/lib/supabase-actions";
import { Loader2, Users, Crown, Copy, Check, UserMinus, LogOut, Settings, ArrowLeft, UserPlus, X, Edit3, Save, Trash2, ShieldCheck, Plus, CreditCard, Upload, Clock } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { getFriendlyError } from "@/lib/error-handler";

export default function TeamPage() {
    const [user, setUser] = useState<any>(null);
    const [team, setTeam] = useState<any>(null);
    const [isCreatingFirstSquad, setIsCreatingFirstSquad] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [joinRequests, setJoinRequests] = useState<any[]>([]);
    const [acceptedRequests, setAcceptedRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [debounceTimer, setDebounceTimer] = useState<any>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState("");
    const [newMemberRegNo, setNewMemberRegNo] = useState("");
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [isSavingMember, setIsSavingMember] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [newMemberData, setNewMemberData] = useState({ name: "", email: "", reg_no: "", phone: "", branch: "", college: "RGM", year: "", other_college: "" });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [assignedQR, setAssignedQR] = useState<any>(null);
    const [paymentProof, setPaymentProof] = useState<{ transaction_id: string; screenshot: File | null }>({ transaction_id: "", screenshot: null });
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(800);
    const router = useRouter();

    const fetchTeamData = useCallback(async (silent: boolean = false) => {
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
            const { data: userData, error: uErr } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();

            if (uErr) throw uErr;
            setUser(userData);

            if (!userData.team_id) {
                setIsCreatingFirstSquad(true);
                setLoading(false);
                return;
            }

            // Parallelize fetching for Team, Members, and Requests (if leader)
            const promises: any[] = [
                supabase.from("teams").select("*").eq("id", userData.team_id).single(),
                supabase.from("users").select("id, name, reg_no, role, status, email").eq("team_id", userData.team_id).order("role", { ascending: false })
            ];

            if (userData.role === "LEADER") {
                promises.push(getJoinRequests(userData.team_id, 'PENDING'));
                promises.push(getJoinRequests(userData.team_id, 'ACCEPTED'));
            }

            // Execute all queries concurrently
            const results = await Promise.all(promises);
            const teamRes = results[0];
            const membersRes = results[1];

            if (teamRes.error) throw teamRes.error;
            setTeam(teamRes.data);
            setMembers(membersRes.data || []);

            if (userData.role === "LEADER") {
                setJoinRequests(results[2] || []);
                setAcceptedRequests(results[3] || []);
            }
        } catch (err: any) {
            setError(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    }, [router]);

    const debouncedFetch = useCallback((silent: boolean = true) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const timeout = setTimeout(() => {
            fetchTeamData(silent);
        }, 1000);
        setDebounceTimer(timeout);
    }, [debounceTimer, fetchTeamData]);

    useEffect(() => {
        fetchTeamData();
    }, [fetchTeamData]);

    useEffect(() => {
        const sessionCookie = document.cookie.split(';').find(c => c.trim().startsWith('student_session='));
        const userId = sessionCookie?.split('=')[1];

        if (userId) {
            const userChannel = supabase.channel(`user_status_sync_${userId}`);
            userChannel
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
                    (payload) => {
                        // If team_id was null and is now set, refetch
                        if (payload.new.team_id) {
                            debouncedFetch(false);
                        } else {
                            debouncedFetch(true);
                        }
                    }
                )
                .subscribe();

            let teamChannel: any = null;
            if (team?.id) {
                teamChannel = supabase.channel(`team_page_sync_${userId}`);
                teamChannel
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${team.id}` }, () => debouncedFetch(true))
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `team_id=eq.${team.id}` }, () => debouncedFetch(true))
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests', filter: `team_id=eq.${team.id}` }, () => debouncedFetch(true))
                    .subscribe();
            }

            return () => {
                supabase.removeChannel(userChannel);
                if (teamChannel) supabase.removeChannel(teamChannel);
            };
        }
    }, [team?.id, debouncedFetch]);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(team.unique_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJoinRequest = async (requestId: string, action: 'ACCEPTED' | 'REJECTED') => {
        try {
            setProcessingId(requestId);
            await respondToJoinRequest(requestId, action);
            await fetchTeamData();
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setProcessingId(null);
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Remove ${memberName} from the team?`)) return;
        try {
            setProcessingId(memberId);
            await removeMemberFromTeam(memberId, team.id);
            await fetchTeamData();
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setProcessingId(null);
        }
    };

    const handleLeaveTeam = async () => {
        if (!confirm("Are you sure you want to leave this team?")) return;
        try {
            setLoading(true);
            await leaveTeam(user.id);
            router.push("/dashboard");
        } catch (err: any) {
            alert(getFriendlyError(err));
            setLoading(false);
        }
    };

    const handleDisbandTeam = async () => {
        if (!confirm("CRITICAL ACTION: Disbanding the squad will remove all members and delete the team record permanently. Proceed?")) return;
        try {
            setLoading(true);
            await deleteTeam(team.id);
            router.push("/dashboard");
        } catch (err: any) {
            alert(getFriendlyError(err));
            setLoading(false);
        }
    };

    const handleUpdateTeamName = async () => {
        if (!newName.trim() || newName === team.name) {
            setIsEditingName(false);
            return;
        }
        try {
            setProcessingId('update_name');
            await updateTeamSettings(team.id, { name: newName });
            setTeam({ ...team, name: newName });
            setIsEditingName(false);
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setProcessingId(null);
        }
    };

    const handleUpdateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMember) return;
        try {
            setIsSavingMember(true);
            await updateMemberDetails(editingMember.id, {
                name: editingMember.name,
                branch: editingMember.branch,
                college: editingMember.college
            });
            alert("Warrior intel updated successfully!");
            setEditingMember(null);
            await fetchTeamData();
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setIsSavingMember(false);
        }
    };

    const handleAddMemberByRegNo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberData.reg_no.trim() || !newMemberData.name.trim()) return;
        try {
            setIsAddingMember(true);
            await addMemberToTeam(newMemberData, team.id);
            alert("Member enrolled successfully!");
            setNewMemberData({ name: "", email: "", reg_no: "", phone: "", branch: "", college: "RGM", year: "", other_college: "" });
            setShowAddMemberModal(false);
            await fetchTeamData();
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleCreateFirstSquad = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) {
            alert("Please enter a squad name");
            return;
        }

        if (!user || !user.id) {
            alert("User session not found. Please try logging in again.");
            router.push("/login");
            return;
        }

        try {
            setIsAddingMember(true);
            setError(null);

            const unique_code = Math.random().toString(36).substring(2, 8).toUpperCase();

            // 1. Create Team
            const { data: teamData, error: tErr } = await supabase
                .from("teams")
                .insert([{
                    name: newName,
                    unique_code,
                    payment_mode: "INDIVIDUAL",
                    max_members: 5,
                    leader_id: user.id
                }])
                .select()
                .single();

            if (tErr) {
                throw tErr;
            }

            // 2. Update User
            const { error: uErr } = await supabase
                .from("users")
                .update({ team_id: teamData.id, role: "LEADER" })
                .eq("id", user.id);

            if (uErr) {
                throw uErr;
            }

            alert(`Squad "${newName}" Initialized Successfully! 🎉`);
            setIsCreatingFirstSquad(false);
            setNewName("");
            await fetchTeamData();
        } catch (err: any) {
            const errorMsg = getFriendlyError(err);
            alert(`Failed to initialize squad: ${errorMsg}`);
            setError(errorMsg);
        } finally {
            setIsAddingMember(false);
        }
    };


    const handlePaymentSubmit = async () => {
        if (!paymentProof.transaction_id || !paymentProof.screenshot || !assignedQR) {
            alert("Please provide Transaction ID and Screenshot!");
            return;
        }

        try {
            setIsSubmittingPayment(true);

            // 1. Upload screenshot
            const fileExt = paymentProof.screenshot.name.split('.').pop();
            const fileName = `${user.id}_${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
                .from('payment-proofs')
                .upload(fileName, paymentProof.screenshot);

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(fileName);

            // 2. Submit payment action
            await submitPayment(user.id, {
                transaction_id: paymentProof.transaction_id,
                screenshot_url: publicUrl,
                assigned_qr_id: assignedQR.id
            });

            alert("Payment transmission encrypted and sent for verification! 🔒");
            setShowPaymentModal(false);
            setPaymentProof({ transaction_id: "", screenshot: null });
            await fetchTeamData();
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const openPaymentPortal = async () => {
        try {
            setLoading(true);
            // Calculate amount: if BULK leader, count UNPAID members. If INDIVIDUAL, just 800.
            let amount = 800;
            if (team?.payment_mode === 'BULK' && isLeader) {
                const unpaidCount = members.filter(m => m.status === 'UNPAID').length;
                amount = unpaidCount * 800;
                if (amount === 0) amount = 800; // Base case
            }
            setPaymentAmount(amount);
            const qr = await getNextAvailableQR(amount);
            setAssignedQR(qr);
            setShowPaymentModal(true);
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    if (loading || (!team && !error && !isCreatingFirstSquad)) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>;

    if (error) return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card p-8 max-w-md text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={() => router.push("/dashboard")} className="btn-primary">Back to Dashboard</button>
            </div>
        </div>
    );

    const isLeader = user?.role === "LEADER";

    return (
        <div className="min-h-screen text-white pt-28 pb-20 px-4 relative bg-transparent font-sans">
            <div className="container mx-auto max-w-6xl relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Team Management</h1>
                </div>

                {/* Team Overview */}
                {!isCreatingFirstSquad && (
                    <div className="glass-card p-6 mb-6">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Team Name</p>
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="bg-white/5 border border-cyan-500/50 rounded-xl px-4 py-2 text-2xl font-bold outline-none w-full max-w-md"
                                            placeholder="New squad name..."
                                        />
                                        <button onClick={handleUpdateTeamName} className="p-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors">
                                            <Check className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setIsEditingName(false)} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 group">
                                        <h2 className="text-3xl font-bold">{team?.name || "Squad Alpha"}</h2>
                                        {isLeader && team && (
                                            <button onClick={() => { setNewName(team.name); setIsEditingName(true); }} className="p-1.5 text-white/20 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {isLeader && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                    <span className="text-xs font-bold text-yellow-500 uppercase">Leader</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Team Code</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-mono font-bold text-cyan-400">{team?.unique_code || "------"}</p>
                                    <button onClick={handleCopyCode} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/40" />}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Members</p>
                                <p className="text-2xl font-bold">{members.length}/{team?.max_members || 5}</p>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Payment Mode</p>
                                <p className="text-2xl font-bold uppercase">{team?.payment_mode || "INDIVIDUAL"}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* SQUAD INCOMPLETE WARNING */}
                {!isCreatingFirstSquad && members.some(m => m.status === 'UNPAID') && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8 p-6 bg-red-500/10 border-2 border-dashed border-red-500/50 rounded-[2rem] text-center relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-red-500 mb-2">Squad Incomplete</h3>
                            <p className="text-xs text-red-200/60 uppercase font-black tracking-widest max-w-md mx-auto leading-relaxed">
                                This unit is not officially considered for the event until all members are verified. Ensure every warrior has transmitted their entry fee.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Join Requests & Add Member (Leader Only) */}
                {(isLeader && !isCreatingFirstSquad) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Add Member Manually */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-cyan-500/20">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-cyan-400" />
                                Add Squad Member
                            </h3>
                            <p className="text-xs text-white/40 mb-4 uppercase font-bold tracking-widest">Enroll participants directly into your squad</p>
                            <button
                                onClick={() => {
                                    setNewMemberData({ ...newMemberData, college: team?.leader?.college || "" });
                                    setShowAddMemberModal(true);
                                }}
                                disabled={members.length >= (team?.max_members || 5)}
                                className="w-full py-4 bg-cyan-500 text-black font-black rounded-xl text-[10px] uppercase hover:bg-cyan-400 transition-all disabled:opacity-20 flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <UserPlus className="w-4 h-4" /> Enroll New Member
                            </button>
                            {members.length >= team.max_members && (
                                <p className="text-[10px] text-red-500 font-bold uppercase text-center mt-3">Your squad has reached its limit</p>
                            )}
                        </motion.div>

                        {/* Public Requests */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-purple-400" />
                                Join Requests ({joinRequests.length})
                            </h3>

                            <div className="max-h-[250px] overflow-y-auto scrollbar-hide space-y-3">
                                {joinRequests.map((req: any) => (
                                    <div key={req.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                        <div>
                                            <p className="font-bold text-sm">{req.users.name}</p>
                                            <p className="text-[10px] text-white/40 uppercase font-mono">{req.users.reg_no}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleJoinRequest(req.id, 'ACCEPTED')}
                                                disabled={processingId === req.id}
                                                className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all disabled:opacity-50"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleJoinRequest(req.id, 'REJECTED')}
                                                disabled={processingId === req.id}
                                                className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {acceptedRequests.map((req: any) => (
                                    <div key={req.id} className="flex items-center justify-between p-4 bg-green-500/5 rounded-xl border border-green-500/20">
                                        <div>
                                            <p className="font-bold text-sm text-green-400">{req.users.name}</p>
                                            <p className="text-[9px] text-green-500/40 uppercase font-bold tracking-tighter italic">Accepted - Awaiting Payment</p>
                                        </div>
                                        <Clock className="w-4 h-4 text-green-500/40 animate-pulse" />
                                    </div>
                                ))}

                                {joinRequests.length === 0 && acceptedRequests.length === 0 && (
                                    <div className="h-full flex items-center justify-center text-white/20 text-[10px] uppercase font-bold tracking-widest italic pt-4">
                                        No active requests
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Payment Required Warning */}
                {user?.status === 'UNPAID' && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase text-white tracking-widest">Entry Fee Required</h4>
                                <p className="text-[10px] text-red-200 uppercase font-bold opacity-80">Your registration is inactive until the entry fee is transmitted and verified.</p>
                            </div>
                        </div>
                        <button
                            onClick={openPaymentPortal}
                            className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase rounded-lg hover:bg-neutral-200 transition-colors whitespace-nowrap"
                        >
                            Pay Now
                        </button>
                    </motion.div>
                )}

                {/* Payment Status & Actions */}
                {!isCreatingFirstSquad && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6 border-green-500/20">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-green-400" />
                                    Squad Integrity & Payment
                                </h3>
                                <p className="text-xs text-white/40 mt-1 uppercase font-bold tracking-widest">
                                    {team?.payment_mode === 'BULK'
                                        ? "Bulk Payment Protocol: Leader manages all dues"
                                        : "Individual Payment Protocol: Each warrior handles their own dues"}
                                </p>
                            </div>

                            {/* Logic to show "Pay Now" */}
                            {(user?.status === 'UNPAID' || (team?.payment_mode === 'BULK' && isLeader && members.some(m => m.status === 'UNPAID'))) && (
                                <button
                                    onClick={openPaymentPortal}
                                    className="px-6 py-3 bg-green-500 text-black font-black rounded-xl text-[10px] uppercase hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    {user?.status === 'UNPAID' ? "Transmit My Entry Fee" : "Transmit Squad Dues"}
                                </button>
                            )}
                        </div>

                        {/* Summary of payment status */}
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/5">
                            <div className="text-center">
                                <p className="text-[9px] uppercase font-black text-white/30 tracking-widest mb-1">Total Unit Size</p>
                                <p className="text-xl font-black">{members.length}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] uppercase font-black text-white/30 tracking-widest mb-1">Verified Warriors</p>
                                <p className="text-xl font-black text-green-400">{members.filter(m => m.status === 'APPROVED').length}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] uppercase font-black text-white/30 tracking-widest mb-1">Encryption Pending</p>
                                <p className="text-xl font-black text-yellow-400">{members.filter(m => ['PENDING', 'VERIFYING'].includes(m.status)).length}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] uppercase font-black text-white/30 tracking-widest mb-1">Dues Outstanding</p>
                                <p className="text-xl font-black text-red-500">{members.filter(m => m.status === 'UNPAID').length}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Team Members */}
                {!isCreatingFirstSquad && (
                    <div className="glass-card p-6 mb-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-400" />
                            Team Members
                        </h3>

                        <div className="space-y-3">
                            {members.map((member: any) => (
                                <div key={member.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
                                            {member.name[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold">{member.name}</p>
                                                {member.role === 'LEADER' && <Crown className="w-4 h-4 text-yellow-500" />}
                                            </div>
                                            <p className="text-xs text-white/60">{member.reg_no} • {member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${member.status === 'APPROVED' ? 'bg-green-500/20 text-green-500' :
                                            member.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' :
                                                'bg-yellow-500/20 text-yellow-500'
                                            }`}>
                                            {member.status}
                                        </div>

                                        {isLeader && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setEditingMember(member)}
                                                    className="p-2 text-white/20 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                                                    title="Edit member details"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>

                                                {member.role !== 'LEADER' && (
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id, member.name)}
                                                        disabled={processingId === member.id}
                                                        className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                        title="Remove from squad"
                                                    >
                                                        {processingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                {isCreatingFirstSquad ? (
                    <div className="glass-card p-12 text-center max-w-2xl mx-auto border-cyan-500/30">
                        <Users className="w-16 h-16 text-cyan-500 mx-auto mb-6" />
                        <h2 className="text-3xl font-black uppercase italic mb-2 tracking-tighter">Initialize Your Unit</h2>
                        <p className="text-white/40 text-sm mb-8">You are currently operating as a lone warrior. Deploy a squad designation to recruit allies and unlock deeper potential.</p>

                        <form onSubmit={handleCreateFirstSquad} className="space-y-4 max-w-sm mx-auto">
                            <input
                                required
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="ENTER SQUAD DESIGNATION..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center font-black uppercase tracking-widest outline-none focus:border-cyan-500 focus:bg-white/10 transition-all mb-4"
                            />
                            <button
                                disabled={isAddingMember}
                                className="w-full py-4 bg-cyan-500 text-black font-black rounded-2xl text-[10px] uppercase hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 group"
                            >
                                {isAddingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Confirm Deployment</>}
                            </button>
                        </form>
                    </div>
                ) : isLeader ? (
                    <div className="glass-card p-6 border-red-500/20 bg-red-500/5 mt-8">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-500">
                            <ShieldCheck className="w-5 h-5" />
                            Danger Zone
                        </h3>
                        <p className="text-xs text-white/40 mb-6">Disbanding the team will remove all members and delete the team record. This action is irreversible.</p>
                        <button
                            onClick={handleDisbandTeam}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-600 hover:text-white transition-all font-black uppercase tracking-widest text-xs"
                        >
                            <Trash2 className="w-5 h-5" />
                            Disband Squad
                        </button>
                    </div>
                ) : (
                    <div className="glass-card p-6 mt-8">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-white/40" />
                            Actions
                        </h3>
                        <button
                            onClick={handleLeaveTeam}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold"
                        >
                            <LogOut className="w-5 h-5" />
                            Leave Team
                        </button>
                    </div>
                )}
            </div>

            {/* Edit Member Modal */}
            <AnimatePresence>
                {editingMember && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-neutral-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-white uppercase italic">Edit Member Info</h2>
                                <button onClick={() => setEditingMember(null)}><X className="w-6 h-6 text-white/40" /></button>
                            </div>

                            <form onSubmit={handleUpdateMember} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">Full Name</label>
                                    <input
                                        required
                                        value={editingMember.name}
                                        onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">Reg No (Read-only)</label>
                                    <input
                                        disabled
                                        value={editingMember.reg_no}
                                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/20 font-mono"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/30">Branch</label>
                                        <input
                                            value={editingMember.branch || ''}
                                            onChange={(e) => setEditingMember({ ...editingMember, branch: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all font-mono text-xs uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/30">College</label>
                                        <input
                                            value={editingMember.college || ''}
                                            onChange={(e) => setEditingMember({ ...editingMember, college: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all font-mono text-xs uppercase"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSavingMember}
                                    className="w-full py-4 bg-cyan-500 text-black font-black rounded-xl text-xs uppercase hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSavingMember ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Intel</>}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Member Modal */}
            <AnimatePresence>
                {showAddMemberModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-neutral-900 border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-white uppercase italic">Enroll New Squad Member</h2>
                                <button onClick={() => setShowAddMemberModal(false)}><X className="w-6 h-6 text-white/40" /></button>
                            </div>

                            <form onSubmit={handleAddMemberByRegNo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">Registration ID</label>
                                    <input
                                        required
                                        value={newMemberData.reg_no}
                                        onChange={(e) => setNewMemberData({ ...newMemberData, reg_no: e.target.value.toUpperCase() })}
                                        placeholder="REQUIRED"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">Full Name</label>
                                    <input
                                        required
                                        value={newMemberData.name}
                                        onChange={(e) => setNewMemberData({ ...newMemberData, name: e.target.value })}
                                        placeholder="REQUIRED"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        value={newMemberData.email}
                                        onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                                        placeholder="REQUIRED"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">Phone (Optional)</label>
                                    <input
                                        value={newMemberData.phone}
                                        onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">College</label>
                                    <select
                                        value={newMemberData.college}
                                        onChange={(e) => setNewMemberData({ ...newMemberData, college: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all text-sm"
                                    >
                                        <option value="RGM" className="bg-neutral-900">RGM</option>
                                        <option value="OTHERS" className="bg-neutral-900">Others</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">Year</label>
                                    <select
                                        required
                                        value={newMemberData.year}
                                        onChange={(e) => setNewMemberData({ ...newMemberData, year: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all text-sm"
                                    >
                                        <option value="" className="bg-neutral-900">Select Year</option>
                                        {["I", "II", "III", "IV"].map(y => <option key={y} value={y} className="bg-neutral-900">{y}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2 md:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-white/30">Branch</label>
                                    <select
                                        required
                                        value={newMemberData.branch}
                                        onChange={(e) => setNewMemberData({ ...newMemberData, branch: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all text-sm"
                                    >
                                        <option value="" className="bg-neutral-900">Select Branch</option>
                                        {["CSE", "CSE-AIML", "CSE-DS", "CSE-BS", "EEE", "ECE", "MECH", "CIVIL", "OTHERS"].map(b => (
                                            <option key={b} value={b} className="bg-neutral-900">{b}</option>
                                        ))}
                                    </select>
                                </div>

                                {newMemberData.college === "OTHERS" && (
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/30">College Name</label>
                                        <input
                                            required
                                            value={newMemberData.other_college}
                                            onChange={(e) => setNewMemberData({ ...newMemberData, other_college: e.target.value })}
                                            placeholder="Enter your college name"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all"
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/30">Branch</label>
                                    <select
                                        required
                                        value={newMemberData.branch}
                                        onChange={(e) => setNewMemberData({ ...newMemberData, branch: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 transition-all text-sm"
                                    >
                                        <option value="" className="bg-neutral-900">Select Branch</option>
                                        {["CSE", "CSE-AIML", "CSE-DS", "CSE-BS", "EEE", "ECE", "MECH", "CIVIL", "OTHERS"].map(b => (
                                            <option key={b} value={b} className="bg-neutral-900">{b}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isAddingMember}
                                        className="w-full py-4 bg-cyan-500 text-black font-black rounded-xl text-xs uppercase hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isAddingMember ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Deploy Member</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Initialize First Squad - For Solo Members */}
            {isCreatingFirstSquad && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 max-w-md mx-auto"
                >
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-black uppercase mb-2">Initialize Your Squad</h2>
                        <p className="text-white/60 text-sm">You're currently a solo warrior. Create your squad to team up!</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreateFirstSquad} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-white/60 ml-1 font-bold">Squad Name</label>
                            <input
                                autoFocus
                                required
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Enter your squad name..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all text-white placeholder:text-white/30"
                            />
                            <p className="text-[10px] text-white/40 ml-1">Choose a unique name for your team</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isAddingMember || !newName.trim()}
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-black uppercase tracking-wide rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAddingMember ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Initializing...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-5 h-5" />
                                    Initialize Squad
                                </>
                            )}
                        </button>

                        <div className="pt-4 border-t border-white/10">
                            <p className="text-xs text-white/40 text-center">
                                After creating your squad, you'll become the team leader and can invite up to 4 more members.
                            </p>
                        </div>
                    </form>
                </motion.div>
            )}
            {/* Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-neutral-900 border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-cyan-500 to-purple-500" />

                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Secure Transmission</h2>
                                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mt-1">Payment Gateway Authorization</p>
                                </div>
                                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-white/40" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* QR Section */}
                                <div className="bg-black/40 rounded-3xl p-6 border border-white/5 text-center">
                                    <p className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-2">Amount to Transfer</p>
                                    <p className="text-5xl font-black text-white tracking-tighter mb-6">₹{paymentAmount}</p>

                                    <div className="bg-white p-3 rounded-2xl w-48 h-48 mx-auto mb-6 shadow-2xl">
                                        {assignedQR ? (
                                            <Image
                                                src={assignedQR.qr_image_url}
                                                alt="Payment QR"
                                                width={200}
                                                height={200}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-neutral-100 rounded-xl">
                                                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-white/60">{assignedQR?.upi_name || "Syncing..."}</p>
                                        <div
                                            className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl text-cyan-400 font-mono text-xs border border-white/10 cursor-pointer active:scale-95 transition-all"
                                            onClick={() => {
                                                if (assignedQR?.upi_id) {
                                                    navigator.clipboard.writeText(assignedQR.upi_id);
                                                    alert("UPI ID copied to clipboard!");
                                                }
                                            }}
                                        >
                                            {assignedQR?.upi_id || "..."} <Copy className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>

                                {/* Proof Submission */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Transaction ID (UTR)</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                            <input
                                                value={paymentProof.transaction_id}
                                                onChange={(e) => setPaymentProof({ ...paymentProof, transaction_id: e.target.value })}
                                                placeholder="ENTER 12-DIGIT UTR..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-green-500/50 transition-all font-mono tracking-widest"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/30 ml-1">Proof of Payment</label>
                                        <label className="h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-green-500/50 hover:bg-white/5 transition-all p-4 group">
                                            {paymentProof.screenshot ? (
                                                <div className="flex items-center gap-2 text-green-400 font-bold text-center text-xs">
                                                    <ShieldCheck className="w-5 h-5" /> {paymentProof.screenshot.name}
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 mb-2 text-white/20 group-hover:text-green-500 transition-colors" />
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-white/20 group-hover:text-white/60">Upload Authorization Screenshot</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => setPaymentProof({ ...paymentProof, screenshot: e.target.files?.[0] || null })}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePaymentSubmit}
                                    disabled={isSubmittingPayment}
                                    className="w-full py-5 bg-gradient-to-r from-green-600 to-cyan-600 text-black font-black uppercase tracking-widest rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                                >
                                    {isSubmittingPayment ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Finalizing Entry...</>
                                    ) : (
                                        <><ShieldCheck className="w-5 h-5" /> Encrypt & Submit Proof</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
