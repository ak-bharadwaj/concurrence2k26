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
    ArrowLeft,
    Download
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
    getUserJoinRequest,
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
    const [loadingMessage, setLoadingMessage] = useState("");

    // Payment Info
    const [assignedQR, setAssignedQR] = useState<any>(null);
    const [finalAmount, setFinalAmount] = useState<number | null>(null);
    const [paymentProof, setPaymentProof] = useState({ transaction_id: "", screenshot: null as File | null });
    const qrFetchLock = React.useRef(false);
    const hasFetchedQR = React.useRef(false);

    async function fetchAndSetQR(amount: number) {
        if (qrFetchLock.current || hasFetchedQR.current) return;
        try {
            qrFetchLock.current = true;
            const { data, error: qrErr } = await getNextAvailableQR(amount);
            if (qrErr) throw new Error(qrErr);
            if (data) {
                setAssignedQR(data);
                hasFetchedQR.current = true;
            }
        } catch (e: any) {
            console.error("QR Fetch Error:", e);
        } finally {
            qrFetchLock.current = false;
        }
    }

    async function loadPaymentInfo(fixedAmount?: number) {
        try {
            setLoading(true);
            await fetchAndSetQR(fixedAmount || totalAmount);
        } catch (e: any) {
            console.error("Error loading payment info:", e);
        } finally { setLoading(false); }
    }

    // --- Price Calculation ---
    const totalAmount = regMode === "SOLO" ? 800 : (
        (teamDetails?.members?.length || 1) + additionalMembers.length
    ) * 800;

    // --- Session Storage Restoration (runs first) ---
    useEffect(() => {
        try {
            const savedData = sessionStorage.getItem('hackathon_registration_form_data');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed.formData) setFormData(parsed.formData);
                if (parsed.additionalMembers) setAdditionalMembers(parsed.additionalMembers);
                if (parsed.teamName) setTeamName(parsed.teamName);
                if (parsed.regMode) setRegMode(parsed.regMode);
                if (parsed.squadSubMode) setSquadSubMode(parsed.squadSubMode);
                if (parsed.searchedTeam) setSearchedTeam(parsed.searchedTeam);
                if (parsed.step) setStep(parsed.step);
            }
        } catch (e) {
            console.error('Failed to restore session data:', e);
        }
    }, []);

    // --- Session Storage Persistence ---
    useEffect(() => {
        try {
            const dataToSave = {
                formData,
                additionalMembers,
                teamName,
                regMode,
                squadSubMode,
                searchedTeam,
                step
            };
            sessionStorage.setItem('hackathon_registration_form_data', JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Failed to save session data:', e);
        }
    }, [formData, additionalMembers, teamName, regMode, squadSubMode, searchedTeam, step]);

    // --- Cookie-based Session Restoration ---
    useEffect(() => {
        const sessionCookie = document.cookie.split(';').find(c => c.trim().startsWith('student_session='));
        const existingUserId = sessionCookie?.split('=')[1];

        if (existingUserId) {
            setUserId(existingUserId);
            setLoading(true);

            // Fetch User Data
            supabase.from("users").select("*").eq("id", existingUserId).limit(1).then(async ({ data: usersData, error: uErr }) => {
                const userData = usersData?.[0];
                if (uErr || !userData) {
                    setLoading(false);
                    return;
                }

                // Populate Form Data
                setFormData({
                    name: userData.name || "",
                    email: userData.email || "",
                    phone: userData.phone || "",
                    reg_no: userData.reg_no || "",
                    college: userData.college || "RGM",
                    otherCollege: userData.college !== "RGM" ? userData.college : "",
                    branch: userData.branch || "",
                    year: userData.year || "I",
                    tshirtSize: userData.tshirt_size || "M"
                });

                setRegMode(userData.team_id ? "SQUAD" : "SOLO");
                if (userData.team_id) {
                    setSquadSubMode(userData.role === "LEADER" ? "FORM" : "JOIN");
                    const { data: team } = await getTeamDetails(userData.team_id);
                    if (team) setTeamDetails(team);
                    setUserRole(userData.role);

                    // If member and unpaid, go to payment? No, wait for leader if BULK
                    // But for simplicity, let's just move to step 4 (Legion Hub)
                    setStep(4);
                } else if (userData.status === "UNPAID") {
                    // Solo user who hasn't paid yet
                    setStep(5);
                } else if (userData.status === "APPROVED") {
                    router.push("/success");
                }
                setLoading(false);
            });
        }
    }, [router]);

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
                    getTeamDetails(payload.new.team_id).then(resp => {
                        if (resp.data) setTeamDetails(resp.data);
                    });
                    if (payload.new.role) setUserRole(payload.new.role);
                    if (step < 4) setStep(4);
                }
            })
            .subscribe();

        return () => {
            userSub.unsubscribe();
            teamSub.unsubscribe();
        };
    }, [userId, regMode]);

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
                if (teamDetails?.id) {
                    getTeamDetails(teamDetails.id).then(resp => {
                        if (resp.data) setTeamDetails(resp.data);
                    });
                }
            })
            .subscribe();

        return () => { membersSub.unsubscribe(); };
    }, [teamDetails?.id, regMode]);

    // Leader: Listen for Join Requests
    useEffect(() => {
        if (!teamDetails?.id || regMode !== 'SQUAD' || squadSubMode !== 'FORM') return;

        const fetchRequests = async () => {
            const { data: reqs } = await getJoinRequests(teamDetails.id);
            if (reqs) setPendingRequests(reqs);
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

    // PREFETCH QR FOR SOLO USERS IN STEP 2
    useEffect(() => {
        if (step === 2 && regMode === "SOLO" && !assignedQR) {
            fetchAndSetQR(800);
        }
    }, [step, regMode, assignedQR]);

    // PREFETCH QR FOR SQUADS IN STEP 5 (Review)
    useEffect(() => {
        if (step === 5 && regMode === "SQUAD" && !assignedQR && finalAmount) {
            fetchAndSetQR(finalAmount);
        }
    }, [step, regMode, assignedQR, finalAmount]);

    const handleRespondToRequest = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
        try {
            setLoading(true);
            const { error } = await respondToJoinRequest(requestId, status);
            if (error) throw new Error(error);
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
                    // SIMPLIFIED JOIN: Just validate availability and proceed to review
                    const { error: availErr } = await checkUserAvailability(userParams.email, userParams.phone);
                    if (availErr) {
                        setError(getFriendlyError(availErr));
                        return;
                    }
                    // Set final amount for single joiner
                    setFinalAmount(800);
                    setStep(5); // Go directly to review
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
            setError(null);
            const { data: team, error: searchErr } = await joinTeam(searchCode);
            if (searchErr || !team) {
                setError(searchErr ? getFriendlyError(searchErr) : "Squad not found");
                return;
            }

            // Check team capacity
            const currentMembers = (team as any).members?.length || 0;
            const maxMembers = team.max_members || 4;

            if (currentMembers >= maxMembers) {
                setError(`Team "${team.name}" is full (${currentMembers}/${maxMembers} members)`);
                setSearchedTeam(null);
                return;
            }

            setSearchedTeam(team);
        } catch (err: any) { setError(getFriendlyError(err)); } finally { setLoading(false); }
    };

    const handleTeamJoinProceed = () => {
        if (!searchedTeam) return setError("Please find a team first");
        setStep(3); // Move to Identity Check
    };

    const handleAddMember = async () => {
        if (!newMember.name || !newMember.reg_no) return;
        if (loading) return;

        const currentTotal = (teamDetails?.members?.length || 1) + additionalMembers.length;
        const maxLimit = teamDetails?.max_members || 4;

        if (currentTotal >= maxLimit) {
            return alert(`Maximum capacity reached (${maxLimit} warriors).`);
        }

        try {
            setLoading(true);
            // ZERO-LEAK: Check if this member is already registered/paid
            const { error: conflictErr } = await checkUserAvailability(newMember.email, newMember.phone);
            if (conflictErr) {
                // If it's the generic "already registered" error, make it clearer for squad context
                if (typeof conflictErr === 'string' && conflictErr.includes("registered")) {
                    alert(`Cannot add ${newMember.name}: This user is already registered.`);
                } else {
                    alert(`${newMember.name}: ${typeof conflictErr === 'string' ? conflictErr : (conflictErr as any).message}`);
                }
                return;
            }

            const addedMember = {
                ...newMember,
                tshirt_size: newMember.tshirtSize
            };
            setAdditionalMembers([...additionalMembers, addedMember]);
            setNewMember({ name: "", reg_no: "", email: "", phone: "", college: "RGM", otherCollege: "", branch: "", year: "", tshirtSize: "M" });
            setShowAddMemberModal(false);
        } catch (err) {
            alert("Validation failed. Please try again.");
        } finally {
            setLoading(false);
        }
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
            if (!assignedQR) {
                await fetchAndSetQR(finalAmount || 800);
            }
            setStep(6);
        } catch (err: any) { setError(getFriendlyError(err)); } finally { setLoading(false); }
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
            setLoadingMessage("Synchronizing Secure Gateway...");

            // Artificial delay for visual stability and to show the portal
            await new Promise(r => setTimeout(r, 1500));

            setLoadingMessage("Uploading Payment Evidence...");
            const fileExt = paymentProof.screenshot.name.split('.').pop();
            const fileName = `${formData.reg_no}_${Date.now()}.${fileExt}`;
            const { data: upData, error: upErr } = await supabase.storage.from("screenshots").upload(fileName, paymentProof.screenshot);
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from("screenshots").getPublicUrl(upData.path);

            let finalUserId = userId;

            // LAZY REGISTRATION FOR SOLO USERS
            if (!finalUserId && regMode === "SOLO") {
                setLoadingMessage("Establishing Identity Pulse...");
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
                if (regErr) throw new Error(typeof regErr === 'string' ? regErr : (regErr as any).message || "Registration failed");
                if (!newUser) throw new Error("Registration failed.");

                finalUserId = newUser.id;
                createdUserId = newUser.id;
            }

            // LAZY REGISTRATION FOR SQUAD (FORM)
            if (!finalUserId && regMode === "SQUAD" && squadSubMode === "FORM") {
                setLoadingMessage("Initializing Command Structure...");
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
                if (regErr || !user) {
                    throw new Error(typeof regErr === 'string' ? regErr : (regErr as any)?.message || "Leader registration failed");
                }
                finalUserId = user.id;
                createdUserId = user.id;

                // 2. Create Team
                setLoadingMessage("Forging Squad Designation...");
                const teamResp = await createTeam(teamName, user.id, "BULK", 4); // Max members set to 4 for all            if (teamResp.error) throw new Error(teamResp.error);
                const team = teamResp.data;
                createdTeamId = team.id;

                // 3. Update Leader with Team ID and Role
                const { error: updErr } = await supabase.from("users").update({ team_id: team.id, role: "LEADER" }).eq("id", user.id);
                if (updErr) throw new Error(updErr.message);

                // 4. Register Bulk Members
                if (additionalMembers.length > 0) {
                    setLoadingMessage("Integrating Unit Personnel...");
                    const bulkResp = await registerBulkMembers(user.id, team.id, additionalMembers, "PENDING");
                    if (bulkResp.error) throw new Error(bulkResp.error);
                }
            }

            // SIMPLIFIED REGISTRATION FOR JOINERS - DIRECT ENTRY
            if (!finalUserId && regMode === "SQUAD" && squadSubMode === "JOIN") {
                setLoadingMessage("Infiltrating Target Squad...");
                const userParams = {
                    ...formData,
                    tshirt_size: formData.tshirtSize,
                    college: formData.college === "RGM" ? "RGM College" : formData.otherCollege,
                    role: "MEMBER",
                    status: "PENDING" as const,
                    team_id: searchedTeam.id,
                    transaction_id: paymentProof.transaction_id,
                    screenshot_url: publicUrl,
                    assigned_qr_id: assignedQR?.id
                };

                const { data: newUser, error: regErr } = await registerUser(userParams);
                if (regErr) throw new Error(typeof regErr === 'string' ? regErr : (regErr as any).message || "Join failed");
                if (!newUser) throw new Error("Join failed.");

                finalUserId = newUser.id;
                createdUserId = newUser.id;
            }

            // If user ALREADY existed (compensation or resume)
            if (finalUserId && !createdUserId) {
                setLoadingMessage("Patching Secure Channels...");
                const { error: payErr } = await submitPayment(finalUserId!, {
                    transaction_id: paymentProof.transaction_id,
                    screenshot_url: publicUrl,
                    assigned_qr_id: assignedQR?.id
                });

                if (payErr) {
                    // Critical Requirement: Don't stop user. Log error but proceed.
                    console.error("Payment submission background error (Non-fatal):", payErr);
                    // We treat this as success for the user to avoid blocking them.
                    // Admin can reconcile later or we can rely on registerUser data.
                }
            }

            setLoadingMessage("Finalizing Transmission...");
            // [ACK & AUTO-LOGIN]
            if (finalUserId) {
                document.cookie = `student_session=${finalUserId}; path=/; max-age=${60 * 60 * 24 * 30}`;
            }

            // Clear session storage after successful payment
            try {
                sessionStorage.removeItem('hackathon_registration_form_data');
            } catch (e) {
                console.error('Failed to clear session data:', e);
            }

            await new Promise(r => setTimeout(r, 1000));
            setStep(7);

        } catch (err: any) {
            console.error("Critical Registration Failure:", err);
            setError(getFriendlyError(err));

            if (createdUserId) {
                if (createdTeamId) await deleteTeam(createdTeamId);
                await deleteUser(createdUserId);
            }
        } finally {
            setLoading(false);
            setLoadingMessage("");
        }
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-2 sm:px-4 relative overflow-hidden bg-transparent text-white selection:bg-cyan-500/30 font-sans">
            <GlassNavbar />
            <div className="max-w-xl mx-auto relative z-10">

                <div className="flex items-center gap-4 mb-10 px-4">
                    {step > 0 && step < 7 && (
                        <button onClick={handleBack} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="flex gap-2 flex-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((s) => (
                            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-white/10'}`} />
                        ))}
                    </div>
                </div>

                {/* FULL SCREEN LOADING PULSE */}
                <AnimatePresence>
                    {loading && step === 6 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center"
                        >
                            <div className="relative w-32 h-32 mb-12">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 border-4 border-cyan-500/20 rounded-[2.5rem]"
                                />
                                <motion.div
                                    animate={{ scale: [1.2, 1, 1.2], rotate: [360, 180, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 border-4 border-t-cyan-500 rounded-[2.5rem]"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Activity className="w-12 h-12 text-cyan-400 animate-pulse" />
                                </div>
                            </div>

                            <h2 className="text-3xl font-black italic tracking-tighter text-white mb-4 uppercase">TRANSMISSION ACTIVE</h2>
                            <p className="text-cyan-400/80 font-mono text-sm tracking-[0.2em] mb-8 h-4">{loadingMessage}</p>

                            <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                <motion.div
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "100%" }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="w-full h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                                />
                            </div>

                            <div className="mt-12 grid grid-cols-2 gap-8 opacity-20 filter grayscale">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 animate-pulse" />
                                    <span className="text-[8px] font-black tracking-widest uppercase">Encryption</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 animate-bounce" />
                                    <span className="text-[8px] font-black tracking-widest uppercase">Routing</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                            <ModeCard icon={Users} title="Elite Squad" desc="Bring your own team of 2-4 warriors." price="₹800/Member" color="purple" onClick={() => handleModeSelect("SQUAD")} />
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
                                                if (!assignedQR) {
                                                    await fetchAndSetQR(800);
                                                }
                                                setFinalAmount(800);
                                                setStep(6);
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
                                                <div className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-2xl animate-in fade-in slide-in-from-top-4 text-center space-y-4">
                                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Squad Found</p>
                                                    <h3 className="text-xl sm:text-2xl font-black text-purple-400 tracking-tight">{searchedTeam.name}</h3>
                                                    <div className="inline-block px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                                                        <p className="text-xs font-black text-green-400 uppercase tracking-widest">
                                                            {searchedTeam.members?.length || 0}/{searchedTeam.max_members || 4} Slots Filled
                                                        </p>
                                                    </div>
                                                    <button onClick={handleTeamJoinProceed} className="w-full min-h-[56px] py-4 px-6 bg-white text-black font-black rounded-xl flex items-center justify-center gap-3 text-base shadow-xl relative z-10 active:scale-95 transition-transform hover:bg-gray-100">
                                                        <span className="">JOIN TEAM</span> <ChevronRight className="w-5 h-5 shrink-0" />
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

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {squadSubMode === 'FORM' && !teamDetails?.members?.some((m: any) => m.role === 'LEADER') && (
                                            <MemberRow name={formData.name} role="LEADER" status="UNPAID" color="red" />
                                        )}
                                        {teamDetails?.members?.map((m: any, i: number) => (
                                            <MemberRow key={`db-${i}`} name={m.name} role={m.role || "MEMBER"} status={m.status} color={m.status === 'APPROVED' ? 'cyan' : 'red'} />
                                        ))}
                                        {additionalMembers.map((m, i) => (
                                            <MemberRow key={`local-${i}`} name={m.name} role="MEMBER" status="UNPAID" color="red" onRemove={() => setAdditionalMembers(additionalMembers.filter((_, idx) => idx !== i))} />
                                        ))}
                                        {(teamDetails?.members?.length || 1) + additionalMembers.length < (teamDetails?.max_members || 4) && (
                                            <button onClick={() => setShowAddMemberModal(true)} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/40 font-bold hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest">
                                                <Plus className="w-4 h-4" /> Add Squad Member
                                            </button>
                                        )}
                                    </div>

                                    {/* Proceed to checkout */}

                                    {squadSubMode === 'FORM' && (
                                        <button onClick={handleFinalSquadSubmit} className="w-full py-4 bg-green-500 text-black font-black rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.3)] uppercase text-sm tracking-widest">PROCEED TO CHECKOUT</button>
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

                            <div className="text-center bg-black/40 p-6 sm:p-10 rounded-3xl border border-white/10 relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center space-y-6">
                                {loading || !assignedQR ? (
                                    <div className="flex flex-col items-center gap-4 py-12">
                                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                                        <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Synchronizing Secure Gateway...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Payable amount</p>
                                            <p className="text-5xl sm:text-6xl font-black text-white tracking-tighter">₹{finalAmount || 0}</p>
                                        </div>

                                        <div className="relative group">
                                            <div className="bg-white p-4 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.15)] transition-transform duration-500 hover:scale-105">
                                                {assignedQR?.qr_image_url ? (
                                                    <Image src={assignedQR.qr_image_url} alt="Pay" width={280} height={280} className="rounded-2xl" />
                                                ) : (
                                                    <div className="w-[280px] h-[280px] bg-neutral-200 flex items-center justify-center text-black font-black text-[10px] uppercase text-center p-4 rounded-2xl">QR Signal Lost. Refresh.</div>
                                                )}
                                            </div>
                                            <a
                                                href={assignedQR?.qr_image_url || "#"}
                                                download="Hackathon_QR.png"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block mt-4 text-[10px] uppercase font-bold tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                                            >
                                                Tap to download QR
                                            </a>
                                        </div>

                                        <div className="space-y-3 w-full max-w-xs">
                                            <p className="text-xs font-black uppercase text-white/60">{assignedQR?.upi_name || "Payment Portal"}</p>
                                            <button
                                                onClick={() => {
                                                    if (assignedQR?.upi_id) {
                                                        navigator.clipboard.writeText(assignedQR.upi_id);
                                                        // Optional: Add toast here
                                                    }
                                                }}
                                                className="w-full flex items-center justify-center gap-2 bg-white/5 py-3 px-4 rounded-xl font-mono text-cyan-400 border border-white/5 text-xs hover:bg-white/10 active:scale-95 transition-all"
                                            >
                                                {assignedQR?.upi_id || "No UPI ID found"} <Copy className="w-3 h-3" />
                                            </button>
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
                                    placeholder="12-25 character UTR"
                                    maxLength={25}
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
                                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-2xl active:scale-95 transition-all shadow-xl flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin w-5 h-5" />
                                        {loadingMessage && <span className="text-xs font-medium opacity-80">{loadingMessage}</span>}
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5" /> SUBMIT TRANSMISSION
                                    </div>
                                )}
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
                        <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 30 }} className="bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative max-h-[90vh] flex flex-col">
                            <button onClick={() => setShowAddMemberModal(false)} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white bg-white/5 rounded-full z-10"><X className="w-4 h-4" /></button>
                            <Header title="Add Member" subtitle="Legion Expansion" />
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar my-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
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
                            </div>
                            <button onClick={handleAddMember} className="w-full py-4 bg-cyan-500 text-black font-black rounded-xl uppercase tracking-widest text-xs shrink-0">CONFIRM WARRIOR</button>
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
            className="glass-card p-10 pb-24 rounded-[3rem] text-center space-y-8 relative overflow-hidden"
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
                    Your unit profile and payment metadata have been synchronized. The sentinels are validating the signal. Full interface access will activate shortly.
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
