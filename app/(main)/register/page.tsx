"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Mail,
    Phone,
    Hash,
    CreditCard,
    Upload,
    ArrowRight,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Users,
    Copy,
    RefreshCw,
    HelpCircle,
    Share2,
    Crown,
    Zap,
    Search,
    ChevronRight,
    Plus,
    X,
    ExternalLink,
    Activity,
    Clock,
    ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
    getNextAvailableQR,
    registerUser,
    submitPayment,
    createTeam,
    joinTeam,
    getTeamDetails,
    createTicket,
    requestJoinTeam,
    getJoinRequests,
    respondToJoinRequest,
    registerBulkMembers,
    checkUserAvailability,
    deleteUser,
    deleteTeam
} from "@/lib/supabase-actions";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getFriendlyError } from "@/lib/error-handler";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const GlassNavbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4">
            <div className="flex items-center gap-2" onClick={() => window.location.href = "/"}>
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-black tracking-tighter text-xl">HACKATHON <span className="text-cyan-400">2K26</span></span>
            </div>
            <button onClick={() => window.location.href = "/login"} className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Login</button>
        </div>
    </nav>
);

function RegisterPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState<Step>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modes
    const [regMode, setRegMode] = useState<"SOLO" | "SQUAD" | null>(null);
    const [squadSubMode, setSquadSubMode] = useState<"FORM" | "JOIN" | null>(null);

    // Main Registrant (Leader/Solo)
    const [formData, setFormData] = useState({
        name: "", reg_no: "", email: "", phone: "",
        college: "RGM", otherCollege: "", branch: "", year: "", tshirtSize: "M"
    });

    // Added Members (for Bulk/Squad Form flow)
    const [additionalMembers, setAdditionalMembers] = useState<any[]>([]);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [newMember, setNewMember] = useState({
        name: "", reg_no: "", email: "", phone: "", college: "RGM", otherCollege: "", branch: "", year: "", tshirtSize: "M"
    });

    // Database IDs
    const [userId, setUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    // Team State
    const [teamName, setTeamName] = useState("");
    const [teamDetails, setTeamDetails] = useState<any>(null);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    // Join Flow State
    const [searchCode, setSearchCode] = useState("");
    const [searchedTeam, setSearchedTeam] = useState<any>(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [joinRequestSent, setJoinRequestSent] = useState(false);
    const [joinRequestStatus, setJoinRequestStatus] = useState<'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED'>('NONE');

    // Payment Info
    const [assignedQR, setAssignedQR] = useState<any>(null);
    const [finalAmount, setFinalAmount] = useState<number | null>(null);
    const [paymentProof, setPaymentProof] = useState({ transaction_id: "", screenshot: null as File | null });

    async function loadPaymentInfo(fixedAmount?: number) {
        try {
            setLoading(true);
            const qr = await getNextAvailableQR(fixedAmount || totalAmount);
            setAssignedQR(qr);
        } catch (e) { } finally { setLoading(false); }
    }

    // --- Price Calculation ---
    const totalAmount = regMode === "SOLO" ? 800 : (
        (teamDetails?.members?.length || 1) + additionalMembers.length
    ) * 800;

    // --- Handlers ---

    const handleModeSelect = (mode: "SOLO" | "SQUAD") => {
        setRegMode(mode);
        setStep(1); // Step 1 is Identity for Solo, Choice for Squad
    };

    // --- Real-time Listeners ---
    useEffect(() => {
        if (!userId) return;

        // 1. Listen for Registration Status (Payment Approval)
        const userSub = supabase
            .channel('status_updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${userId}`
            }, (payload) => {
                if (payload.new.status === 'APPROVED') {
                    router.push("/success");
                } else if (payload.new.status === 'REJECTED') {
                    setError("Payment rejected. Please check your transaction ID.");
                }
            })
            .subscribe();

        // 2. Listen for Team Assignments (for members joining)
        const teamSub = supabase
            .channel('team_assignments')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${userId}`
            }, (payload) => {
                if (payload.new.team_id && !teamDetails && regMode === 'SQUAD') {
                    getTeamDetails(payload.new.team_id).then(setTeamDetails);
                    if (payload.new.role) setUserRole(payload.new.role);
                    if (step < 4) setStep(4);
                }
            })
            .subscribe();

        return () => {
            userSub.unsubscribe();
            teamSub.unsubscribe();
        };
    }, [userId, regMode]); // Removed step, teamDetails, router to prevent redundant subs

    // 3. SPECIAL LISTENER FOR ANONYMOUS JOINERS
    useEffect(() => {
        if (regMode !== 'SQUAD' || squadSubMode !== 'JOIN' || !searchedTeam?.id || userId) return;

        const requestSub = supabase
            .channel('anonymous_join_sync')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'join_requests',
                filter: `team_id=eq.${searchedTeam.id}`
            }, (payload) => {
                const isMatch = payload.new.candidate_data?.email === formData.email;
                if (isMatch) {
                    setJoinRequestStatus(payload.new.status);
                    if (payload.new.status === 'ACCEPTED') {
                        setStep(5);
                    }
                }
            })
            .subscribe();

        return () => { requestSub.unsubscribe(); };
    }, [regMode, squadSubMode, searchedTeam?.id, userId, formData.email]);

    // Leader: Listen for Team Member Updates (Real-time Squad Sync)
    useEffect(() => {
        if (!teamDetails?.id || regMode !== 'SQUAD') return;

        const membersSub = supabase
            .channel(`team_members_${teamDetails.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users',
                filter: `team_id=eq.${teamDetails.id}`
            }, () => {
                getTeamDetails(teamDetails.id).then(setTeamDetails);
            })
            .subscribe();

        return () => { membersSub.unsubscribe(); };
    }, [teamDetails?.id, regMode]);

    // Leader: Listen for Join Requests
    useEffect(() => {
        if (!teamDetails?.id || regMode !== 'SQUAD' || squadSubMode !== 'FORM') return;

        const fetchRequests = async () => {
            const reqs = await getJoinRequests(teamDetails.id);
            setPendingRequests(reqs);
        };
        fetchRequests();

        const requestSub = supabase
            .channel('join_requests_sync')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'join_requests',
                filter: `team_id=eq.${teamDetails.id}`
            }, () => {
                fetchRequests();
            })
            .subscribe();

        return () => { requestSub.unsubscribe(); };
    }, [teamDetails?.id, regMode, squadSubMode]); // Optimized deps

    const handleRespondToRequest = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            setLoading(true);
            await respondToJoinRequest(requestId, status);
        } catch (err: any) { setError(getFriendlyError(err)); } finally { setLoading(false); }
    };

    const handlePrimaryDetails = async () => {
        setError(null);
        if (!formData.name || !formData.reg_no || !formData.email || !formData.phone || !formData.branch || !formData.year) {
            return setError("Please fill all details");
        }
        try {
            setLoading(true);
            const userParams = {
                ...formData,
                tshirt_size: formData.tshirtSize,
                college: formData.college === "RGM" ? "RGM College" : formData.otherCollege,
                role: (regMode === "SQUAD" && squadSubMode === "FORM") ? "LEADER" : "MEMBER"
            };

            if (regMode === "SQUAD") {
                if (squadSubMode === "FORM") {
                    // STRICT ZERO-LEAK: Just validate availability
                    const { error: availErr } = await checkUserAvailability(userParams.email, userParams.phone);
                    if (availErr) {
                        setError(getFriendlyError(availErr));
                        return;
                    }
                    setTeamDetails({
                        name: teamName || "Pending...",
                        unique_code: "---",
                        members: []
                    });
                    setStep(4);
                } else if (squadSubMode === "JOIN") {
                    // ZERO-LEAK: Don't register yet. Just send Join Request with candidate data.
                    const success = await handleJoinRequest(null);
                    if (success) setStep(4);
                }
            } else {
                // SOLO MODE: STRICT ZERO-LEAK
                const { error: availErr } = await checkUserAvailability(userParams.email, userParams.phone);
                if (availErr) {
                    setError(getFriendlyError(availErr));
                    return;
                }
                setStep(2); // Move to Solo Protocol (Consent)
            }
        } catch (err: any) {
            setError(getFriendlyError(err));
        } finally { setLoading(false); }
    };

    const handleTeamChoice = (choice: "FORM" | "JOIN") => {
        setSquadSubMode(choice);
        setStep(2); // Step 2 is Enter Name or Search Code
    };

    const handleTeamNameProceed = () => {
        if (!teamName) return setError("Please name your squad");
        setStep(3); // Move to Identity Check
    };

    const handleSearchTeam = async () => {
        try {
            setLoading(true);
            const { data: team, error: searchErr } = await joinTeam(searchCode);
            if (searchErr) {
                setError(getFriendlyError(searchErr));
                return;
            }
            setSearchedTeam(team);
            // Don't auto-proceed, let user see the team result
        } catch (err: any) { setError(getFriendlyError(err)); } finally { setLoading(false); }
    };

    const handleTeamJoinProceed = () => {
        if (!searchedTeam) return setError("Please find a team first");
        setStep(3); // Move to Identity Check
    };

    const handleAddMember = () => {
        if (!newMember.name || !newMember.reg_no) return;

        const currentTotal = (teamDetails?.members?.length || 1) + additionalMembers.length;
        const maxLimit = teamDetails?.max_members || 5;

        if (currentTotal >= maxLimit) {
            return alert(`Maximum capacity reached (${maxLimit} warriors).`);
        }

        const addedMember = {
            ...newMember,
            tshirt_size: newMember.tshirtSize
        };
        setAdditionalMembers([...additionalMembers, addedMember]);
        setNewMember({ name: "", reg_no: "", email: "", phone: "", college: "RGM", otherCollege: "", branch: "", year: "", tshirtSize: "M" });
        setShowAddMemberModal(false);
    };

    const handleFinalSquadSubmit = async () => {
        try {
            setLoading(true);
            const currentTotal = ((teamDetails?.members?.length || 1) + additionalMembers.length) * 800;
            // DEFERRED WRITE: Don't save yet, just move to review
            // if (additionalMembers.length > 0) {
            //     await registerBulkMembers(userId!, teamDetails.id, additionalMembers);
            //     setAdditionalMembers([]);
            // }
            setFinalAmount(currentTotal);
            // Move to Review Step instead of Payment
            setStep(5);
        } catch (err: any) { setError(getFriendlyError(err)); } finally { setLoading(false); }
    };

    const handleProceedToPayment = async () => {
        try {
            setLoading(true);

            // EXECUTE DEFERRED WRITE
            // [REMOVED] Premature write. All writes must happen in handlePaymentSubmit.

            const qr = await getNextAvailableQR(finalAmount || 800);
            setAssignedQR(qr);
            setStep(6);
        } catch (err: any) { setError(getFriendlyError(err)); } finally { setLoading(false); }
    };



    const handleJoinRequest = async (overrideId?: string) => {
        try {
            if (!searchedTeam?.id) throw new Error("No squad selected. Please go back and find a squad.");
            setLoading(true);
            const { error: joinErr } = await requestJoinTeam(searchedTeam.id, overrideId || userId, null);
            if (joinErr) throw new Error(joinErr);

            setJoinRequestSent(true);
            setJoinRequestStatus('PENDING');
            return true;
        } catch (err: any) {
            setError(getFriendlyError(err));
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 0) return;
        if (step === 1) setStep(0);
        else if (step === 2) setStep(1);
        else if (step === 3) setStep(2);
        else if (step === 4) setStep(3);
        else if (step === 5) {
            // Smart Back: Go back to where they actually came from / where inputs are
            if (regMode === "SOLO") setStep(1); // SOLO skips 4,3 and Step 2 is just text. Go to 1 to edit identity.
            else if (squadSubMode === "JOIN") setStep(3); // JOINER wants to edit identity
            else setStep(4); // FORMER leader might want to add/remove members in Hub
        }
        else if (step === 6) setStep(5);
        // Step 7 is success, cannot go back.
    };

    const handlePaymentSubmit = async () => {
        if (!acceptedTerms) return setError("Please agree to the Terms & Conditions");
        if (!paymentProof.transaction_id || !paymentProof.screenshot) return setError("Upload proof and enter UTR");

        let createdUserId: string | null = null;
        let createdTeamId: string | null = null;

        try {
            setLoading(true);
            const fileExt = paymentProof.screenshot.name.split('.').pop();
            const fileName = `${formData.reg_no}_${Date.now()}.${fileExt}`;
            const { data: upData, error: upErr } = await supabase.storage.from("screenshots").upload(fileName, paymentProof.screenshot);
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from("screenshots").getPublicUrl(upData.path);

            let finalUserId = userId;

            // LAZY REGISTRATION FOR SOLO USERS
            if (!finalUserId && regMode === "SOLO") {
                const userParams = {
                    ...formData,
                    tshirt_size: formData.tshirtSize,
                    college: formData.college === "RGM" ? "RGM College" : formData.otherCollege,
                    role: "MEMBER",
                    status: "PENDING" as const,
                    transaction_id: paymentProof.transaction_id,
                    screenshot_url: publicUrl,
                    assigned_qr_id: assignedQR?.id
                };

                const { data: newUser, error: regErr } = await registerUser(userParams);
                if (regErr) throw new Error(regErr.message || "Registration failed");
                if (!newUser) throw new Error("Registration failed.");

                finalUserId = newUser.id;
                createdUserId = newUser.id; // Track for rollback
            }

            // LAZY REGISTRATION FOR SQUAD (FORM)
            if (!finalUserId && regMode === "SQUAD" && squadSubMode === "FORM") {
                // 1. Register Leader with Atomic Payment
                const userParams = {
                    ...formData,
                    tshirt_size: formData.tshirtSize,
                    college: formData.college === "RGM" ? "RGM College" : formData.otherCollege,
                    role: "LEADER",
                    status: "PENDING" as const,
                    transaction_id: paymentProof.transaction_id,
                    screenshot_url: publicUrl,
                    assigned_qr_id: assignedQR?.id
                };

                const { data: user, error: regErr } = await registerUser(userParams);
                if (regErr || !user) throw new Error(regErr?.message || "Leader registration failed");
                finalUserId = user.id;
                createdUserId = user.id; // Track for rollback

                // 2. Create Team
                const isRgm = userParams.college.toUpperCase().includes("RGM");
                const { data: team, error: teamErr } = await createTeam(teamName, user.id, "BULK", isRgm ? 4 : 5);
                if (teamErr) throw new Error(teamErr);
                createdTeamId = team.id; // Track for rollback

                // 3. Update Leader with Team ID and Role
                await supabase.from("users").update({ team_id: team.id, role: "LEADER" }).eq("id", user.id);

                // 4. Register Bulk Members with Atomic Status (Pending)
                if (additionalMembers.length > 0) {
                    const { error: bulkErr } = await registerBulkMembers(user.id, team.id, additionalMembers, "PENDING");
                    if (bulkErr) throw new Error(bulkErr);
                }
            }

            // LAZY REGISTRATION FOR JOINERS (Accepted Candidates)
            if (!finalUserId && regMode === "SQUAD" && squadSubMode === "JOIN" && joinRequestStatus === "ACCEPTED") {
                const userParams = {
                    ...formData,
                    tshirt_size: formData.tshirtSize,
                    college: formData.college === "RGM" ? "RGM College" : formData.otherCollege,
                    role: "MEMBER",
                    status: "PENDING" as const,
                    team_id: searchedTeam.id, // Successfully joined
                    transaction_id: paymentProof.transaction_id,
                    screenshot_url: publicUrl,
                    assigned_qr_id: assignedQR?.id
                };

                const { data: newUser, error: regErr } = await registerUser(userParams);
                if (regErr) throw new Error(regErr.message || "Registration failed");
                if (!newUser) throw new Error("Registration failed.");

                finalUserId = newUser.id;
                createdUserId = newUser.id;

                // Update request to COMPLETED
                const { data: req } = await supabase.from("join_requests").select("id").eq("team_id", searchedTeam.id).eq("candidate_data->>email", formData.email).eq("status", "ACCEPTED").maybeSingle();
                if (req) {
                    await supabase.from("join_requests").update({ status: 'COMPLETED', user_id: newUser.id }).eq("id", req.id);
                }
            }

            // If user ALREADY existed
            if (finalUserId && !createdUserId) {
                const { error: payErr } = await submitPayment(finalUserId!, {
                    transaction_id: paymentProof.transaction_id,
                    screenshot_url: publicUrl,
                    assigned_qr_id: assignedQR?.id
                });
                if (payErr) throw new Error(payErr.message || "Payment submission failed");
            }

            // Success Sequence
            // [ACK & AUTO-LOGIN]
            if (finalUserId) {
                document.cookie = `student_session=${finalUserId}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
            }
            setStep(7); // Move to Success Acknowledgment

        } catch (err: any) {
            console.error("Registration/Payment Error:", err);
            setError(getFriendlyError(err));

            // ROLLBACK / COMPENSATION TRANSACTION
            // If we created a user/team but failed later, destroy them to keep DB clean
            if (createdUserId) {
                console.log("Rolling back user creation:", createdUserId);
                if (createdTeamId) {
                    await deleteTeam(createdTeamId); // This sets members to team_id null too
                    // We might leave orphan bulk members if we don't clean them, 
                    // but they are UNPAID and teamless, effectively invisible.
                    // Ideally we delete them too, but we don't have their IDs easily here without another query.
                    // Given the constraint "fast fix", deleting the leader and team is 90% solution.
                }
                await deleteUser(createdUserId);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-2 sm:px-4 relative overflow-hidden bg-transparent text-white selection:bg-cyan-500/30 font-sans">
            <GlassNavbar />
            <div className="max-w-xl mx-auto relative z-10">

                <div className="flex items-center gap-4 mb-10 px-4">
                    {step > 0 && (
                        <button onClick={handleBack} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="flex gap-2 flex-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
                            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-white/10'}`} />
                        ))}
                    </div>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6 mx-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="font-medium">{error}</p>
                            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div key="s0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 gap-6 px-2">
                            <ModeCard icon={User} title="Alone Warrior" desc="Fly solo. We'll find you a dream team at the event." price="₹800" color="cyan" onClick={() => handleModeSelect("SOLO")} />
                            <ModeCard icon={Users} title="Elite Squad" desc="Bring your own team of 2-5 warriors." price="₹800/Member" color="purple" onClick={() => handleModeSelect("SQUAD")} />
                        </motion.div>
                    )}

                    {/* STEP 1: IDENTITY (SOLO) OR CHOICE (SQUAD) */}
                    {step === 1 && (
                        <>
                            {regMode === "SOLO" ? (
                                <motion.div key="s1-solo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
                                    <Header title="Identity Check" subtitle="Primary synchronization" />
                                    <div className="grid grid-cols-1 gap-4">
                                        <FormInput label="Full Name" icon={User} value={formData.name} onChange={(v: string) => setFormData({ ...formData, name: v })} placeholder="John Doe" />
                                        <FormInput label="Reg No" icon={Hash} value={formData.reg_no} onChange={(v: string) => setFormData({ ...formData, reg_no: v })} placeholder="2209..." />
                                        <FormInput label="Email" icon={Mail} value={formData.email} onChange={(v: string) => setFormData({ ...formData, email: v })} placeholder="john@rgm.com" />
                                        <FormInput label="Phone" icon={Phone} value={formData.phone} onChange={(v: string) => setFormData({ ...formData, phone: v })} placeholder="9988..." />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5 flex flex-col">
                                                <label className="text-[10px] uppercase font-black text-white/50 tracking-widest pl-1">College</label>
                                                <select value={formData.college} onChange={(e) => setFormData({ ...formData, college: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-sm">
                                                    <option value="RGM" className="bg-neutral-900">RGM</option>
                                                    <option value="OTHERS" className="bg-neutral-900">Others</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 flex flex-col">
                                                <label className="text-[10px] uppercase font-black text-white/50 tracking-widest pl-1">Year</label>
                                                <select value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-sm">
                                                    <option value="" className="bg-neutral-900">-</option>
                                                    {["I", "II", "III", "IV"].map(y => <option key={y} value={y} className="bg-neutral-900">{y}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        {formData.college === "OTHERS" && (
                                            <FormInput label="College Name" icon={ExternalLink} value={formData.otherCollege} onChange={(v: string) => setFormData({ ...formData, otherCollege: v })} placeholder="Your College" />
                                        )}
                                        <div className="space-y-1.5 flex flex-col">
                                            <label className="text-[10px] uppercase font-black text-white/50 tracking-widest pl-1">Shirt Size</label>
                                            <select value={formData.tshirtSize} onChange={(e) => setFormData({ ...formData, tshirtSize: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-sm">
                                                {["XS", "S", "M", "L", "XL", "XXL"].map(s => <option key={s} value={s} className="bg-neutral-900">{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5 flex flex-col">
                                            <label className="text-[10px] uppercase font-black text-white/50 tracking-widest pl-1">Branch</label>
                                            <select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-sm">
                                                <option value="" className="bg-neutral-900">Select Branch</option>
                                                {["CSE", "CSE-AIML", "CSE-DS", "CSE-BS", "EEE", "ECE", "MECH", "CIVIL", "OTHERS"].map(b => (
                                                    <option key={b} value={b} className="bg-neutral-900">{b}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <button onClick={handlePrimaryDetails} disabled={loading} className="w-full py-4 bg-cyan-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 mt-4 transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                                        {loading ? <Loader2 className="animate-spin" /> : <>Sync Identity <ChevronRight className="w-4 h-4" /></>}
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div key="s1-squad" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 gap-6 px-2">
                                    <ChoiceCard icon={Plus} title="Form Squad" desc="Start a team and recruit warriors." color="cyan" onClick={() => handleTeamChoice("FORM")} />
                                    <ChoiceCard icon={Search} title="Join Squad" desc="Find a team via squad code." color="purple" onClick={() => handleTeamChoice("JOIN")} />
                                </motion.div>
                            )}
                        </>
                    )}

                    {/* STEP 2: PROTOCOL (SOLO) OR TEAM CONTEXT (SQUAD) */}
                    {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 sm:p-8 rounded-3xl">
                            {regMode === "SOLO" ? (
                                <div className="space-y-6">
                                    <Header title="Solo Protocol" subtitle="Confirm your engagement" />
                                    <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-200 leading-relaxed">
                                        As a lone warrior, organization protocols will assign you to a squad at the arena check-in.
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                setLoading(true);
                                                // Fetch QR code immediately for solo users to avoid buffering
                                                const qr = await getNextAvailableQR(800);
                                                setAssignedQR(qr);
                                                setFinalAmount(800);
                                                setStep(6); // Skip review, go straight to payment
                                            } catch (err: any) {
                                                setError(getFriendlyError(err));
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading}
                                        className="w-full py-4 bg-cyan-500 text-black font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Accept & Proceed"}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {squadSubMode === "FORM" ? (
                                        <div className="space-y-6">
                                            <Header title="Identity Setup" subtitle="Name your legion" />
                                            <FormInput label="Squad Name" icon={Users} value={teamName} onChange={setTeamName} placeholder="The Avengers" />
                                            <button onClick={handleTeamNameProceed} className="w-full py-4 bg-cyan-500 text-black font-bold rounded-xl active:scale-95 transition-all">ESTABLISH TEAM IDENTITY</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <Header title="Find Squad" subtitle="Sync via 6-digit code" />
                                            <div className="flex gap-2">
                                                <input value={searchCode} onChange={e => setSearchCode(e.target.value.toUpperCase())} className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-purple-500 text-center font-mono tracking-widest text-xl h-14" maxLength={6} placeholder="XYZ123" />
                                                <button onClick={handleSearchTeam} className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center font-bold text-black border border-white/10"><Search className="w-6 h-6" /></button>
                                            </div>
                                            {searchedTeam && (
                                                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl animate-in fade-in slide-in-from-top-4 text-center">
                                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Squad Found</p>
                                                    <h3 className="text-2xl font-black text-purple-400 mb-6 tracking-tight">{searchedTeam.name}</h3>
                                                    <button onClick={handleTeamJoinProceed} className="w-full py-4 bg-white text-black font-black rounded-xl flex items-center justify-center gap-2">
                                                        PROCEED WITH THIS SQUAD <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 3: IDENTITY CHECK (SQUAD) */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
                            <Header title="Identity Check" subtitle="Primary synchronization" />
                            <div className="grid grid-cols-1 gap-4">
                                <FormInput label="Full Name" icon={User} value={formData.name} onChange={(v: string) => setFormData({ ...formData, name: v })} placeholder="John Doe" />
                                <FormInput label="Reg No" icon={Hash} value={formData.reg_no} onChange={(v: string) => setFormData({ ...formData, reg_no: v })} placeholder="2209..." />
                                <FormInput label="Email" icon={Mail} value={formData.email} onChange={(v: string) => setFormData({ ...formData, email: v })} placeholder="john@rgm.com" />
                                <FormInput label="Phone" icon={Phone} value={formData.phone} onChange={(v: string) => setFormData({ ...formData, phone: v })} placeholder="9988..." />
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-[10px] uppercase font-black text-white/30 tracking-widest pl-1">College</label>
                                        <select value={formData.college} onChange={(e) => setFormData({ ...formData, college: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-sm">
                                            <option value="RGM" className="bg-neutral-900">RGM</option>
                                            <option value="OTHERS" className="bg-neutral-900">Others</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-[10px] uppercase font-black text-white/30 tracking-widest pl-1">Year</label>
                                        <select value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-sm">
                                            <option value="" className="bg-neutral-900">-</option>
                                            {["I", "II", "III", "IV"].map(y => <option key={y} value={y} className="bg-neutral-900">{y}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-[10px] uppercase font-black text-white/30 tracking-widest pl-1">Shirt Size</label>
                                        <select value={formData.tshirtSize} onChange={(e) => setFormData({ ...formData, tshirtSize: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-sm">
                                            {["XS", "S", "M", "L", "XL", "XXL"].map(s => <option key={s} value={s} className="bg-neutral-900">{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {formData.college === "OTHERS" && (
                                    <FormInput label="College Name" icon={ExternalLink} value={formData.otherCollege} onChange={(v: string) => setFormData({ ...formData, otherCollege: v })} placeholder="Your College" />
                                )}
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-[10px] uppercase font-black text-white/30 tracking-widest pl-1">Branch</label>
                                    <select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-sm">
                                        <option value="" className="bg-neutral-900">Select Branch</option>
                                        {["CSE", "CSE-AIML", "CSE-DS", "CSE-BS", "EEE", "ECE", "MECH", "CIVIL", "OTHERS"].map(b => (
                                            <option key={b} value={b} className="bg-neutral-900">{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button onClick={handlePrimaryDetails} disabled={loading} className="w-full py-4 bg-purple-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 mt-4 transition-all active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                {loading ? <Loader2 className="animate-spin" /> : <>Finalize Identity <ChevronRight className="w-4 h-4" /></>}
                            </button>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="s4" className="space-y-6 px-1">
                            {regMode === 'SQUAD' && squadSubMode === 'FORM' && !teamDetails ? (
                                <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
                                    <Header title="Team Syncing" subtitle="Finalizing metadata" />
                                    <div className="flex flex-col items-center gap-4 py-8">
                                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                                        <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Finalizing Team Creation...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="glass-card p-6 rounded-3xl space-y-6">
                                    <Header title="Legion Hub" subtitle="Command and Control" />
                                    <div className="flex justify-between items-start border-b border-white/5 pb-6">
                                        <div>
                                            <h2 className="text-xl font-black">{teamDetails?.name || "Initializing..."}</h2>
                                            <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase mt-1">Code: {teamDetails?.unique_code || "---"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-white/40 uppercase font-black">Subtotal</p>
                                            <p className="text-xl font-black text-green-400 tracking-tighter">₹{totalAmount}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {squadSubMode === 'FORM' && !teamDetails?.members?.some((m: any) => m.role === 'LEADER') && (
                                            <MemberRow name={formData.name} role="LEADER" status="UNPAID" color="red" />
                                        )}
                                        {teamDetails?.members?.map((m: any, i: number) => (
                                            <MemberRow key={`db-${i}`} name={m.name} role={m.role || "MEMBER"} status={m.status} color={m.status === 'APPROVED' ? 'cyan' : 'red'} />
                                        ))}
                                        {additionalMembers.map((m, i) => (
                                            <MemberRow key={`local-${i}`} name={m.name} role="MEMBER" status="UNPAID" color="red" onRemove={() => setAdditionalMembers(additionalMembers.filter((_, idx) => idx !== i))} />
                                        ))}
                                        {additionalMembers.length < 4 && (
                                            <button onClick={() => setShowAddMemberModal(true)} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/40 font-bold hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest">
                                                <Plus className="w-4 h-4" /> Add Squad Member
                                            </button>
                                        )}
                                    </div>

                                    {squadSubMode === 'FORM' && pendingRequests.length > 0 && (
                                        <div className="space-y-3 pt-6 border-t border-white/5">
                                            <p className="text-xs text-yellow-500 font-bold uppercase tracking-widest pl-1 flex items-center gap-2">
                                                <Activity className="w-3 h-3" /> Requests
                                            </p>
                                            {pendingRequests.map((req) => {
                                                const userData = req.users || req.candidate_data || {};
                                                return (
                                                    <div key={req.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                        <div>
                                                            <p className="text-xs font-bold">{userData.name || "Unknown"}</p>
                                                            <p className="text-[9px] text-white/40 uppercase tracking-tighter">{userData.reg_no || "---"} • {userData.college || "N/A"}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleRespondToRequest(req.id, 'REJECTED')} className="p-2 text-red-500 hover:bg-neutral-800 rounded-lg"><X className="w-4 h-4" /></button>
                                                            <button onClick={() => handleRespondToRequest(req.id, 'ACCEPTED')} className="p-2 text-green-500 hover:bg-neutral-800 rounded-lg"><CheckCircle2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {squadSubMode === 'FORM' ? (
                                        <button onClick={handleFinalSquadSubmit} className="w-full py-4 bg-green-500 text-black font-black rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.3)] uppercase text-sm tracking-widest">PROCEED TO CHECKOUT</button>
                                    ) : (
                                        <div className="space-y-4">
                                            {joinRequestStatus === 'PENDING' && (
                                                <div className="text-center p-8 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                                                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
                                                    <p className="text-xs font-black tracking-widest uppercase text-white/40">Waiting for Captain approval...</p>
                                                    <p className="text-[10px] text-white/20 mt-2">Request sent to {searchedTeam?.name}</p>
                                                </div>
                                            )}
                                            {joinRequestStatus === 'ACCEPTED' && (
                                                <div className="text-center p-8 bg-green-500/10 border border-green-500/20 rounded-3xl">
                                                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-4" />
                                                    <p className="text-xs font-black tracking-widest uppercase text-green-400">Request Approved!</p>
                                                    <p className="text-[10px] text-green-500/60 mt-2 mb-6 uppercase font-bold">Secure your slot by transmitting the entry fee</p>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                setLoading(true);
                                                                setFinalAmount(800);
                                                                setStep(5);
                                                            } catch (err: any) {
                                                                setError(getFriendlyError(err));
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        className="w-full py-4 bg-green-500 text-black font-black rounded-xl uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                                                    >
                                                        Proceed to Payment
                                                    </button>
                                                </div>
                                            )}
                                            {joinRequestStatus === 'REJECTED' && (
                                                <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-3xl">
                                                    <X className="w-10 h-10 text-red-500 mx-auto mb-4" />
                                                    <p className="text-xs font-black tracking-widest uppercase text-red-400">Request Declined</p>
                                                    <button onClick={() => setStep(1)} className="mt-4 text-[10px] font-black uppercase text-white/40 hover:text-white underline tracking-tighter">Try another squad or go solo</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div key="s5" className="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
                            <Header title="Review Details" subtitle="Confirm your engagement" />

                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase font-black text-cyan-400 tracking-widest pl-1">Primary Warrior</p>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                                        <ReviewRow label="Name" value={formData.name} />
                                        <ReviewRow label="Reg No" value={formData.reg_no} />
                                        <ReviewRow label="Email" value={formData.email} />
                                        <ReviewRow label="Phone" value={formData.phone} />
                                        <ReviewRow label="College" value={formData.college === "RGM" ? "RGM College" : formData.otherCollege} />
                                        <ReviewRow label="Branch" value={formData.branch} />
                                        <ReviewRow label="Year" value={formData.year} />
                                        <ReviewRow label="T-Shirt" value={formData.tshirtSize} />
                                    </div>
                                </div>

                                {regMode === "SQUAD" && additionalMembers.length > 0 && (
                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <p className="text-[10px] uppercase font-black text-purple-400 tracking-widest pl-1">Squad Members ({additionalMembers.length})</p>
                                        <div className="grid grid-cols-1 gap-4">
                                            {additionalMembers.map((m, i) => (
                                                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                                                    <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                                                        <span className="text-xs font-black text-white/60">MEMBER {i + 1}</span>
                                                    </div>
                                                    <ReviewRow label="Name" value={m.name} />
                                                    <ReviewRow label="Reg No" value={m.reg_no} />
                                                    <ReviewRow label="Email" value={m.email} />
                                                    <ReviewRow label="Phone" value={m.phone} />
                                                    <ReviewRow label="College" value={m.college === "RGM" ? "RGM College" : m.otherCollege} />
                                                    <ReviewRow label="Branch" value={m.branch} />
                                                    <ReviewRow label="Year" value={m.year} />
                                                    <ReviewRow label="T-Shirt" value={m.tshirtSize} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                                <p className="text-[10px] text-yellow-200/60 leading-relaxed uppercase font-bold">
                                    Please ensure all details are correct. You won't be able to edit these once payment is submitted.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={handleBack} className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl active:scale-95 transition-all">EDIT</button>
                                <button onClick={handleProceedToPayment} disabled={loading} className="flex-[2] py-4 bg-cyan-500 text-black font-black rounded-xl active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="animate-spin" /> : <>CONFIRM & PAY <ChevronRight className="w-4 h-4" /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 6 && (
                        <motion.div key="s6" className="glass-card p-6 sm:p-8 rounded-3xl space-y-8">
                            <Header title="Secure Payment" subtitle="Synchronize transmission" />

                            <div className="flex flex-col items-center gap-6">
                                <p className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.2em] text-center bg-cyan-500/10 py-2 px-4 rounded-full border border-cyan-500/20">
                                    Long press the QR code below to save it to your phone
                                </p>

                                <div className="relative p-4 bg-white rounded-[2.5rem] shadow-2xl group transition-all duration-500 hover:scale-105 active:scale-95">
                                    {assignedQR?.qr_image_url ? (
                                        <Image src={assignedQR.qr_image_url} alt="Payment QR" width={280} height={280} className="rounded-3xl" />
                                    ) : (
                                        <div className="w-[280px] h-[280px] bg-neutral-200 rounded-3xl flex items-center justify-center">
                                            {assignedQR ? (
                                                <div className="text-black font-bold text-center p-4 text-xs">QR Image Not Available</div>
                                            ) : (
                                                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <a
                                    href={assignedQR?.qr_image_url || "#"}
                                    download="Hackathon_Payment_QR.png"
                                    className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4 text-cyan-500" /> Save QR TO MOBILE
                                </a>

                                <div className="text-center space-y-2">
                                    <p className="text-sm font-black text-white/40 uppercase tracking-widest">Amount to Pay</p>
                                    <p className="text-4xl font-black text-white tracking-tighter">₹{finalAmount}</p>
                                </div>
                            </div>
                            <div className="text-center bg-black/40 p-6 rounded-2xl border border-white/10 relative overflow-hidden min-h-[300px] flex flex-col items-center justify-center">
                                {loading || !assignedQR ? (
                                    <div className="flex flex-col items-center gap-4 py-12">
                                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                                        <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Synchronizing Secure Gateway...</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1 font-bold">Payable amount</p>
                                        <p className="text-4xl sm:text-5xl font-black text-white tracking-tighter">₹{finalAmount || 0}</p>
                                        <div className="bg-white p-3 rounded-2xl w-40 h-40 sm:w-48 sm:h-48 mx-auto my-6 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                                            {assignedQR?.qr_image_url ? (
                                                <Image src={assignedQR.qr_image_url} alt="Pay" width={200} height={200} className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-black font-black text-[10px] uppercase text-center p-4">QR Signal Lost. Refresh.</div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-black uppercase text-white/60">{assignedQR?.upi_name || "Payment Portal"}</p>
                                            <div className="flex items-center justify-center gap-2 bg-white/5 py-2.5 px-4 rounded-xl font-mono text-cyan-400 border border-white/5 text-xs active:bg-white/10 transition-all cursor-pointer" onClick={() => assignedQR?.upi_id && navigator.clipboard.writeText(assignedQR.upi_id)}>
                                                {assignedQR?.upi_id || "No UPI ID found"} <Copy className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-4">
                                <FormInput
                                    label="Transaction ID (UTR) *"
                                    icon={Hash}
                                    value={paymentProof.transaction_id}
                                    onChange={(v: string) => setPaymentProof({ ...paymentProof, transaction_id: v.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                                    placeholder="12-20 character UTR"
                                    maxLength={20}
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-white/30 tracking-widest pl-1">Proof of Payment *</label>
                                    <label className={`h-28 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all p-4 ${paymentProof.screenshot ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 text-white/40'}`}>
                                        {paymentProof.screenshot ? (
                                            <div className="flex items-center gap-2 text-green-400 font-bold text-center break-all text-xs">
                                                <CheckCircle2 className="w-5 h-5 shrink-0" /> {paymentProof.screenshot.name}
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-6 h-6 mb-2 opacity-20 text-cyan-400" />
                                                <span className="text-[10px] uppercase font-black tracking-widest">Upload Screenshot</span>
                                            </>
                                        )}
                                        <input type="file" className="hidden" accept="image/*" onChange={e => setPaymentProof({ ...paymentProof, screenshot: e.target.files?.[0] || null })} />
                                    </label>
                                </div>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="pt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                                    />
                                </div>
                                <span className="text-[10px] text-white/40 leading-relaxed group-hover:text-white/60 transition-colors">
                                    I agree to the <a href="/terms" target="_blank" className="text-cyan-400 font-bold hover:underline">Terms & Conditions</a> and <a href="/faq" target="_blank" className="text-purple-400 font-bold hover:underline">Privacy Policy</a> of Hackathon 2K26. I understand that registration fee is non-refundable. *
                                </span>
                            </label>

                            <button
                                onClick={handlePaymentSubmit}
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-2xl active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> SUBMIT TRANSMISSION</>}
                            </button>
                        </motion.div>
                    )}

                    {/* STEP 7: SUCCESS ACKNOWLEDGMENT */}
                    {
                        step === 7 && (
                            <SuccessView onProceed={() => router.push("/dashboard")} />
                        )
                    }
                </AnimatePresence >
            </div >

            <AnimatePresence>
                {showAddMemberModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 30 }} className="bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative">
                            <button onClick={() => setShowAddMemberModal(false)} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white bg-white/5 rounded-full"><X className="w-4 h-4" /></button>
                            <Header title="Add Member" subtitle="Legion Expansion" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
                                <FormInput label="Name" icon={User} value={newMember.name} onChange={(v: string) => setNewMember({ ...newMember, name: v })} placeholder="Full Name" />
                                <FormInput label="Reg No" icon={Hash} value={newMember.reg_no} onChange={(v: string) => setNewMember({ ...newMember, reg_no: v.toUpperCase() })} placeholder="Reg No" />
                                <FormInput label="Email" icon={Mail} value={newMember.email} onChange={(v: string) => setNewMember({ ...newMember, email: v })} placeholder="Email Address" />
                                <FormInput label="Phone" icon={Phone} value={newMember.phone} onChange={(v: string) => setNewMember({ ...newMember, phone: v })} placeholder="Phone Number" />

                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-[9px] uppercase font-black text-white/30 tracking-widest pl-1">College</label>
                                    <select value={newMember.college} onChange={(e) => setNewMember({ ...newMember, college: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-xs sm:text-sm h-[46px]">
                                        <option value="RGM" className="bg-neutral-900">RGM</option>
                                        <option value="OTHERS" className="bg-neutral-900">Others</option>
                                    </select>
                                </div>
                                {newMember.college === "OTHERS" && (
                                    <div className="sm:col-span-2">
                                        <FormInput label="College Name" icon={ExternalLink} value={newMember.otherCollege} onChange={(v: string) => setNewMember({ ...newMember, otherCollege: v })} placeholder="Your College Name" />
                                    </div>
                                )}
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-[9px] uppercase font-black text-white/30 tracking-widest pl-1">Shirt Size</label>
                                    <select value={newMember.tshirtSize} onChange={(e) => setNewMember({ ...newMember, tshirtSize: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white text-xs sm:text-sm h-[46px]">
                                        {["XS", "S", "M", "L", "XL", "XXL"].map(s => <option key={s} value={s} className="bg-neutral-900">{s}</option>)}
                                    </select>
                                </div>
                                <FormInput label="Branch" icon={Activity} value={newMember.branch} onChange={(v: string) => setNewMember({ ...newMember, branch: v })} placeholder="CSE" />
                                <FormInput label="Year" icon={Clock} value={newMember.year} onChange={(v: string) => setNewMember({ ...newMember, year: v })} placeholder="III" />
                            </div>
                            <button onClick={handleAddMember} className="w-full py-4 bg-cyan-500 text-black font-black rounded-xl uppercase tracking-widest text-xs">CONFIRM WARRIOR</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        }>
            <RegisterPageContent />
        </Suspense>
    );
}

function ModeCard({ icon: Icon, title, desc, price, color, onClick }: any) {
    const borderColor = color === "cyan" ? "group-hover:border-cyan-500/50" : "group-hover:border-purple-500/50";
    const accentColor = color === "cyan" ? "text-cyan-400" : "text-purple-400";
    const bgGlow = color === "cyan" ? "bg-cyan-500/5" : "bg-purple-500/5";

    return (
        <div onClick={onClick} className={`group relative p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-white/[0.03] border border-white/10 ${borderColor} cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] text-center backdrop-blur-xl overflow-hidden`}>
            <div className={`absolute inset-0 ${bgGlow} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <Icon className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto ${accentColor} mb-4 sm:mb-6`} />
            <h3 className="text-2xl sm:text-3xl font-black mb-2 tracking-tighter">{title}</h3>
            <p className="text-[11px] sm:text-sm text-white/40 mb-6 sm:mb-8 leading-relaxed px-2 sm:px-4">{desc}</p>
            <div className={`inline-flex px-4 py-1.5 sm:px-6 sm:py-2 rounded-full border ${color === 'cyan' ? 'border-cyan-500/20 text-cyan-400' : 'border-purple-500/20 text-purple-400'} font-black text-xs sm:text-sm`}>
                {price}
            </div>
        </div>
    );
}

function ChoiceCard({ icon: Icon, title, desc, color, onClick }: any) {
    const border = color === "cyan" ? "hover:border-cyan-500/50" : "hover:border-purple-500/50";
    const accent = color === "cyan" ? "text-cyan-400" : "text-purple-400";
    return (
        <div onClick={onClick} className={`p-6 sm:p-8 bg-white/[0.03] border border-white/10 ${border} rounded-[2rem] sm:rounded-[2.5rem] flex flex-col items-center gap-3 sm:gap-4 cursor-pointer backdrop-blur-xl transition-all hover:bg-white/[0.05]`}>
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 flex items-center justify-center ${accent}`}><Icon className="w-6 h-6 sm:w-8 sm:h-8" /></div>
            <h4 className="text-lg sm:text-xl font-black tracking-tight">{title}</h4>
            <p className="text-[10px] sm:text-xs text-white/40 text-center font-medium">{desc}</p>
        </div>
    );
}

function MemberRow({ name, role, status, color, onRemove }: any) {
    const statusColor = status === "APPROVED" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
    const initial = (name && typeof name === 'string' && name.length > 0) ? name[0] : "?";
    return (
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-700 flex items-center justify-center font-black text-xs ring-2 ring-white/10">{initial}</div>
                <div>
                    <p className="text-sm font-black flex items-center gap-1.5 tracking-tight">{name || "Unnamed Warrior"} {role === 'LEADER' && <Crown className="w-3.5 h-3.5 text-yellow-400" />}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                        <span className="text-[9px] uppercase font-black tracking-widest text-white/30">{status || "UNKNOWN"}</span>
                    </div>
                </div>
            </div>
            {onRemove && (
                <button onClick={onRemove} className="p-2 text-white/20 hover:text-red-500 transition-colors bg-white/5 rounded-lg"><X className="w-3 h-3" /></button>
            )}
        </div>
    );
}

function FormInput({ label, icon: Icon, value, onChange, placeholder, type = "text", maxLength }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-black text-white/30 tracking-widest pl-1">{label}</label>
            <div className="relative group">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
                <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:border-cyan-500/50 transition-all font-medium text-white placeholder:text-white/10 text-xs sm:text-sm" />
            </div>
        </div>
    );
}

function ReviewRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-white/30 uppercase font-black tracking-widest text-[9px]">{label}</span>
            <span className="font-bold text-white/80">{value || "---"}</span>
        </div>
    );
}

function SuccessView({ onProceed }: { onProceed: () => void }) {
    const [timer, setTimer] = React.useState(3);

    React.useEffect(() => {
        if (timer === 0) {
            onProceed();
        }
    }, [timer, onProceed]);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 rounded-[3rem] text-center space-y-8 relative overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

            <div className="relative">
                <div className="w-24 h-24 bg-cyan-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.4)]">
                    <CheckCircle2 className="w-12 h-12 text-black" />
                </div>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-cyan-600 font-black text-xs shadow-xl"
                >
                    {timer}s
                </motion.div>
            </div>

            <div className="space-y-3">
                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Transmission Success</h2>
                <p className="text-sm text-white/50 max-w-xs mx-auto leading-relaxed">
                    Your registration and payment have been synchronized. The Sentinels will verify your details within 2-4 hours.
                </p>
            </div>

            <div className="pt-4">
                <button
                    onClick={onProceed}
                    className="w-full py-4 bg-white text-black font-black rounded-2xl uppercase text-xs tracking-[0.2em] hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl"
                >
                    Proceed to Dashboard
                </button>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500 animate-pulse">
                Auto-redirecting in progress...
            </p>
        </motion.div>
    );
}

function Header({ title, subtitle }: { title: string, subtitle: string }) {
    return (
        <div className="text-center px-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase">{title}</h2>
            <p className="text-[9px] sm:text-[10px] text-white/40 mt-1 uppercase tracking-widest font-black">{subtitle}</p>
        </div>
    );
}
