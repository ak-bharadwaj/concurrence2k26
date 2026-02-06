"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Settings,
    QrCode,
    Mail,
    Link as LinkIcon,
    Activity,
    Plus,
    Trash2,
    ToggleLeft,
    ToggleRight,
    LogOut,
    ChevronRight,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    Download,
    Upload,
    ExternalLink,
    Menu,
    X,
    Camera,
    UserCheck,
    RotateCcw,
    PlusCircle,
    ShieldAlert,
    MessageCircle,
    Crown,
    AlertTriangle
} from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import ExcelJS from "exceljs";
import { supabase } from "@/lib/supabase";
import { getAdminSession, adminLogout } from "@/lib/auth";
import { updateStatus, getActiveGroupLink, deleteUser, resetQRUsage, markAttendance, fetchAttendanceReport, sendCustomUserEmail, approveTeamPayment, createTeam, deleteTeam, purgeUnpaidUsers } from "@/lib/supabase-actions";
import { getFriendlyError } from "@/lib/error-handler";
import Image from "next/image";
import dynamic from "next/dynamic";

const MemberDetailModal = dynamic(() => import("./MemberDetailModal").then(mod => mod.MemberDetailModal), { ssr: false });
const VerificationGroupModal = dynamic(() => import("./VerificationGroupModal").then(mod => mod.VerificationGroupModal), { ssr: false });
const TeamPaymentModal = dynamic(() => import("./TeamPaymentModal").then(mod => mod.TeamPaymentModal), { ssr: false });


type Tab = "USERS" | "VERIFY_QUEUE" | "ADMINS" | "QR" | "EMAILS" | "GROUPS" | "LOGS" | "TEAMS" | "SCAN" | "TEAM_DETAILS";

const TABS: Tab[] = ["USERS", "VERIFY_QUEUE", "SCAN", "TEAMS", "EMAILS", "QR", "ADMINS", "LOGS"];

export default function MainDashboard() {
    const [admin, setAdmin] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>("USERS");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [data, setData] = useState<any>({
        users: [],
        admins: [],
        qr: [],
        emails: [],
        groups: [],
        logs: [],
        teams: []
    });
    const [loading, setLoading] = useState(true);

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Inline Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editField, setEditField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const [showModal, setShowModal] = useState<Tab | null>(null);
    const [movingUser, setMovingUser] = useState<any>(null);
    const [viewMember, setViewMember] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    // Squad Command Center State
    const [teamViewMode, setTeamViewMode] = useState<'ALL' | 'SOLO'>('ALL');
    const [participantViewMode, setParticipantViewMode] = useState<'TABLE' | 'GROUPED'>('TABLE');
    const [memberTypeFilter, setMemberTypeFilter] = useState<'ALL' | 'SQUAD' | 'SOLO'>('ALL');
    const [viewMode, setViewMode] = useState<'GRID' | 'VISUAL'>('GRID');
    const [recruitState, setRecruitState] = useState<{ teamId: string, slotId: number } | null>(null);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);

    // Attendance State
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceTime, setAttendanceTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    const [scanResult, setScanResult] = useState<any>(null);
    const [recentScans, setRecentScans] = useState<any[]>([]);
    const [emailModal, setEmailModal] = useState<{ userId: string, name: string } | null>(null);
    const [verificationGroup, setVerificationGroup] = useState<any>(null);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [hideIncomplete, setHideIncomplete] = useState(true);
    const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const debouncedFetch = (silent = false) => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => {
            fetchAllData(silent);
        }, 1000); // 1s debounce for stability
    };

    useEffect(() => {
        const session = getAdminSession();
        if (!session || session.role !== "MAIN") {
            window.location.href = "/admin/login";
            return;
        }
        setAdmin(session);
        fetchAllData();

        // Real-time Subscription - Optimized for Consistency
        const channel = supabase
            .channel('dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                debouncedFetch(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
                debouncedFetch(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
                debouncedFetch(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests' }, () => {
                debouncedFetch(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_codes' }, (payload: any) => {
                if (payload.eventType === 'UPDATE') {
                    setData((prev: any) => ({
                        ...prev,
                        qr: prev.qr.map((q: any) => q.id === payload.new.id ? { ...q, ...payload.new } : q)
                    }));
                } else {
                    debouncedFetch(true);
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, () => {
                debouncedFetch(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'email_accounts' }, () => {
                debouncedFetch(true);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_links' }, () => {
                debouncedFetch(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleBulkMerge = async (teamId: string) => {
        if (!confirm(`Merge ${selectedUsers.length} users into this team?`)) return;
        try {
            setLoading(true);
            const { error } = await supabase
                .from('users')
                .update({ team_id: teamId })
                .in('id', selectedUsers);

            if (error) throw error;
            alert("Bulk Merge Successful!");
            setSelectedUsers([]);
            setMovingUser(null); // Reuse movingUser modal logic or separate?
            // Actually, let's reuse the movingUser state but for bulk
            // Wait, movingUser assumes one user object. I need a bulk move state.
            // Let's modify handleMoveMember to accept array or use new state.
            // Simplified: selection mode enables a "Bulk Action" bar.
            if (teamId) setTeamViewMode('ALL');
            fetchAllData();
        } catch (err: any) {
            alert("Merge failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async (name: string, mode: string) => {
        if (loading) return;
        try {
            setLoading(true);
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error } = await supabase.from('teams').insert({
                name,
                payment_mode: mode,
                unique_code: code,
                max_members: 4 // Default
            });
            if (error) throw error;
            fetchAllData();
        } catch (err: any) {
            alert("Failed to create team: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditTeam = async (id: string, field: string, value: any) => {
        try {
            const { error } = await supabase.from('teams').update({ [field]: value }).eq('id', id);
            if (error) throw error;
            fetchAllData();
        } catch (e: any) {
            alert("Update failed: " + e.message);
        }
    };

    const handleSendEmail = async () => {
        if (!emailModal || !emailSubject || !emailMessage) return;
        try {
            setLoading(true);
            await sendCustomUserEmail(emailModal.userId, emailSubject, emailMessage);
            alert(`Email sent successfully to ${emailModal.name}!`);
            setEmailModal(null);
            setEmailSubject("");
            setEmailMessage("");
        } catch (err: any) {
            alert("Failed to send email: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePurgeUnpaid = async () => {
        if (!confirm("CRITICAL ACTION: This will permanently delete ALL 'UNPAID' users from the database. These are usually abandoned registrations. This cannot be undone. Proceed?")) return;

        setLoading(true);
        try {
            const { error } = await purgeUnpaidUsers();
            if (error) throw new Error(error);
            alert("Purge successful! All abandoned UNPAID records removed.");
            fetchAllData(); // Refresh UI
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        try {
            setLoading(true);
            let table = "";
            let dataToInsert = { ...formData };

            if (activeTab === "QR") {
                table = "qr_codes";
                setLoading(true);

                const uploadFile = async (file: File) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `qr_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const { data: upData, error: upErr } = await supabase.storage.from("screenshots").upload(fileName, file);
                    if (upErr) throw upErr;
                    const { data: { publicUrl } } = supabase.storage.from("screenshots").getPublicUrl(upData.path);
                    return publicUrl;
                };

                if (formData.bulk !== false) {
                    const amounts = [800, 1600, 2400, 3200, 4000];
                    const qrSets = [];

                    for (const amt of amounts) {
                        const file = formData[`qr_file_${amt}`];
                        if (file) {
                            const url = await uploadFile(file);
                            qrSets.push({
                                upi_id: formData.upi_id,
                                upi_name: formData.upi_name,
                                amount: amt,
                                qr_image_url: url,
                                daily_limit: formData.daily_limit || 100,
                                active: true
                            });
                        }
                    }

                    if (qrSets.length === 0) throw new Error("Please upload at least one QR image");

                    const { error } = await supabase.from(table).insert(qrSets);
                    if (error) throw error;
                } else {
                    if (!formData.qr_file) throw new Error("Please upload a QR image");
                    const url = await uploadFile(formData.qr_file);
                    dataToInsert = {
                        qr_image_url: url,
                        upi_id: formData.upi_id,
                        upi_name: formData.upi_name,
                        amount: formData.amount || 800,
                        daily_limit: formData.daily_limit || 100
                    };
                    const { error } = await supabase.from(table).insert([dataToInsert]);
                    if (error) throw error;
                }


                setShowModal(null);
                setFormData({});
                fetchAllData();
                return;
            }
            if (activeTab === "ADMINS") {
                table = "admins";
                dataToInsert = {
                    username: formData.username,
                    password_hash: formData.password_hash
                };
            }
            if (activeTab === "EMAILS") {
                table = "email_accounts";
                dataToInsert = {
                    email_address: formData.email_address,
                    app_password: formData.app_password,
                    smtp_host: formData.smtp_host || 'smtp.gmail.com',
                    smtp_port: parseInt(formData.smtp_port) || 465
                };
            }
            if (activeTab === "GROUPS") {
                table = "group_links";
                dataToInsert = {
                    college: formData.college || "RGM",
                    whatsapp_link: formData.whatsapp_link
                };
            }
            if (activeTab === "TEAMS") {
                table = "teams";
                dataToInsert = {
                    name: formData.name,
                    payment_mode: formData.payment_mode,
                    unique_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    max_members: 4
                };
            }

            const { error } = await supabase.from(table).insert([dataToInsert]);
            if (error) throw error;

            setShowModal(null);
            setFormData({});
            fetchAllData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const results = await Promise.all([
                supabase.from("users").select("*, team_id, squad:teams!team_id(name, unique_code, team_number)").order("created_at", { ascending: false }),
                supabase.from("admins").select("id, username, role, active, created_at").order("created_at", { ascending: false }),
                supabase.from("qr_codes").select("*").order("created_at", { ascending: false }),
                supabase.from("email_accounts").select("id, email_address, smtp_host, smtp_port, active, created_at").order("created_at", { ascending: false }),
                supabase.from("group_links").select("*").order("created_at", { ascending: false }),
                supabase.from("action_logs").select("*, users!user_id(name), admins(username)").order("timestamp", { ascending: false }).limit(50),
                supabase.from("teams").select("*"),
                supabase.from("join_requests").select("*, teams!team_id(name, unique_code)").eq("status", "PENDING")
            ]);

            // Robust individual error checks
            const errors = results.filter(r => r.error).map(r => r.error?.message);
            if (errors.length > 0) {
                // We show alert but still try to render what we got
                console.error("Sync errors:", errors);
                alert("Some data failed to sync: \n" + errors.join("\n"));
            }

            const [users, admins, qr, emails, groups, logs, teams, joinRequests] = results.map(r => r.data);

            // STRICT FILTERING: Data used for summary counts and main list must ignore UNPAID/JOIN_PENDING
            const activeUsers = (users || []).filter((u: any) => !['UNPAID', 'JOIN_PENDING'].includes(u.status));

            const processedUsers = (users || []).map((u: any) => {
                const request = (joinRequests || []).find((r: any) => r.user_id === u.id);
                return {
                    ...u,
                    pendingJoin: request ? {
                        teamName: request.teams?.name,
                        teamCode: request.teams?.unique_code
                    } : null
                };
            }).sort((a: any, b: any) => {
                const priorityStatus = ["VERIFYING", "PENDING"];
                const aPriority = priorityStatus.indexOf(a.status);
                const bPriority = priorityStatus.indexOf(b.status);

                if (aPriority !== bPriority) {
                    if (aPriority === -1) return 1;
                    if (bPriority === -1) return -1;
                    return aPriority - bPriority;
                }
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            const unifiedTeams = [
                ...(teams || []).map((t: any) => {
                    // Use loose equality to handle potential string/UUID mismatches
                    const teamMembers = (users || []).filter((u: any) => u.team_id == t.id);
                    return {
                        ...t,
                        memberCount: teamMembers.length,
                        isVirtual: false,
                        members: teamMembers
                    };
                }),
                // Filter out users who have a team_id (truthy)
                ...(users || []).filter((u: any) => !u.team_id && !['UNPAID', 'JOIN_PENDING'].includes(u.status)).map((u: any) => ({
                    id: `SOLO-${u.id}`,
                    name: `${u.name}`,
                    unique_code: 'SOLO',
                    isVirtual: true,
                    payment_mode: 'INDIVIDUAL',
                    memberCount: 1,
                    members: [u],
                    created_at: u.created_at
                }))
            ].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

            setData({
                users: processedUsers,
                admins: admins || [],
                qr: qr || [],
                emails: emails || [],
                groups: groups || [],
                logs: logs || [],
                teams: unifiedTeams
            });
            setLastSynced(new Date());
        } catch (err: any) {
            alert("Critical Error loading data: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportXLSX = async () => {
        const users = data.users;
        if (!users.length) return alert("No data to export");

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Hackathon Users");

        worksheet.columns = [
            { header: "ID", key: "id", width: 30 },
            { header: "Name", key: "name", width: 20 },
            { header: "Reg No", key: "reg_no", width: 15 },
            { header: "Year of Study", key: "year", width: 12 },
            { header: "Email", key: "email", width: 25 },
            { header: "Phone", key: "phone", width: 15 },
            { header: "College Name", key: "college", width: 25 },
            { header: "Transaction ID", key: "transaction_id", width: 20 },
            { header: "Status", key: "status", width: 10 },
            { header: "Screenshot URL", key: "screenshot_url", width: 50 },
            { header: "Joined At", key: "created_at", width: 25 },
        ];

        users.forEach((u: any) => {
            worksheet.addRow({
                ...u,
                created_at: new Date(u.created_at).toLocaleString()
            });
        });

        // Style the header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Hackathon_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split("\n").filter(line => line.trim());
            const headers = lines[0].split(",");

            const rows = lines.slice(1).map(line => {
                const values = line.split(",");
                const obj: any = {};
                headers.forEach((h, i) => {
                    const key = h.trim().toLowerCase().replace(" ", "_");
                    obj[key] = values[i]?.trim();
                });
                return obj;
            });

            try {
                setLoading(true);
                // Upsert users based on registration number (reg_no)
                for (const row of rows) {
                    if (!row.reg_no) continue;

                    const { error } = await supabase
                        .from("users")
                        .upsert({
                            name: row.name,
                            reg_no: row.reg_no,
                            email: row.email,
                            phone: row.phone,
                            college: row.college,
                            transaction_id: row.transaction_id || row.utr,
                            status: row.status || "PENDING"
                        }, { onConflict: 'email' });

                }
                alert("Import completed. Some rows might have failed if they were invalid.");
                fetchAllData();
            } catch (err: any) {
                alert("Import failed: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
        try {
            // Optimistic Update
            setData((prev: any) => ({
                ...prev,
                users: prev.users.filter((u: any) => u.id !== id)
            }));
            const { error } = await supabase.from("users").delete().eq("id", id);
            if (error) throw error;
        } catch (err: any) {
            alert("Delete failed: " + err.message);
            fetchAllData(true); // Sync
        }
    };

    const handleInlineSave = async (id: string, field: string, value: string) => {
        try {
            // Optimistic update
            if (field === 'status') {
                if (value === 'REJECTED') {
                    const confirmDelete = window.confirm("Rejecting will PERMANENTLY DELETE this user from the database. Continue?");
                    if (!confirmDelete) return;
                }

                setData((prev: any) => ({
                    ...prev,
                    users: prev.users.map((u: any) => u.id === id ? { ...u, status: value, is_present: value === 'APPROVED' } : u)
                }));
            } else {
                setData((prev: any) => ({
                    ...prev,
                    users: prev.users.map((u: any) => u.id === id ? { ...u, [field]: value } : u)
                }));
            }

            // Perform DB action
            if (field === 'status') {
                if (value === 'REJECTED') {
                    await supabase.from("users").delete().eq("id", id);
                    alert("User rejected and deleted.");
                } else {
                    const user = data.users.find((u: any) => u.id === id);
                    const linkRes = value === 'APPROVED' ? await getActiveGroupLink(user?.college || "") : { data: "" };
                    const link = linkRes?.data || "";
                    await updateStatus(id, admin.id, value as any, "MANUAL_STATUS_OVERRIDE", link || "");
                }
            } else {
                const { error } = await supabase.from("users").update({ [field]: value }).eq("id", id);
                if (error) throw error;

                await supabase.from("action_logs").insert([{
                    admin_id: admin.id,
                    user_id: id,
                    action: `EDITED_${field.toUpperCase()}`
                }]);
            }
        } catch (err: any) {
            alert("Failed to save: " + err.message);
            fetchAllData(true); // Rollback/Sync
        } finally {
            setEditingId(null);
            setEditField(null);
        }
    };

    const handleVerifyAction = async (user: any, action: "APPROVED" | "REJECTED") => {
        try {
            // Optimistic Update
            setData((prev: any) => ({
                ...prev,
                users: action === "REJECTED"
                    ? prev.users.filter((u: any) => u.id !== user.id)
                    : prev.users.map((u: any) => u.id === user.id ? { ...u, status: action, is_present: action === "APPROVED" } : u)
            }));

            if (action === "APPROVED") {
                const linkRes = await getActiveGroupLink(user.college);
                const link = linkRes?.data || "";
                await updateStatus(user.id, admin.id, "APPROVED", "APPROVE_PAYMENT", link || "");
            } else if (action === "REJECTED") {
                if (!window.confirm("Reject and DELETE this user?")) {
                    fetchAllData(true); // Rollback
                    return;
                }
                await updateStatus(user.id, admin.id, "REJECTED", "REJECT_PAYMENT");
                await deleteUser(user.id);
            }
        } catch (err: any) {
            alert("Action failed: " + getFriendlyError(err));
            fetchAllData(true); // Sync
        }
    };

    const handleApproveMember = async (userId: string) => {
        try {
            const user = data.users.find((u: any) => u.id === userId);
            const linkRes = await getActiveGroupLink(user?.college || "");
            const link = linkRes?.data || "";
            await updateStatus(userId, admin.id, "APPROVED", "MANUAL_SINGLE_APPROVE", link || "");
            fetchAllData();
        } catch (err) {
            alert("Approval failed: " + getFriendlyError(err));
        }
    };

    const handleGroupApprove = async () => {
        if (!verificationGroup) return;
        try {
            setLoading(true);
            const proofSource = verificationGroup.members.find((m: any) => m.screenshot_url) || verificationGroup.members[0];
            const paymentDetails = {
                transaction_id: proofSource.transaction_id,
                screenshot_url: proofSource.screenshot_url
            };

            if (verificationGroup.type === 'SQUAD') {
                await approveTeamPayment(verificationGroup.id, admin.id, paymentDetails);
            } else {
                // Solo - just reuse standard approve
                const linkRes = await getActiveGroupLink(verificationGroup.members[0].college);
                const link = linkRes?.data || "";
                await updateStatus(verificationGroup.members[0].id, admin.id, "APPROVED", "APPROVE_PAYMENT", link || "");
            }

            setVerificationGroup(null);
            fetchAllData();
        } catch (err: any) {
            alert("Bulk Approve Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGroupReject = async () => {
        if (!verificationGroup) return;
        if (!confirm("Reject entire group? This will DELETE these users.")) return;

        try {
            setLoading(true);
            // Reject all individually
            for (const m of verificationGroup.members) {
                if (m.status === 'APPROVED') continue; // Skip already approved
                await updateStatus(m.id, admin.id, "REJECTED", "REJECT_PAYMENT");
                await deleteUser(m.id);
            }
            setVerificationGroup(null);
            fetchAllData();
        } catch (err: any) {
            alert("Bulk Reject Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getAllParticipantGroups = (usersToGroup: any[]) => {
        const groups: any[] = [];
        const processedTeams = new Set();

        usersToGroup.forEach((u: any) => {
            if (u.team_id && u.squad) {
                if (processedTeams.has(u.team_id)) return;
                const teamMembers = data.users.filter((m: any) => m.team_id === u.team_id);
                groups.push({
                    id: u.team_id,
                    type: 'SQUAD',
                    teamName: u.squad?.name,
                    teamNumber: u.squad?.team_number || u.squad?.unique_code,
                    members: teamMembers,
                    proof: teamMembers.find((m: any) => m.screenshot_url) || null,
                    count: teamMembers.length,
                    max_members: u.squad?.max_members
                });
                processedTeams.add(u.team_id);
            } else {
                groups.push({
                    id: u.id,
                    type: 'SOLO',
                    teamName: u.name,
                    teamNumber: 'SOLO',
                    members: [u],
                    proof: u,
                    count: 1
                });
            }
        });
        return groups;
    };

    const isRGM = (item: any) => {
        if (!item) return false;
        // If it's a group/team (has members)
        if (item.members) {
            return item.members.some((m: any) => m.college?.toUpperCase().includes('RGM'));
        }
        // If it's a single user
        return item.college?.toUpperCase().includes('RGM');
    };

    const handleTestSMTP = async (emailId: string) => {
        try {
            setLoading(true);
            const response = await fetch('/api/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId, testTo: admin.email || 'admin@test.com' })
            });
            const result = await response.json();
            if (result.success) alert("Test email sent effectively!");
            else throw new Error(result.error);
        } catch (err: any) {
            alert("SMTP Test Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUniversalExport = async () => {
        try {
            setLoading(true);

            // Fetch users (no join needed strictly if we have allTeams, avoiding FK errors)
            const { data: allUsers, error: userErr } = await supabase
                .from('users')
                .select('*');

            if (userErr) throw new Error("Users Fetch Error: " + userErr.message);

            const { data: allTeams, error: teamErr } = await supabase.from('teams').select('*');
            if (teamErr) throw new Error("Teams Fetch Error: " + teamErr.message);

            if (!allUsers || !allTeams) return alert("Failed to fetch export data");

            // Use static import like other functions
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Master Roster');

            // Styles
            const headerStyle: Partial<ExcelJS.Style> = {
                font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } },
                alignment: { horizontal: 'center' }
            };

            const addBlock = (title: string, rawMembers: any, teamInfo?: any) => {
                const members = Array.isArray(rawMembers) ? rawMembers : [];
                // Add more spacing between blocks for distinct division
                const startRow = sheet.lastRow ? sheet.lastRow.number + 3 : 1;

                // Title Block (The "Division" Header)
                const titleRow = sheet.getRow(startRow);
                titleRow.getCell(1).value = title.toUpperCase();
                // Distinct color for Team headers vs Generic
                const isRgmTeam = members.some((m: any) => m.college?.toUpperCase().includes('RGM'));
                const blockColor = isRgmTeam ? 'FFF97316' : (teamInfo ? 'FFd946ef' : 'FF475569'); // Orange for RGM
                titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blockColor } };
                sheet.mergeCells(startRow, 1, startRow, 14); // Span 14 columns
                titleRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                titleRow.height = 30;

                // Headers
                const headerRow = sheet.getRow(startRow + 1);
                // New Order: Team ID as 1st col, Removed 'In Venue'
                headerRow.values = ['Team Ref', 'Division / Team', 'Name', 'Reg No', 'Year of Study', 'College Name', 'T-Shirt Size', 'Phone', 'Email', 'Role', 'Status', 'Payment Mode', 'Amount', 'Transaction ID'];
                headerRow.eachCell((cell) => {
                    cell.style = { ...headerStyle };
                });

                // Data
                members.forEach((m) => {
                    // Payment Mode Logic: Team mode overrides unless it's solo
                    const payMode = teamInfo ? (teamInfo.payment_mode || 'INDIVIDUAL') : (m.payment_mode || 'INDIVIDUAL');
                    const teamRef = teamInfo ? (teamInfo.team_number || teamInfo.unique_code) : 'SOLO';
                    const isRgmItem = isRGM(teamInfo ? { members: [m] } : m);

                    // Amount Logic: If approved, it's 800 (base fee). If pending, show what they/we expect.
                    const amount = m.amount || (m.status === 'APPROVED' ? 800 : 0);

                    const row = sheet.addRow([
                        isRgmItem ? `RGM-${teamRef}` : teamRef, // 1st Col: Team ID/Ref
                        teamInfo ? `${isRgmItem ? '[RGM] ' : ''}${teamInfo.name}` : 'SOLO', // Division Col
                        m.name,
                        m.reg_no,
                        m.year || '---',
                        m.college || '---',
                        m.tshirt_size || 'M',
                        m.phone,
                        m.email,
                        m.role,
                        m.status,
                        payMode,
                        amount,
                        m.transaction_id || '---'
                    ]);

                    // Style Tweaks
                    row.getCell(1).font = { color: { argb: 'FF888888' }, bold: true, size: 10 }; // Team Ref
                    row.getCell(2).font = { color: { argb: 'FF888888' }, italic: true, size: 10 }; // Division Name

                    // Auto-color status
                    if (m.status === 'APPROVED') row.getCell(11).font = { color: { argb: 'FF008800' }, bold: true };
                    if (m.status === 'REJECTED') row.getCell(11).font = { color: { argb: 'FFFF0000' }, bold: true };
                });

                // Borders (Box Style)
                const endRow = sheet.lastRow!.number;
                for (let r = startRow; r <= endRow; r++) {
                    const row = sheet.getRow(r);
                    for (let c = 1; c <= 14; c++) {
                        const cell = row.getCell(c);
                        const isTitle = r === startRow;

                        let borderStyle: any = 'thin';
                        if (isTitle) borderStyle = 'thick';

                        cell.border = {
                            top: r === startRow ? { style: 'thick' } : { style: 'thin' },
                            left: c === 1 ? { style: 'thick' } : { style: 'thin' },
                            bottom: r === endRow ? { style: 'thick' } : { style: 'thin' },
                            right: c === 14 ? { style: 'thick' } : { style: 'thin' }
                        };
                    }
                }
            };

            // 1. Teams
            allTeams.forEach((t: any) => {
                const members = allUsers.filter((u: any) => u.team_id == t.id);
                if (members.length > 0) {
                    addBlock(`SQUAD: ${t.name} (Code: ${t.unique_code}) - ${members.length} Members`, members, t);
                }
            });

            // 2. Solo
            const solo = allUsers.filter((u: any) => !u.team_id);
            if (solo.length > 0) {
                addBlock('SOLO WARRIORS (INDIVIDUALS)', solo);
            }

            // Columns
            sheet.columns = [
                { width: 30 }, { width: 30 }, { width: 25 }, { width: 20 }, { width: 15 }, { width: 30 }, { width: 15 }, { width: 20 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 25 }
            ];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Nexus_Master_Roster_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();

        } catch (err: any) {
            alert("Export error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceExport = async () => {
        try {
            setLoading(true);
            const reportResponse = await fetchAttendanceReport(attendanceDate);
            const reportData = reportResponse?.data || [];

            if (!reportData || reportData.length === 0) {
                alert("No attendance data found for this date.");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet(`Attendance_${attendanceDate}`);

            // Header Row
            const headerRow = sheet.getRow(1);
            headerRow.values = ['Team Name', 'Team ID', 'Member Name', 'Reg No', 'Status', 'Attendance Status'];

            // Header Styling
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; // Dark Grey
                cell.alignment = { horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Data Rows
            (reportData as any[]).forEach((row: any) => {
                const sheetRow = sheet.addRow([
                    row.teams?.name || 'SOLO',
                    row.teams?.team_number || '---',
                    row.name,
                    row.reg_no,
                    row.status,
                    row.attendanceStatus
                ]);

                // Conditional Coloring for Attendance Status
                const statusCell = sheetRow.getCell(6);
                if (row.attendanceStatus === 'PRESENT') {
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light Green
                    statusCell.font = { color: { argb: 'FF166534' }, bold: true };
                } else {
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light Red
                    statusCell.font = { color: { argb: 'FF991B1B' }, bold: true };
                }

                // Generic cell borders
                sheetRow.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            // Column Widths
            sheet.columns = [
                { width: 25 }, { width: 15 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 20 }
            ];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Attendance_Report_${attendanceDate}.xlsx`;
            link.click();

        } catch (err: any) {
            alert("Attendance Export failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = data.users.filter((u: any) => {
        // Apply hideIncomplete filter first if enabled
        if (hideIncomplete && u.status === 'UNPAID') return false;

        const matchesSearch =
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;

        const matchesType = memberTypeFilter === "ALL" ||
            (memberTypeFilter === "SQUAD" ? !!u.team_id : !u.team_id);

        return matchesSearch && matchesStatus && matchesType;
    });

    const handleConvertSoloToTeam = async (soloId: string, recruitId: string) => {
        try {
            setLoading(true);
            const soloUser = data.users.find((u: any) => u.id === soloId);
            if (!soloUser) throw new Error("Solo user not found");

            const teamName = `${soloUser.name}'s Squad`;
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();

            // 1. Create Team
            const { data: newTeam, error: teamError } = await supabase
                .from('teams')
                .insert({
                    name: teamName,
                    unique_code: code,
                    payment_mode: soloUser.payment_mode || 'INDIVIDUAL',
                    max_members: isRGM(soloUser) ? 4 : 5
                })
                .select()
                .single();

            if (teamError) throw teamError;

            // 2. Move solo user to team as LEADER
            const { error: leaderError } = await supabase
                .from('users')
                .update({ team_id: newTeam.id, role: 'LEADER' })
                .eq('id', soloId);

            if (leaderError) throw leaderError;

            // 3. Move recruited user to team as MEMBER
            const { error: memberError } = await supabase
                .from('users')
                .update({ team_id: newTeam.id, role: 'MEMBER' })
                .eq('id', recruitId);

            if (memberError) throw memberError;

            alert(`Squad "${teamName}" created successfully!`);
            setTeamViewMode('ALL'); // FORCE SWITCH TO ALL TO SHOW NEW TEAM
            fetchAllData();

        } catch (err: any) {
            alert("Failed to convert solo to squad: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMoveMember = async (userId: string, teamId: string) => {
        try {
            setLoading(true);

            // CAPACITY CHECK
            if (teamId) {
                const team = data.teams.find((t: any) => t.id === teamId);
                if (team) {
                    const currentCount = data.users.filter((u: any) => u.team_id === teamId).length;
                    const isRgmTeam = isRGM({ members: data.users.filter((u: any) => u.team_id === teamId) });
                    const maxMembers = team.max_members || (isRgmTeam ? 4 : 5);
                    const incomingCount = userId === 'BULK' ? selectedUsers.length : 1;

                    if (currentCount + incomingCount > maxMembers) {
                        throw new Error(`Capacity Limit Exceeded! This squad is capped at ${maxMembers} warriors. ${isRgmTeam ? 'Increase capacity first to add a 5th member.' : ''}`);
                    }
                }
            }

            // BULK MERGE LOGIC
            if (userId === 'BULK') {
                // When moving to a team, set role to MEMBER
                // When removing from team (teamId is null/empty), reset to MEMBER
                const updateData: any = { team_id: teamId || null };
                if (teamId) {
                    // Check if team has a leader
                    const targetTeam = data.teams.find((t: any) => t.id === teamId);
                    const hasLeader = targetTeam?.members?.some((m: any) => m.role === 'LEADER');

                    if (!hasLeader) {
                        // In bulk, if we have selected users, the first one gets LEADER
                        // This requires two separate updates or a conditional map
                        const [firstId, ...restIds] = selectedUsers;

                        // First update for the new leader
                        const { error: leaderErr } = await supabase
                            .from("users")
                            .update({ team_id: teamId, role: 'LEADER' })
                            .eq("id", firstId);
                        if (leaderErr) throw leaderErr;

                        // Second update for the rest
                        if (restIds.length > 0) {
                            const { error: restErr } = await supabase
                                .from("users")
                                .update({ team_id: teamId, role: 'MEMBER' })
                                .in("id", restIds);
                            if (restErr) throw restErr;
                        }
                    } else {
                        // Team already has leader, everyone else is member
                        const { error } = await supabase
                            .from("users")
                            .update({ team_id: teamId, role: 'MEMBER' })
                            .in("id", selectedUsers);
                        if (error) throw error;
                    }
                } else {
                    // Reset role when removing from team
                    const { error } = await supabase
                        .from("users")
                        .update({ team_id: null, role: 'MEMBER' })
                        .in("id", selectedUsers);
                    if (error) throw error;
                }
                alert(`Successfully merged ${selectedUsers.length} warriors!`);
                setSelectedUsers([]);
            } else {
                // SINGLE MOVE LOGIC
                const updateData: any = { team_id: teamId || null };

                if (teamId) {
                    // Check if team has a leader
                    const targetTeam = data.teams.find((t: any) => t.id === teamId);
                    const hasLeader = targetTeam?.members?.some((m: any) => m.role === 'LEADER');
                    updateData.role = hasLeader ? 'MEMBER' : 'LEADER';
                } else {
                    updateData.role = 'MEMBER';
                }

                const { error } = await supabase
                    .from("users")
                    .update(updateData)
                    .eq("id", userId);

                if (error) throw error;
                alert("Squad reassigned effectively!");
            }

            if (teamId) setTeamViewMode('ALL'); // Show the team we just moved into
            setMovingUser(null);
            fetchAllData();
        } catch (err: any) {
            alert("Move failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (table: string, id: string, current: boolean) => {
        await supabase.from(table).update({ active: !current }).eq("id", id);
        fetchAllData();
    };

    const deleteItem = async (table: string, id: string) => {
        if (window.confirm("Delete this item permanently?")) {
            await supabase.from(table).delete().eq("id", id);
            fetchAllData();
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm("Start Squad Disbandment Protocol? This will release all warriors.")) return;
        try {
            setLoading(true);
            // Use server action to ensure consistent logic (status reset, role update)
            await deleteTeam(teamId);
            fetchAllData();
        } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    };

    const handleBulkCreateTeam = async () => {
        const name = prompt("Enter New Squad Name:");
        if (!name) return;
        try {
            setLoading(true);

            // 1. Create Team using Server Action (Ensures Sequential ID)
            // Using 'BULK' payment mode and max_members 5 (Admin override)
            const { data: team, error: teamErr } = await createTeam(name, admin.id, 'BULK', 5);
            if (teamErr || !team) throw new Error(teamErr || "Team creation failed");

            // 2. Add members
            const [firstId, ...restIds] = selectedUsers;

            // First user is LEADER
            const { error: leaderErr } = await supabase
                .from('users')
                .update({ team_id: team.id, role: 'LEADER' })
                .eq('id', firstId);
            if (leaderErr) throw leaderErr;

            // Others are MEMBERS
            if (restIds.length > 0) {
                const { error: memberErr } = await supabase
                    .from('users')
                    .update({ team_id: team.id, role: 'MEMBER' })
                    .in('id', restIds);
                if (memberErr) throw memberErr;
            }

            setSelectedUsers([]);
            setTeamViewMode('ALL'); // Show new squad
            fetchAllData();
            alert(`Squad "${name}" formed successfully with Team # ${team?.team_number || 'Generated'}`);
        } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    };

    const handleScan = async (result: any) => {
        if (!result) return;
        const regNo = result[0]?.rawValue || result;
        if (!regNo) return;

        try {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(regNo) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(regNo);

            let query = supabase.from("users").select("*, squad:teams!team_id(name, team_number)");
            if (isUUID) {
                query = query.eq("id", regNo);
            } else {
                query = query.eq("reg_no", regNo);
            }

            const { data: user, error } = await query.single();

            if (error || !user) throw new Error("Participant not found in database.");

            if (user.status !== "APPROVED") {
                setScanResult({
                    name: user.name,
                    error: `ACCESS DENIED: Status ${user.status}`,
                    status: "FAILED ❌"
                });
                return;
            }

            if (user.is_present) {
                setScanResult({
                    name: user.name,
                    error: "DUPLICATE ENTRY: Already checked in.",
                    status: "WARNING ⚠️"
                });
                return;
            }

            // Mark Attendance in DB
            await markAttendance(user.id, user.team_id, attendanceDate, attendanceTime);

            // Play professional success sound
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                // Professional two-tone success sound
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            } catch (e) {
                console.log("Audio playback not supported");
            }

            // Set scan result for display
            setScanResult({
                name: user.name,
                team: user.squad?.name || "SOLO",
                team_number: user.squad?.team_number || "---",
                status: "ACKNOWLEDGED ✅"
            });

            setData((prev: any) => ({
                ...prev,
                users: prev.users.map((u: any) => u.id === user.id ? { ...u, is_present: true } : u)
            }));

            // Add to activity feed
            setRecentScans(prev => [{
                name: user.name,
                team: user.squad?.name || "SOLO",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                id: Date.now()
            }, ...prev].slice(0, 5));

            // Auto-clear result after 5s
            setTimeout(() => setScanResult(null), 5000);

            // Fallback: still update users table is_present for backward compatibility
            await supabase.from("users").update({ is_present: true }).eq("id", user.id);

        } catch (err: any) {
            alert("Scan failed: " + err.message);
        }
    };

    const filteredTeams = hideIncomplete
        ? data.teams.filter((t: any) => t.isVirtual ? t.members[0]?.status !== 'UNPAID' : t.members.some((m: any) => m.status !== 'UNPAID'))
        : data.teams;



    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* Sidebar Toggle (Mobile Only) */}
            <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileMenuOpen(false)} />

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-64 border-r border-white/10 bg-black flex flex-col shrink-0 z-[70] transition-transform duration-300 transform
                lg:relative lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center font-bold text-white">M</div>
                        <div>
                            <div className="font-bold text-sm text-white">TechSprint</div>
                            <div className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Main Admin</div>
                        </div>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-white/70 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-white/50 mb-2 px-3 tracking-widest">Main Operations</p>
                        <NavItem icon={Users} label="Participants" active={activeTab === "USERS"} onClick={() => { setActiveTab("USERS"); setMobileMenuOpen(false); }} />
                        <NavItem icon={ShieldCheck} label="Verify Queue" active={activeTab === "VERIFY_QUEUE"} onClick={() => { setActiveTab("VERIFY_QUEUE"); setMobileMenuOpen(false); }} />
                        <NavItem icon={QrCode} label="Take Attendance" active={activeTab === "SCAN"} onClick={() => { setActiveTab("SCAN"); setMobileMenuOpen(false); }} />
                        <NavItem icon={Menu} label="All Teams" active={activeTab === "TEAMS"} onClick={() => { setActiveTab("TEAMS"); setMobileMenuOpen(false); }} />
                    </div>
                    <NavItem icon={ShieldCheck} label="Sub Admins" active={activeTab === 'ADMINS'} onClick={() => { setActiveTab('ADMINS'); setMobileMenuOpen(false); }} />
                    <NavItem icon={QrCode} label="QR Codes" active={activeTab === 'QR'} onClick={() => { setActiveTab('QR'); setMobileMenuOpen(false); }} />
                    <NavItem icon={Mail} label="Email Accounts" active={activeTab === 'EMAILS'} onClick={() => { setActiveTab('EMAILS'); setMobileMenuOpen(false); }} />
                    <NavItem icon={LinkIcon} label="WhatsApp Links" active={activeTab === 'GROUPS'} onClick={() => { setActiveTab('GROUPS'); setMobileMenuOpen(false); }} />
                    <NavItem icon={MessageCircle} label="Support Tickets" active={false} onClick={() => window.location.href = "/admin/support"} />
                    <NavItem icon={Activity} label="Action Logs" active={activeTab === 'LOGS'} onClick={() => { setActiveTab('LOGS'); setMobileMenuOpen(false); }} />
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => { adminLogout(); window.location.href = "/admin/login"; }}
                        className="w-full flex items-center gap-3 p-3 text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="min-h-20 h-auto py-4 border-b border-white/10 px-4 sm:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sticky top-0 bg-black/50 backdrop-blur-xl z-20">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-white/60 hover:text-white">
                                <Menu className="w-6 h-6" />
                            </button>
                            <div className="flex-1 sm:flex-none">
                                <h2 className="text-sm sm:text-l font-bold truncate">
                                    {activeTab === "SCAN" ? "Attendance" : activeTab.replace('_', ' ')}
                                    <span className="hidden sm:inline-block text-[10px] text-orange-500 ml-2 border border-orange-500/20 px-2 py-0.5 rounded bg-orange-500/5">v2.1</span>
                                </h2>
                                {lastSynced && (
                                    <p className="text-[9px] text-white/50 font-mono uppercase tracking-widest">
                                        Synced: {lastSynced.toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </div>

                        {activeTab === 'USERS' && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs w-full sm:w-64 outline-none focus:border-orange-500/50 transition-all font-mono"
                                    />
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white font-bold text-lg">×</button>
                                    )}
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-500/50 appearance-none text-white/60 flex-1 sm:flex-none"
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="VERIFYING">Verifying</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                    </select>
                                    <select
                                        value={memberTypeFilter}
                                        onChange={(e) => setMemberTypeFilter(e.target.value as any)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-500/50 appearance-none text-white/60 flex-1 sm:flex-none"
                                    >
                                        <option value="ALL">All Members</option>
                                        <option value="SQUAD">Squad Only</option>
                                        <option value="SOLO">Solo Only</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 w-full lg:w-auto justify-end">
                        <button onClick={() => fetchAllData()} title="Refresh" className="text-white/70 hover:text-white transition-colors bg-white/5 p-2 rounded-lg border border-white/10">
                            <Activity className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setHideIncomplete(!hideIncomplete)}
                            title={hideIncomplete ? "Showing Paid Only" : "Showing All (Including Unpaid)"}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-[10px] font-black uppercase tracking-widest ${hideIncomplete ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}
                        >
                            {hideIncomplete ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{hideIncomplete ? "Paid Only" : "Show All"}</span>
                        </button>

                        {activeTab === 'USERS' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUniversalExport}
                                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 border border-green-500/20 px-3 py-2 rounded-lg text-[10px] font-black text-white hover:opacity-90 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.3)] whitespace-nowrap"
                                >
                                    <Download className="w-3 h-3" /> <span className="hidden sm:inline">Export</span>
                                </button>
                                <label className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-white/10 transition-all cursor-pointer uppercase tracking-tighter opacity-70 hover:opacity-100 whitespace-nowrap">
                                    <Upload className="w-3 h-3" /> <span className="hidden sm:inline">Imp</span>
                                    <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                                </label>
                                <button
                                    onClick={handlePurgeUnpaid}
                                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/50 px-3 py-2 rounded-lg text-[10px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest whitespace-nowrap"
                                    title="Delete all UNPAID users"
                                >
                                    <Trash2 className="w-3 h-3" /> <span className="hidden sm:inline">Purge Unpaid</span>
                                </button>
                            </div>
                        )}

                        {activeTab !== 'USERS' && activeTab !== 'LOGS' && (
                            <button
                                onClick={() => { setFormData({}); setShowModal(activeTab); }}
                                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" /> Add <span className="hidden sm:inline">New</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="p-8">

                    {activeTab === 'SCAN' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-black tracking-tighter uppercase italic">Attendance Protocol <span className="text-orange-500">v3.0</span></h2>
                                <p className="text-white/70 text-[10px] font-black tracking-[0.2em] uppercase">Sector Attendance & Validation Subsystem</p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                {/* Left: Controls & Stats */}
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Session Configuration</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-black text-white/50 ml-1">Event Date</label>
                                                <input
                                                    type="date"
                                                    value={attendanceDate}
                                                    onChange={(e) => setAttendanceDate(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-orange-500/50 transition-all text-sm font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-black text-white/50 ml-1">Session Time</label>
                                                <input
                                                    type="time"
                                                    value={attendanceTime}
                                                    onChange={(e) => setAttendanceTime(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-orange-500/50 transition-all text-sm font-mono"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleAttendanceExport}
                                            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all group"
                                        >
                                            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            Generate Session Report
                                        </button>
                                    </div>

                                    {scanResult && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`border p-6 rounded-3xl space-y-4 shadow-xl transition-colors duration-500 ${scanResult.error ? 'bg-red-500/10 border-red-500/30' :
                                                scanResult.status.includes('WARNING') ? 'bg-orange-500/10 border-orange-500/30' :
                                                    'bg-cyan-500/5 border-cyan-500/20'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${scanResult.error ? 'text-red-500' : 'text-cyan-500'}`}>
                                                    {scanResult.error ? 'Validation ERROR' : 'Validation ACK'}
                                                </span>
                                                {scanResult.error ? <ShieldAlert className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-cyan-500" />}
                                            </div>
                                            <div>
                                                <div className="text-xl font-black text-white uppercase truncate">{scanResult.name}</div>
                                                {scanResult.error ? (
                                                    <div className="text-[10px] font-bold text-red-400 mt-1 flex items-center gap-1">
                                                        <Activity className="w-3 h-3" /> {scanResult.error}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black uppercase text-white/70">{scanResult.team}</span>
                                                        <span className="text-[10px] font-mono text-orange-500 bg-orange-500/10 px-2 rounded">{scanResult.team_number}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-white/50 uppercase">Status Code</span>
                                                <span className={`text-[10px] font-black ${scanResult.error ? 'text-red-400' : 'text-cyan-400'}`}>{scanResult.status}</span>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center">
                                            <div className="text-xl font-black text-white">{data.users.filter((u: any) => u.is_present).length}</div>
                                            <div className="text-[8px] text-white/50 uppercase font-black tracking-widest mt-1">Verified Entrants</div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center">
                                            <div className="text-xl font-black text-white/10">{data.users.filter((u: any) => !u.is_present && u.status === 'APPROVED').length}</div>
                                            <div className="text-[8px] text-white/50 uppercase font-black tracking-widest mt-1">Pending Entry</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Scanner Interface */}
                                <div className="space-y-6 w-full max-w-sm">
                                    <div className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-[0_0_50px_rgba(255,165,0,0.1)] group">
                                        <Scanner
                                            onScan={handleScan}
                                            allowMultiple={true}
                                            scanDelay={2000}
                                            components={{ finder: true }}
                                            styles={{ container: { width: '100%', height: '100%' } }}
                                        />
                                        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 group-hover:border-black/20 transition-all" />
                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none px-10">
                                            <div className="w-full h-0.5 bg-orange-500 animate-scan-line shadow-[0_0_20px_rgba(249,115,22,1)]" />
                                        </div>

                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[9px] font-black uppercase text-white/80 tracking-tighter">Sensor Online</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setScanResult(null); fetchAllData(); }}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <RotateCcw className="w-4 h-4 text-orange-500" />
                                        Re-calibrate Sensors
                                    </button>

                                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Recent Activity Feed</span>
                                            <Clock className="w-4 h-4 text-white/50" />
                                        </div>
                                        <div className="space-y-3">
                                            {recentScans.length === 0 ? (
                                                <div className="text-[10px] text-white/10 text-center py-4 uppercase italic">No scans recorded yet...</div>
                                            ) : (
                                                recentScans.map((s) => (
                                                    <motion.div
                                                        key={s.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl"
                                                    >
                                                        <div>
                                                            <div className="text-[10px] font-black text-white uppercase">{s.name}</div>
                                                            <div className="text-[8px] text-white/50 uppercase font-bold">{s.team}</div>
                                                        </div>
                                                        <div className="text-[9px] font-mono text-cyan-500">{s.time}</div>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'VERIFY_QUEUE' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <h2 className="text-xl font-black tracking-tight">VERIFICATION COMMAND CENTER</h2>
                                    <p className="text-[10px] text-white/70 font-mono uppercase tracking-widest mt-1">Grouped Verification Protocol</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-orange-500">{getAllParticipantGroups(data.users.filter((u: any) => ['PENDING', 'VERIFYING'].includes(u.status))).length}</div>
                                    <div className="text-[8px] text-white/70 uppercase font-black tracking-widest">Active Groups</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getAllParticipantGroups(data.users.filter((u: any) => ['PENDING', 'VERIFYING'].includes(u.status))).map(group => {
                                    const proofSource = group.proof;
                                    const totalAmount = group.count * 800;
                                    const hasProof = !!proofSource?.screenshot_url;
                                    const isRgmGroup = isRGM(group);
                                    const maxMembers = group.max_members || (isRgmGroup ? 4 : 5);
                                    const isOverCapacity = group.count > maxMembers;

                                    return (
                                        <div
                                            key={group.id}
                                            onClick={() => setVerificationGroup(group)}
                                            className={`bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all rounded-3xl p-5 cursor-pointer group relative overflow-hidden ${isRgmGroup ? 'border-l-4 border-l-orange-500' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded inline-block ${group.type === 'SQUAD' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                                            {group.type}
                                                        </span>
                                                        {isRgmGroup && (
                                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                                                                RGM
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="font-bold text-lg leading-tight truncate w-48">{group.teamName}</h3>
                                                    <p className="text-[10px] font-mono text-white/70 mt-1">{group.teamNumber}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-green-400">₹{totalAmount}</div>
                                                    <div className="text-[9px] text-white/70 font-bold flex items-center justify-end gap-1">
                                                        <Users className="w-3 h-3" /> {group.count}
                                                    </div>
                                                    {group.members.some((m: any) => m.status === 'APPROVED') && (
                                                        <div className="mt-1 text-[7px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                            Partial Squad Update
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {isOverCapacity && (
                                                <div className="absolute top-2 right-2 bg-red-500/20 text-red-400 text-[8px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> OVER CAPACITY ({group.count}/{maxMembers})
                                                </div>
                                            )}

                                            {/* Preview Thumbnail */}
                                            <div className="h-24 w-full bg-black/20 rounded-xl overflow-hidden relative border border-white/5">
                                                {hasProof ? (
                                                    <Image src={proofSource.screenshot_url} alt="Proof" fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase text-white/50 tracking-widest">
                                                        No Proof Uploaded
                                                    </div>
                                                )}
                                                {/* UTR Badge */}
                                                {hasProof && (
                                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-mono text-cyan-400 border border-white/10 truncate max-w-[90%]">
                                                        {proofSource.transaction_id || "NO ID"}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 flex items-center justify-between text-[10px] uppercase font-bold text-white/50">
                                                <span>Click to Verify</span>
                                                <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                                                    <ChevronRight className="w-3 h-3" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {getAllParticipantGroups(data.users.filter((u: any) => ['PENDING', 'VERIFYING'].includes(u.status))).length === 0 && (
                                    <div className="col-span-full py-20 text-center">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 className="w-8 h-8 text-green-500/50" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white/70">All Clear</h3>
                                        <p className="text-xs text-white/50 uppercase tracking-widest mt-2">No pending verifications</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'USERS' && (
                        <>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-6 w-fit">
                                <button
                                    onClick={() => setParticipantViewMode('TABLE')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${participantViewMode === 'TABLE' ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'text-white/70 hover:text-white'}`}
                                >
                                    Detailed Table
                                </button>
                                <button
                                    onClick={() => setParticipantViewMode('GROUPED')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${participantViewMode === 'GROUPED' ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'text-white/70 hover:text-white'}`}
                                >
                                    Squad/Solo Cards
                                </button>
                            </div>

                            {participantViewMode === 'GROUPED' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
                                    {getAllParticipantGroups(filteredUsers).map(group => {
                                        const proofSource = group.proof;
                                        const totalAmount = group.count * 800;
                                        const hasProof = !!proofSource?.screenshot_url;
                                        const isAllPaid = group.members.every((m: any) => m.status === 'APPROVED');
                                        const isRgmGroup = isRGM(group);
                                        const maxMembers = isRgmGroup ? 4 : 5;
                                        const isOverCapacity = group.count > maxMembers;

                                        return (
                                            <div
                                                key={group.id}
                                                onClick={() => setVerificationGroup(group)}
                                                className={`bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all rounded-3xl p-5 cursor-pointer group relative overflow-hidden ${isAllPaid ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-yellow-500'} ${isRgmGroup ? 'border-r-4 border-r-orange-500' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded inline-block ${group.type === 'SQUAD' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                                                {group.type}
                                                            </span>
                                                            {isRgmGroup && (
                                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                                                                    RGM
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="font-bold text-lg leading-tight truncate w-48 text-white">{group.teamName}</h3>
                                                        <p className="text-[10px] font-mono text-white/70 mt-1">{group.teamNumber}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-lg font-black ${isAllPaid ? 'text-green-400' : 'text-yellow-400'}`}>
                                                            {isAllPaid ? 'PAID' : 'PENDING'}
                                                        </div>
                                                        <div className="text-[9px] text-white/70 font-bold flex items-center justify-end gap-1">
                                                            <Users className="w-3 h-3" /> {group.count}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="h-24 w-full bg-black/20 rounded-xl overflow-hidden relative border border-white/5 mb-3">
                                                    {hasProof ? (
                                                        <Image src={proofSource.screenshot_url} alt="Proof" fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase text-white/50 tracking-widest text-center px-4">
                                                            {isAllPaid ? 'Verification Complete' : 'Awaiting Proof Upload'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-white/50">
                                                    <span>View Squad Intel</span>
                                                    <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                                                        <ChevronRight className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <>
                                    {selectedUsers.length > 0 && (
                                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 mb-4 rounded-xl flex items-center justify-between sticky top-24 z-20 backdrop-blur-md">
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-orange-400 text-sm">{selectedUsers.length} Warriors Selected</span>
                                                <button onClick={() => setSelectedUsers([])} className="text-[10px] text-white/70 hover:text-white uppercase font-bold">Clear Selection</button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleBulkCreateTeam}
                                                    className="px-4 py-2 bg-cyan-600/20 border border-cyan-500 text-cyan-400 text-xs font-black rounded-lg hover:bg-cyan-600 hover:text-black transition-all uppercase tracking-widest"
                                                >
                                                    Form Squad
                                                </button>
                                                <button
                                                    onClick={() => setMovingUser({ id: 'BULK', name: `${selectedUsers.length} Warriors` } as any)}
                                                    className="px-4 py-2 bg-orange-500 text-black text-xs font-black rounded-lg hover:bg-orange-400 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                                >
                                                    Merge into Squad
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <TableLayout
                                        headers={[
                                            <input type="checkbox" onChange={(e) => {
                                                if (e.target.checked) setSelectedUsers(filteredUsers.map((u: any) => u.id));
                                                else setSelectedUsers([]);
                                            }} checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} className="rounded border-white/20 bg-white/5" />,
                                            'Participant (Reg No)', 'Squad Info', 'Role', 'Contact (Email/Phone)', 'College', 'Bio (Yr/T/Br)', 'Status', 'Proof', 'Actions'
                                        ]}
                                        data={filteredUsers}
                                        renderMobileCard={(u: any) => (
                                            <div key={u.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 relative group overflow-hidden">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.includes(u.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                                                                else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                                            }}
                                                            className="rounded border-white/20 bg-white/5 w-5 h-5"
                                                        />
                                                        <div>
                                                            <div className="font-black text-white text-lg">{u.name}</div>
                                                            <div className="text-xs text-white/70 font-mono uppercase">{u.reg_no}</div>
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={u.status} />
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] text-white/50 uppercase font-black">Squad</div>
                                                        {u.squad ? (
                                                            <div className="font-bold text-purple-400">{u.squad.name}</div>
                                                        ) : u.pendingJoin ? (
                                                            <div className="font-bold text-yellow-500 animate-pulse text-[10px]">
                                                                JOINING {u.pendingJoin.teamName}
                                                            </div>
                                                        ) : (
                                                            <div className="font-bold text-white/50">SOLO</div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] text-white/50 uppercase font-black">College</div>
                                                        <div className="font-bold">{u.college || 'N/A'}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] text-white/50 uppercase font-black">Paid?</div>
                                                        <div className={`font-bold ${u.status === 'APPROVED' ? 'text-green-400' : 'text-yellow-500'}`}>{u.status === 'APPROVED' ? 'YES' : 'NO'}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] text-white/50 uppercase font-black">Phone</div>
                                                        <div className="font-mono text-white/60">{u.phone}</div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                                    <button onClick={() => { setFormData({}); setShowModal(activeTab); /* Just a placeholder for edit */ }} className="flex-1 py-2 bg-white/5 text-[10px] uppercase font-bold rounded hover:bg-white/10">Edit</button>
                                                    <button onClick={() => deleteItem('users', u.id)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        )}
                                        renderRow={(u: any) => (
                                            <tr key={u.id} className={`border-b border-white/5 hover:bg-white/[0.01] ${selectedUsers.includes(u.id) ? 'bg-orange-500/5' : ''}`}>
                                                <td className="py-4 px-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUsers.includes(u.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                                                            else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                                        }}
                                                        className="rounded border-white/20 bg-white/5"
                                                    />
                                                </td>
                                                <td className="py-4 px-4">
                                                    {editingId === u.id && editField === 'name' ? (
                                                        <input
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleInlineSave(u.id, 'name', editValue)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(u.id, 'name', editValue)}
                                                            className="bg-black/50 border border-orange-500/50 rounded px-2 py-1 w-full outline-none font-bold"
                                                        />
                                                    ) : (
                                                        <div onDoubleClick={() => { setEditingId(u.id); setEditField('name'); setEditValue(u.name); }} className="font-bold cursor-pointer hover:text-orange-400">
                                                            {u.name}
                                                        </div>
                                                    )}
                                                    {editingId === u.id && editField === 'reg_no' ? (
                                                        <input
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleInlineSave(u.id, 'reg_no', editValue)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(u.id, 'reg_no', editValue)}
                                                            className="bg-black/50 border border-orange-500/50 rounded px-2 py-0.5 w-full mt-1 outline-none text-[10px] font-mono"
                                                        />
                                                    ) : (
                                                        <div onDoubleClick={() => { setEditingId(u.id); setEditField('reg_no'); setEditValue(u.reg_no); }} className="text-[10px] text-white/70 uppercase font-mono cursor-pointer hover:text-orange-400">
                                                            {u.reg_no}
                                                        </div>
                                                    )}
                                                    {u.is_present && <span className="mt-1 inline-flex items-center gap-1 text-[8px] font-black bg-cyan-500 text-black px-1 rounded uppercase">In Venue</span>}
                                                </td>
                                                <td className="py-4 px-4 overflow-hidden">
                                                    {u.squad ? (
                                                        <div className="max-w-[140px]">
                                                            <div className="text-[11px] font-black uppercase text-purple-400 truncate">{u.squad.name}</div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[9px] font-mono text-white/70">{u.squad.unique_code}</span>
                                                                <span className={`text-[8px] font-bold px-1 rounded ${u.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                                    {u.status === 'APPROVED' ? 'PAID' : 'PENDING'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : u.pendingJoin ? (
                                                        <div className="max-w-[140px] opacity-80">
                                                            <div className="text-[10px] font-black uppercase text-yellow-500 truncate italic">JOINING {u.pendingJoin.teamName}</div>
                                                            <div className="text-[8px] font-mono text-yellow-500/40">{u.pendingJoin.teamCode}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-white/10 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded bg-white/[0.02]">
                                                            LONE WOLF
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest w-fit px-1.5 py-0.5 rounded ${u.squad ? 'bg-purple-500/10 text-purple-400' : 'text-white/50'}`}>
                                                            {u.squad ? 'SQUAD' : 'SOLO'}
                                                        </span>
                                                        {editingId === u.id && editField === 'role' ? (
                                                            <select
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={(e) => handleInlineSave(u.id, 'role', e.target.value)}
                                                                onBlur={() => setEditingId(null)}
                                                                className="bg-black/50 border border-orange-500/50 rounded px-1 py-0.5 outline-none text-[9px] font-bold text-yellow-500"
                                                            >
                                                                <option value="MEMBER">MEMBER</option>
                                                                <option value="LEADER">LEADER</option>
                                                            </select>
                                                        ) : (
                                                            <div onDoubleClick={() => { setEditingId(u.id); setEditField('role'); setEditValue(u.role || "MEMBER"); }} className="cursor-pointer">
                                                                {u.role === 'LEADER' ? (
                                                                    <span className="text-[8px] font-bold text-yellow-500 flex items-center gap-1"><Crown className="w-3 h-3" /> LEADER</span>
                                                                ) : (
                                                                    <span className="text-[8px] font-bold text-white/50 uppercase">MEMBER</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-xs whitespace-nowrap font-mono">
                                                    {editingId === u.id && editField === 'email' ? (
                                                        <input
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleInlineSave(u.id, 'email', editValue)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(u.id, 'email', editValue)}
                                                            className="bg-black/50 border border-orange-500/50 rounded px-2 py-1 w-full outline-none"
                                                        />
                                                    ) : (
                                                        <div onDoubleClick={() => { setEditingId(u.id); setEditField('email'); setEditValue(u.email); }} className="cursor-pointer hover:text-orange-400">
                                                            {u.email}
                                                        </div>
                                                    )}
                                                    {editingId === u.id && editField === 'phone' ? (
                                                        <input
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleInlineSave(u.id, 'phone', editValue)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(u.id, 'phone', editValue)}
                                                            className="bg-black/50 border border-orange-500/50 rounded px-2 py-1 w-full mt-1 outline-none"
                                                        />
                                                    ) : (
                                                        <div onDoubleClick={() => { setEditingId(u.id); setEditField('phone'); setEditValue(u.phone); }} className="text-white/70 cursor-pointer hover:text-orange-400 mt-1">
                                                            {u.phone}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-[10px] text-white/60">
                                                    {editingId === u.id && editField === 'college' ? (
                                                        <input
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleInlineSave(u.id, 'college', editValue)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(u.id, 'college', editValue)}
                                                            className="bg-black/50 border border-orange-500/50 rounded px-2 py-0.5 w-full outline-none"
                                                        />
                                                    ) : (
                                                        <div onDoubleClick={() => { setEditingId(u.id); setEditField('college'); setEditValue(u.college || ""); }} className="flex items-center gap-2 cursor-pointer hover:text-orange-400">
                                                            <span>{u.college || 'N/A'}</span>
                                                            {isRGM(u) && <span className="px-1.5 py-0.5 bg-orange-500 text-black text-[8px] font-black rounded">RGM</span>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-[10px] text-white/60">
                                                    <div className="flex flex-col gap-1">
                                                        {editingId === u.id && editField === 'year' ? (
                                                            <select
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={(e) => handleInlineSave(u.id, 'year', e.target.value)}
                                                                onBlur={() => setEditingId(null)}
                                                                className="bg-black/50 border border-orange-500/50 rounded px-1 py-0.5 outline-none text-[9px]"
                                                            >
                                                                <option value="">Year</option>
                                                                {["1", "2", "3", "4"].map(y => <option key={y} value={y}>{y} Year</option>)}
                                                            </select>
                                                        ) : (
                                                            <span onDoubleClick={() => { setEditingId(u.id); setEditField('year'); setEditValue(u.year || ""); }} className="cursor-pointer hover:text-orange-400 bg-white/5 px-2 py-0.5 rounded w-fit">
                                                                Year: {u.year || '--'}
                                                            </span>
                                                        )}

                                                        {editingId === u.id && editField === 'tshirt_size' ? (
                                                            <select
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={(e) => handleInlineSave(u.id, 'tshirt_size', e.target.value)}
                                                                onBlur={() => setEditingId(null)}
                                                                className="bg-black/50 border border-orange-500/50 rounded px-1 py-0.5 outline-none text-[9px]"
                                                            >
                                                                {["S", "M", "L", "XL", "XXL"].map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        ) : (
                                                            <span onDoubleClick={() => { setEditingId(u.id); setEditField('tshirt_size'); setEditValue(u.tshirt_size || "M"); }} className="cursor-pointer hover:text-orange-400 bg-white/5 px-2 py-0.5 rounded w-fit uppercase">
                                                                Size: {u.tshirt_size || 'M'}
                                                            </span>
                                                        )}

                                                        {editingId === u.id && editField === 'branch' ? (
                                                            <select
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={(e) => handleInlineSave(u.id, 'branch', e.target.value)}
                                                                onBlur={() => setEditingId(null)}
                                                                className="bg-black/50 border border-orange-500/50 rounded px-1 py-0.5 outline-none text-[9px]"
                                                            >
                                                                <option value="">Branch</option>
                                                                {["CSE", "CSE-AIML", "CSE-DS", "CSE-BS", "EEE", "ECE", "MECH", "CIVIL", "OTHERS"].map(b => (
                                                                    <option key={b} value={b}>{b}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <span onDoubleClick={() => { setEditingId(u.id); setEditField('branch'); setEditValue(u.branch || ""); }} className="cursor-pointer hover:text-orange-400 bg-white/5 px-2 py-0.5 rounded w-fit">
                                                                {u.branch || 'Br: --'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="relative group/status flex justify-center">
                                                        <StatusBadge status={u.status} />
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover/status:flex flex-col bg-neutral-900 border border-white/10 rounded-lg shadow-2xl z-[100] p-1 mt-1">
                                                            {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => handleInlineSave(u.id, 'status', s)}
                                                                    className="px-3 py-1.5 text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/5 rounded transition-all whitespace-nowrap"
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    {u.screenshot_url ? (
                                                        <a href={u.screenshot_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded bg-white/5 flex items-center justify-center border border-white/10 hover:border-orange-500/50 transition-all overflow-hidden relative">
                                                            <Image src={u.screenshot_url} alt="Proof" fill className="object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                                <ExternalLink className="w-3 h-3" />
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <span className="text-[10px] text-white/50">No Image</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 font-mono text-[10px] text-white/70">
                                                    {editingId === u.id && editField === 'transaction_id' ? (
                                                        <input
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={() => handleInlineSave(u.id, 'transaction_id', editValue)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(u.id, 'transaction_id', editValue)}
                                                            className="bg-black/50 border border-orange-500/50 rounded px-2 py-1 w-full outline-none font-mono"
                                                        />
                                                    ) : (
                                                        <div onDoubleClick={() => { setEditingId(u.id); setEditField('transaction_id'); setEditValue(u.transaction_id || ""); }} className="cursor-pointer hover:text-orange-400">
                                                            {u.transaction_id || 'N/A'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-[10px] text-white/50 whitespace-nowrap">{new Date(u.created_at).toLocaleString()}</td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setEmailModal({ userId: u.id, name: u.name })} className="p-2 text-white/50 hover:text-cyan-500 hover:bg-cyan-500/10 rounded-lg transition-all" title="Send Custom Email">
                                                            <Mail className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setMovingUser(u)} className="p-2 text-white/50 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-all" title="Move to Squad">
                                                            <Camera className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    />
                                </>
                            )}
                        </>
                    )}

                    {activeTab === 'ADMINS' && <TableLayout
                        headers={['Username', 'Role', 'Status', 'Actions']}
                        data={data.admins}
                        renderRow={(a: any) => (
                            <tr key={a.id} className="border-b border-white/5">
                                <td className="py-4 px-4">{a.username}</td>
                                <td className="py-4 px-4 text-xs uppercase font-bold text-orange-400">{a.role}</td>
                                <td className="py-4 px-4">
                                    <button onClick={() => toggleStatus('admins', a.id, a.active)}>
                                        {a.active ? <ToggleRight className="text-green-500" /> : <ToggleLeft className="text-white/50" />}
                                    </button>
                                </td>
                                <td className="py-4 px-4">
                                    <button onClick={() => deleteItem('admins', a.id)} className="text-red-500/40 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        )}
                    />}

                    {activeTab === 'QR' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black tracking-tight text-white uppercase italic">QR Distribution Array</h2>
                                <button
                                    onClick={async () => {
                                        if (confirm("Reset ALL daily usage counters? This should be done at the start of each day.")) {
                                            try {
                                                setLoading(true);
                                                await resetQRUsage();
                                                fetchAllData();
                                                alert("All QR counters reset to zero.");
                                            } catch (err: any) { alert(err.message); } finally { setLoading(false); }
                                        }
                                    }}
                                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-orange-500 transition-all flex items-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" /> Reset Daily Limits
                                </button>
                            </div>
                            <TableLayout
                                headers={['Set Name', 'UPI ID', 'Amount', 'Usage/Limit', 'Status', 'Actions']}
                                data={data.qr}
                                renderMobileCard={(q: any) => (
                                    <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-sm tracking-tight">{q.upi_name || 'N/A'}</div>
                                                <div className="text-[10px] text-orange-400 font-mono">{q.upi_id}</div>
                                            </div>
                                            <div className="text-xl font-black text-cyan-400">₹{q.amount}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold text-white/70">
                                                <span>Daily Usage</span>
                                                <span>{q.today_usage || 0} / {q.daily_limit || 100}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500 transition-all" style={{ width: `${Math.min(((q.today_usage || 0) / (q.daily_limit || 100)) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] uppercase font-bold text-white/50">Active Status</span>
                                                <button onClick={() => toggleStatus('qr_codes', q.id, q.active)}>
                                                    {q.active ? <ToggleRight className="text-green-500 w-6 h-6" /> : <ToggleLeft className="text-white/50 w-6 h-6" />}
                                                </button>
                                            </div>
                                            <button onClick={() => deleteItem('qr_codes', q.id)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                renderRow={(q: any) => (
                                    <tr key={q.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                        <td className="py-4 px-4">
                                            <div className="font-bold text-sm tracking-tight">{q.upi_name || 'N/A'}</div>
                                            <div className="text-[9px] text-white/50 uppercase font-mono tracking-tighter truncate max-w-[150px]">{q.id}</div>
                                        </td>
                                        <td className="py-4 px-4 font-mono text-xs text-orange-400">{q.upi_id}</td>
                                        <td className="py-4 px-4 font-black text-cyan-400">₹{q.amount}</td>
                                        <td className="py-4 px-4">
                                            <div className="text-xs font-bold">{q.today_usage || 0} / {q.daily_limit || 100}</div>
                                            <div className="w-16 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                                <div className="h-full bg-cyan-500" style={{ width: `${Math.min(((q.today_usage || 0) / (q.daily_limit || 100)) * 100, 100)}%` }} />
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <button onClick={() => toggleStatus('qr_codes', q.id, q.active)} className="transition-transform active:scale-90">
                                                {q.active ? <ToggleRight className="text-green-500 w-6 h-6" /> : <ToggleLeft className="text-white/50 w-6 h-6" />}
                                            </button>
                                        </td>
                                        <td className="py-4 px-4">
                                            <button onClick={() => deleteItem('qr_codes', q.id)} className="p-2 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )}
                            />
                        </div>
                    )}

                    {activeTab === 'TEAMS' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6 px-1">
                                <div>
                                    <h2 className="text-xl font-black tracking-tight text-white uppercase italic">Squad Command Center <span className="text-[10px] not-italic text-orange-500 ml-2 border border-orange-500/20 px-2 py-0.5 rounded bg-orange-500/5">v2.1-SQUAD</span></h2>
                                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest pl-0.5">Manage Legions & Solo Warriors</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-2">
                                        <button
                                            onClick={() => setViewMode('VISUAL')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'VISUAL' ? 'bg-orange-500 text-black' : 'text-white/70 hover:text-white'}`}
                                        >
                                            Cards
                                        </button>
                                        <button
                                            onClick={() => setViewMode('GRID')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'GRID' ? 'bg-orange-500 text-black' : 'text-white/70 hover:text-white'}`}
                                        >
                                            Grid
                                        </button>
                                    </div>
                                    <button onClick={handleUniversalExport} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-lg hover:opacity-90 transition-all text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                        <Download className="w-3 h-3" /> Unified Roster
                                    </button>
                                </div>
                            </div>

                            {viewMode === 'VISUAL' ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {filteredTeams.map((team: any) => (
                                        <SquadRow
                                            key={team.id}
                                            team={team}
                                            members={team.members}
                                            onRecruit={(slotId: number) => setRecruitState({ teamId: team.id, slotId })}
                                            onKick={handleMoveMember}
                                            onEdit={(field: string, val: any) => handleEditTeam(team.id, field, val)}
                                            onViewMember={(m: any) => setViewMember(m)}
                                            onDelete={handleDeleteTeam}
                                            isVirtual={team.isVirtual}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[1000px]">
                                            <thead className="bg-white/5">
                                                <tr className="border-b border-white/10">
                                                    <th className="p-4 text-[10px] uppercase tracking-widest text-white/70">Team Identity</th>
                                                    <th className="p-4 text-[10px] uppercase tracking-widest text-white/70">Ref No</th>
                                                    <th className="p-4 text-[10px] uppercase tracking-widest text-white/70">Squad Code</th>
                                                    <th className="p-4 text-[10px] uppercase tracking-widest text-white/70">Type</th>
                                                    <th className="p-4 text-[10px] uppercase tracking-widest text-white/70">College</th>
                                                    <th className="p-4 text-[10px] uppercase tracking-widest text-white/70">Roster Snapshot</th>
                                                    <th className="p-4 text-[10px] uppercase tracking-widest text-white/70">Payment Mode</th>
                                                    <th className="p-4 text-[10px] uppercase tracking-widest text-white/70 text-right">Direct Commands</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredTeams.map((team: any) => (
                                                    <tr key={team.id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${team.isVirtual ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-gradient-to-br from-orange-500 to-red-600 text-white ring-2 ring-white/10'}`}>
                                                                    {team.name[0]}
                                                                </div>
                                                                <div>
                                                                    {editingId === team.id && editField === 'name' ? (
                                                                        <input
                                                                            autoFocus
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            onBlur={() => handleEditTeam(team.id, 'name', editValue)}
                                                                            onKeyDown={(e) => e.key === 'Enter' && handleEditTeam(team.id, 'name', editValue)}
                                                                            className="bg-black/50 border border-orange-500/50 rounded px-2 py-1 w-full outline-none text-xs font-black uppercase"
                                                                        />
                                                                    ) : (
                                                                        <div onDoubleClick={() => { if (!team.isVirtual) { setEditingId(team.id); setEditField('name'); setEditValue(team.name); } }} className={`text-sm font-black uppercase ${!team.isVirtual ? 'cursor-pointer hover:text-orange-400' : ''}`}>
                                                                            {team.name}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-[9px] text-white/50 font-mono italic max-w-[150px] truncate" title={team.id}>UUID: {team.id.split('-')[0]}...</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="font-mono text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 inline-block shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                                                                {team.team_number || '---'}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            {editingId === team.id && editField === 'unique_code' ? (
                                                                <input
                                                                    autoFocus
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    onBlur={() => handleEditTeam(team.id, 'unique_code', editValue)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleEditTeam(team.id, 'unique_code', editValue)}
                                                                    className="bg-black/50 border border-orange-500/50 rounded px-2 py-1 w-24 outline-none font-mono text-xs text-orange-400"
                                                                />
                                                            ) : (
                                                                <span
                                                                    onClick={() => {
                                                                        if (!team.isVirtual) {
                                                                            navigator.clipboard.writeText(team.unique_code);
                                                                            alert(`Code ${team.unique_code} copied to clipboard!`);
                                                                        }
                                                                    }}
                                                                    onDoubleClick={() => { if (!team.isVirtual) { setEditingId(team.id); setEditField('unique_code'); setEditValue(team.unique_code); } }}
                                                                    className={`font-mono text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20 ${!team.isVirtual ? 'cursor-pointer hover:border-orange-400 hover:text-orange-300' : ''}`}
                                                                    title="Click to Copy"
                                                                >
                                                                    {team.unique_code}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${team.isVirtual ? 'bg-white/5 text-white/60' : 'bg-purple-500/10 text-purple-400'}`}>
                                                                {team.isVirtual ? 'SOLO' : 'SQUAD'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            {(() => {
                                                                const leader = team.members.find((m: any) => m.role === 'LEADER') || team.members[0];
                                                                const isRgm = isRGM({ members: team.members });
                                                                return (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-[10px] font-bold text-white/80">{leader?.college || 'N/A'}</span>
                                                                        {isRgm && <span className="text-[8px] font-black bg-orange-500 text-black px-1.5 py-0.5 rounded w-fit uppercase">RGM</span>}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="space-y-1">
                                                                {team.members.slice(0, 3).map((m: any) => (
                                                                    <div key={m.id} className="flex items-center gap-1.5" title={m.name}>
                                                                        <div className="w-4 h-4 rounded-full bg-neutral-800 flex items-center justify-center text-[7px] font-bold text-white/60">
                                                                            {m.name[0]}
                                                                        </div>
                                                                        <span className="text-[10px] text-white/60 truncate max-w-[120px]">{m.name}</span>
                                                                    </div>
                                                                ))}
                                                                {team.members.length > 3 && (
                                                                    <div className="text-[9px] text-white/50 italic pl-1">+ {team.members.length - 3} others</div>
                                                                )}
                                                                {team.members.length === 0 && (
                                                                    <span className="text-[9px] text-red-500/50 italic">No Active Members</span>
                                                                )}
                                                            </div>
                                                            <div className="mt-1.5 text-[9px] font-bold text-white/50 uppercase tracking-tighter border-t border-white/5 pt-1">{team.memberCount} / {team.max_members || 5} Units</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <StatusBadge status={team.payment_mode} />
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        if (team.isVirtual) {
                                                                            setViewMember(team.members[0]);
                                                                        } else {
                                                                            setShowModal('TEAM_DETAILS');
                                                                            setEditingId(team.id);
                                                                            setEditField('TEAM_MEMBERS');
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all shadow-sm"
                                                                >
                                                                    Reveal All
                                                                </button>
                                                                {!team.isVirtual && (
                                                                    <button
                                                                        onClick={() => { if (confirm('Are you sure you want to DISBAND this squad? Members will be released as solo units.')) handleDeleteTeam(team.id); }}
                                                                        className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {teamViewMode === 'ALL' && data.teams.length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                    <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                    <p className="text-white/50 uppercase font-black tracking-widest text-sm">No Active Squads Deployed</p>
                                </div>
                            )}

                            {teamViewMode === 'SOLO' && data.users.filter((u: any) => !u.team_id).length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                    <ShieldCheck className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                    <p className="text-white/50 uppercase font-black tracking-widest text-sm">All Warriors Have Joined Legions</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'EMAILS' && <TableLayout
                        headers={['Account Info', 'Configuration', 'Status', 'Actions']}
                        data={data.emails}
                        renderMobileCard={(e: any) => (
                            <div key={e.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="font-black text-sm text-white break-all">{e.email_address}</div>
                                    <button onClick={() => toggleStatus('email_accounts', e.id, e.active)}>
                                        {e.active ? <ToggleRight className="text-green-500 w-6 h-6" /> : <ToggleLeft className="text-white/50 w-6 h-6" />}
                                    </button>
                                </div>
                                <div className="text-[10px] text-white/70 uppercase font-black">{e.sender_name || 'No Sender Name'}</div>
                                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-cyan-900/10 px-2 py-1 rounded border border-cyan-500/20 w-fit">
                                    <ShieldCheck className="w-3 h-3" />
                                    {e.smtp_host}:{e.smtp_port}
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                    <button onClick={() => handleTestSMTP(e.id)} className="flex-1 py-2 bg-orange-500/10 text-orange-500 rounded hover:bg-orange-500 hover:text-white transition-all text-[10px] uppercase font-bold flex items-center justify-center gap-1">
                                        Test Connection
                                    </button>
                                    <button onClick={() => deleteItem('email_accounts', e.id)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                        renderRow={(e: any) => (
                            <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                <td className="py-4 px-4">
                                    <div className="font-black text-sm text-white">{e.email_address}</div>
                                    <div className="text-[10px] text-white/70 uppercase font-black">{e.sender_name || 'No Sender Name'}</div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="text-xs font-mono text-cyan-400">{e.smtp_host}:{e.smtp_port}</div>
                                    <div className="text-[10px] text-white/50 uppercase font-bold">{e.smtp_port === 465 ? 'SSL/TLS' : 'STARTTLS'}</div>
                                </td>
                                <td className="py-4 px-4">
                                    <button onClick={() => toggleStatus('email_accounts', e.id, e.active)} className="transition-transform active:scale-90">
                                        {e.active ? <ToggleRight className="text-green-500 w-6 h-6" /> : <ToggleLeft className="text-white/50 w-6 h-6" />}
                                    </button>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleTestSMTP(e.id)} className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500 hover:text-white transition-all shadow-sm border border-orange-500/20" title="Test Connection">
                                            <ShieldCheck className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => deleteItem('email_accounts', e.id)} className="p-2 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    />}

                    {activeTab === 'GROUPS' && <TableLayout
                        headers={['College', 'WhatsApp Link', 'Status', 'Actions']}
                        data={data.groups}
                        renderMobileCard={(g: any) => (
                            <div key={g.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.college === 'RGM' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                        {g.college}
                                    </span>
                                    <div className="mt-2 text-[10px] font-mono text-white/70 truncate max-w-[150px]">{g.whatsapp_link}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => toggleStatus('group_links', g.id, g.active)}>
                                        {g.active ? <ToggleRight className="text-green-500 w-6 h-6" /> : <ToggleLeft className="text-white/50 w-6 h-6" />}
                                    </button>
                                    <button onClick={() => deleteItem('group_links', g.id)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                        renderRow={(g: any) => (
                            <tr key={g.id} className="border-b border-white/5">
                                <td className="py-4 px-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.college === 'RGM' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                        {g.college}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-xs font-mono text-white/70">{g.whatsapp_link}</td>
                                <td className="py-4 px-4">
                                    <button onClick={() => toggleStatus('group_links', g.id, g.active)}>
                                        {g.active ? <ToggleRight className="text-green-500" /> : <ToggleLeft className="text-white/50" />}
                                    </button>
                                </td>
                                <td className="py-4 px-4">
                                    <button onClick={() => deleteItem('group_links', g.id)} className="text-red-500/40 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        )}
                    />}

                    {activeTab === 'LOGS' && <div className="space-y-3">
                        {data.logs.map((log: any) => (
                            <div key={log.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500"><Activity className="w-4 h-4" /></div>
                                    <div>
                                        <p className="text-sm font-medium"><span className="text-orange-400">{log.admins?.username}</span> {log.action.replace('_', ' ').toLowerCase()} for <span className="text-cyan-400">{log.users?.name}</span></p>
                                        <p className="text-[10px] text-white/50">{new Date(log.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>}
                </div>
            </main >
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-neutral-900 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold uppercase italic tracking-tighter">
                                    {showModal === 'TEAM_DETAILS' ? 'SQUAD INTEL' : `Add ${showModal}`}
                                </h3>
                                <button onClick={() => setShowModal(null)} className="p-2 hover:bg-white/5 rounded-lg text-white/40"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleAdd} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                {showModal === 'ADMINS' && (
                                    <>
                                        <FormInput label="Username" onChange={v => setFormData({ ...formData, username: v })} />
                                        <FormInput label="Password" type="password" onChange={v => setFormData({ ...formData, password_hash: v })} />
                                    </>
                                )}
                                {showModal === 'QR' && (
                                    <>
                                        <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, bulk: true })}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.bulk !== false ? 'bg-orange-500 text-black' : 'text-white/70 hover:text-white'}`}
                                            >
                                                Bulk Set (5 QR)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, bulk: false })}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.bulk === false ? 'bg-orange-500 text-black' : 'text-white/70 hover:text-white'}`}
                                            >
                                                Single QR
                                            </button>
                                        </div>

                                        <FormInput label="Set Name / UPI Name" placeholder="Set A / Hackathon Main" value={formData.upi_name || ""} onChange={v => setFormData({ ...formData, upi_name: v })} />
                                        <FormInput label="UPI ID" placeholder="event@upi" value={formData.upi_id || ""} onChange={v => setFormData({ ...formData, upi_id: v })} />

                                        {formData.bulk !== false ? (
                                            <div className="grid grid-cols-1 gap-3 mt-4">
                                                {[800, 1600, 2400, 3200, 4000].map(amt => (
                                                    <FormFile
                                                        key={amt}
                                                        label={`QR Image for ₹${amt}`}
                                                        file={formData[`qr_file_${amt}`]}
                                                        onChange={file => setFormData({ ...formData, [`qr_file_${amt}`]: file })}
                                                    />
                                                ))}
                                                <FormInput label="Daily Limit (Each)" type="number" placeholder="100" value={formData.daily_limit?.toString() || ""} onChange={v => setFormData({ ...formData, daily_limit: parseInt(v) })} />
                                            </div>
                                        ) : (
                                            <div className="space-y-4 mt-4">
                                                <FormFile label="QR Image File" file={formData.qr_file} onChange={file => setFormData({ ...formData, qr_file: file })} />
                                                <FormInput label="Amount (₹)" type="number" placeholder="800" value={formData.amount?.toString() || ""} onChange={v => setFormData({ ...formData, amount: parseInt(v) })} />
                                                <FormInput label="Daily Limit" type="number" placeholder="100" value={formData.daily_limit?.toString() || ""} onChange={v => setFormData({ ...formData, daily_limit: parseInt(v) })} />
                                            </div>
                                        )}
                                    </>
                                )}
                                {showModal === 'EMAILS' && (
                                    <>
                                        <FormInput label="Email Address" onChange={v => setFormData({ ...formData, email_address: v })} />
                                        <FormInput label="App Password" type="password" onChange={v => setFormData({ ...formData, app_password: v })} />
                                        <FormInput label="Sender Name" placeholder="Hackathon Admin" onChange={v => setFormData({ ...formData, sender_name: v })} />
                                        <div className="flex gap-4">
                                            <div className="flex-2">
                                                <FormInput label="SMTP Host" placeholder="smtp.gmail.com" onChange={v => setFormData({ ...formData, smtp_host: v })} />
                                            </div>
                                            <div className="flex-1">
                                                <FormInput label="SMTP Port" placeholder="465" onChange={v => setFormData({ ...formData, smtp_port: v })} />
                                            </div>
                                        </div>
                                    </>
                                )}
                                {showModal === 'TEAMS' && (
                                    <>
                                        <FormInput label="Team Name" onChange={v => setFormData({ ...formData, name: v })} />
                                        <FormSelect label="Payment Mode" options={['INDIVIDUAL', 'BULK']} onChange={v => setFormData({ ...formData, payment_mode: v })} />
                                    </>
                                )}
                                {showModal === 'GROUPS' && (
                                    <>
                                        <FormSelect label="College" options={['RGM', 'OTHERS']} onChange={v => setFormData({ ...formData, college: v })} />
                                        <FormInput label="WhatsApp Link" onChange={v => setFormData({ ...formData, whatsapp_link: v })} />
                                    </>
                                )}

                                {editField === 'TEAM_MEMBERS' && (
                                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                        <div className="mb-4">
                                            <div className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Squad ID Reference</div>
                                            <div className="text-xs font-mono text-orange-400 bg-orange-400/5 px-2 py-1 rounded border border-orange-400/10 inline-block">{editingId}</div>
                                        </div>
                                        {data.users.filter((u: any) => u.team_id === editingId).map((u: any) => (
                                            <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-cyan-500/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center font-black text-xs text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">{u.name[0]}</div>
                                                    <div>
                                                        <div className="font-black text-sm uppercase text-white group-hover:text-cyan-400 transition-colors">{u.name}</div>
                                                        <div className="text-[10px] text-white/70 tracking-wider font-mono">{u.reg_no} • {u.role || 'Member'}</div>
                                                        <div className="text-[9px] text-white/50 mt-1 uppercase font-bold">{u.email}</div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <StatusBadge status={u.status} />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setViewMember(u); }} className="text-[8px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-tighter">Bio</button>
                                                        <div className="w-[1px] h-2 bg-white/10" />
                                                        <button onClick={() => { if (confirm(`Remove ${u.name} from this squad?`)) handleMoveMember(u.id, ""); }} className="text-[8px] font-black text-red-500 hover:text-red-400 uppercase tracking-tighter">Kick</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {data.users.filter((u: any) => u.team_id === editingId).length === 0 && (
                                            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                                                <ShieldAlert className="w-8 h-8 text-white/10 mx-auto mb-2" />
                                                <p className="text-white/50 uppercase font-black tracking-widest text-[10px]">No active units in sector</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {editField !== 'TEAM_MEMBERS' && (
                                    <div className="flex gap-4 mt-8">
                                        <button type="button" onClick={() => setShowModal(null)} className="flex-1 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-all">Cancel</button>
                                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Add'}
                                        </button>
                                    </div>
                                )}

                                {editField === 'TEAM_MEMBERS' && (
                                    <button type="button" onClick={() => setShowModal(null)} className="w-full mt-6 py-3 bg-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10">Close Intel Report</button>
                                )}
                            </form>
                        </motion.div>
                    </div>
                )
            }

            {
                movingUser && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-neutral-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-black mb-2 uppercase italic tracking-tighter">Reassign Warrior</h3>
                            <p className="text-white/70 text-[10px] uppercase font-bold mb-6 tracking-widest">Moving {movingUser.name} to new squad</p>

                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                                <button onClick={() => handleMoveMember(movingUser.id, "")} className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:border-red-500/50 transition-all group">
                                    <div className="font-bold text-sm group-hover:text-red-500">REMOVE FROM ALL TEAMS</div>
                                    <div className="text-[10px] text-white/50 uppercase">Convert to Independent Unit</div>
                                </button>
                                {data.teams.map((t: any) => (
                                    <button key={t.id} onClick={() => handleMoveMember(movingUser.id, t.id)} className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-xl hover:border-orange-500/50 transition-all">
                                        <div className="font-bold text-sm uppercase">{t.name}</div>
                                        <div className="text-[10px] text-white/50 uppercase font-mono">{t.unique_code} • {t.memberCount}/{t.max_members} Units</div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setMovingUser(null)} className="w-full mt-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-widest">Abort Relocation</button>
                        </motion.div>
                    </div>
                )
            }

            {
                recruitState && (
                    <RecruitModal
                        users={data.users}
                        onClose={() => setRecruitState(null)}
                        onSelect={(userId: string) => {
                            if (recruitState.teamId.startsWith('SOLO_CONVERT:')) {
                                const soloId = recruitState.teamId.split(':')[1];
                                handleConvertSoloToTeam(soloId, userId);
                            } else {
                                handleMoveMember(userId, recruitState.teamId);
                            }
                            setRecruitState(null);
                        }}
                    />
                )
            }

            {
                viewMember && (
                    <MemberDetailModal
                        user={viewMember}
                        onClose={() => setViewMember(null)}
                        onSave={handleInlineSave}
                    />
                )
            }

            {
                emailModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-neutral-900 border border-white/10 p-8 rounded-3xl max-w-lg w-full shadow-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Custom Dispatch</h3>
                                    <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest">To: {emailModal.name}</p>
                                </div>
                                <button onClick={() => setEmailModal(null)} className="p-2 hover:bg-white/5 rounded-lg text-white/70"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-white/50 ml-1">Subject Header</label>
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        placeholder="Enter email subject..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-white/50 ml-1">Transmission Content</label>
                                    <textarea
                                        value={emailMessage}
                                        onChange={(e) => setEmailMessage(e.target.value)}
                                        placeholder="Write your message here..."
                                        rows={5}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 transition-all text-sm font-medium resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setEmailModal(null)} className="flex-1 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-all text-xs uppercase">Cancel</button>
                                <button
                                    onClick={handleSendEmail}
                                    disabled={loading || !emailSubject || !emailMessage}
                                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 text-xs uppercase"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Send Email</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }

            {
                verificationGroup && (
                    <VerificationGroupModal
                        group={verificationGroup}
                        onClose={() => setVerificationGroup(null)}
                        onApprove={handleGroupApprove}
                        onReject={handleGroupReject}
                        onApproveMember={handleApproveMember}
                    />
                )
            }
        </div >
    );
}



function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${active ? "bg-gradient-to-r from-orange-500/20 to-transparent text-orange-400 border border-orange-500/20" : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
        >
            <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="text-sm font-bold">{label}</span>
            </div>
            {active && <ChevronRight className="w-4 h-4" />}
        </button>
    );
}

function FormFile({ label, file, onChange }: { label: string, file: File | null, onChange: (f: File | null) => void }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50 ml-1">{label}</label>
            <label className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 transition-all overflow-hidden">
                <Upload className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-sm text-white/70 truncate flex-1">
                    {file ? file.name : "Select Image..."}
                </span>
                <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => onChange(e.target.files?.[0] || null)}
                />
            </label>
        </div>
    );
}

function FormInput({ label, type = "text", placeholder, value, onChange }: { label: string, type?: string, placeholder?: string, value?: string, onChange: (v: string) => void }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50 ml-1">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500/50 transition-all text-sm"
            />
        </div>
    );
}

function FormSelect({ label, options, onChange }: { label: string, options: string[], onChange: (v: string) => void }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50 ml-1">{label}</label>
            <select
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500/50 transition-all text-sm appearance-none"
            >
                <option value="">Select Option</option>
                {options.map((o: string) => <option key={o} value={o} className="bg-neutral-900">{o}</option>)}
            </select>
        </div>
    );
}

function TableLayout({ headers, data, renderRow, renderMobileCard }: any) {
    return (
        <div className="space-y-4">
            {/* Mobile Card View */}
            {renderMobileCard && (
                <div className="flex flex-col gap-4 lg:hidden">
                    {data.map((item: any) => renderMobileCard(item))}
                </div>
            )}

            {/* Desktop Table View */}
            <div className={`bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden ${renderMobileCard ? 'hidden lg:block' : ''}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-white/5">
                            <tr>
                                {headers.map((h: any, i: number) => (
                                    <th key={i} className="p-4 text-[10px] uppercase tracking-widest text-white/70">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.map(renderRow)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        PENDING: "bg-blue-500/10 text-blue-400",
        VERIFYING: "bg-yellow-500/10 text-yellow-500",
        APPROVED: "bg-green-500/10 text-green-400",
        REJECTED: "bg-red-500/10 text-red-400",
        PAID: "bg-green-500/10 text-green-400",
        PENDING_PAY: "bg-yellow-500/10 text-yellow-500"
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || "bg-white/5 text-white/70"}`}>
            {status}
        </span>
    );
}

function SquadRow({ team, members, onRecruit, onKick, onEdit, onViewMember, onDelete, isVirtual }: any) {
    const max = team.max_members || 5;
    const slots = Array.from({ length: max }).map((_, i) => i);
    const filledSlots = members || [];
    const leader = filledSlots.find((m: any) => m.role === 'LEADER') || filledSlots[0];

    return (
        <div className={`p-4 rounded-2xl border ${isVirtual ? 'bg-white/[0.02] border-dashed border-white/10' : 'bg-white/5 border-white/10'} group hover:border-white/20 transition-all`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isVirtual ? 'bg-white/5' : 'bg-gradient-to-br from-orange-500 to-red-600 text-white'}`}>
                        {team.name[0]}
                    </div>
                    <div>
                        {isVirtual ? (
                            <div className="font-bold text-sm text-cyan-400">{team.name}</div>
                        ) : (
                            <EditableField
                                value={team.name}
                                onSave={(val: string) => onEdit('name', val)}
                                className="font-black text-sm uppercase tracking-wide"
                            />
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-white/50 font-mono tracking-widest uppercase">{team.unique_code}</span>
                            <span className="text-[9px] font-mono text-orange-500 bg-orange-500/10 px-2 rounded border border-orange-500/20">{team.team_number || '---'}</span>
                            {!isVirtual && (
                                <button onClick={() => {
                                    if (confirm("Regen code?")) onEdit('unique_code', Math.random().toString(36).substring(2, 8).toUpperCase());
                                }} className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] px-1 border border-white/10 rounded uppercase text-white/70 hover:text-white">Regen</button>
                            )}
                        </div>
                    </div>
                </div>
                {!isVirtual && (
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border transition-all ${team.members?.some((m: any) => m.status === 'UNPAID')
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : team.members?.every((m: any) => m.status === 'APPROVED')
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}>
                            {team.members?.some((m: any) => m.status === 'UNPAID')
                                ? 'SQUAD INCOMPLETE'
                                : team.members?.every((m: any) => m.status === 'APPROVED')
                                    ? 'FULL PAID'
                                    : 'VERIFYING UNITS'}
                        </span>
                        <button onClick={() => onEdit('max_members', (team.max_members || 5) + 1)} className="p-2 text-white/50 hover:text-cyan-400 transition-colors" title="Add Vacant Slot">
                            <PlusCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(team.id)} className="p-2 text-white/10 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className={`grid gap-2 ${max > 5 ? 'grid-cols-6' : 'grid-cols-5'}`}>
                {slots.map((slotIndex) => {
                    const member = filledSlots[slotIndex];
                    return (
                        <SquadSlot
                            key={slotIndex}
                            member={member}
                            isLeader={member && (member.role === 'LEADER' || (!leader && slotIndex === 0))}
                            isEmpty={!member}
                            onClick={() => !member && onRecruit(slotIndex)}
                            onView={() => member && onViewMember(member)}
                            onKick={() => member && onKick(member.id, null)} // Pass null teamId to kick (make solo)
                            isVirtual={isVirtual}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function SquadSlot({ member, isLeader, isEmpty, onClick, onView, onKick, isVirtual }: any) {
    if (isEmpty) {
        return (
            <button
                onClick={onClick}
                className={`h-24 rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-2 group/slot hover:border-white/20 hover:bg-white/5 transition-all ${isVirtual ? 'opacity-50' : ''}`}
            >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover/slot:scale-110 transition-transform">
                    <Plus className="w-4 h-4 text-white/50 group-hover/slot:text-white" />
                </div>
                <span className="text-[9px] uppercase font-black tracking-widest text-white/50 group-hover/slot:text-white transition-colors">Recruit</span>
            </button>
        );
    }

    return (
        <div
            onClick={onView}
            className="h-24 rounded-xl bg-white/5 border border-white/10 p-2 relative group/slot overflow-hidden cursor-pointer hover:bg-white/10 transition-all border-b-2"
            style={{ borderBottomColor: member.status === 'APPROVED' ? '#22c55e' : '#ef4444' }}
        >
            {!isVirtual && (
                <div className="absolute top-1 right-1 opacity-0 group-hover/slot:opacity-100 transition-opacity z-10 flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onKick(); }} className="p-1 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="relative mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-b from-neutral-700 to-neutral-900 flex items-center justify-center font-bold text-xs border border-white/10">
                        {member.name[0]}
                    </div>
                    {isLeader && (
                        <div className="absolute -top-1 -right-1">
                            <ShieldCheck className="w-3 h-3 text-yellow-400 fill-black" />
                        </div>
                    )}
                </div>
                <div className="w-full">
                    <div className="text-[10px] font-bold truncate px-1">{member.name}</div>
                    <div className={`text-[8px] uppercase font-black tracking-widest mt-0.5 ${member.status === 'APPROVED' ? 'text-green-500' : 'text-red-500'}`}>
                        {member.status}
                    </div>
                </div>
            </div>
            {/* Status Indicator Bar */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${member.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500/50'}`} />
        </div>
    );
}

function EditableField({ value, onSave, className }: any) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    if (isEditing) {
        return (
            <input
                autoFocus
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => { onSave(tempValue); setIsEditing(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { onSave(tempValue); setIsEditing(false); } }}
                className="bg-black border border-orange-500 rounded px-2 py-0.5 outline-none w-full min-w-[100px] text-sm"
            />
        );
    }
    return (
        <div onClick={() => setIsEditing(true)} className={`cursor-pointer hover:text-orange-400 transition-colors border-b border-transparent hover:border-orange-500/50 ${className}`}>
            {value}
        </div>
    );
}

function RecruitModal({ onClose, onSelect, users }: any) {
    const [search, setSearch] = useState("");
    const filtered = users.filter((u: any) =>
        !u.team_id &&
        (u.name.toLowerCase().includes(search.toLowerCase()) || u.reg_no.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col relative overflow-hidden">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white z-10"><X className="w-4 h-4" /></button>

                <div className="p-6 border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-black uppercase tracking-tight">Recruit Warrior</h2>
                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1">Select a Solo Warrior to joint this Squad</p>
                    <div className="mt-4 relative">
                        <input
                            autoFocus
                            placeholder="Search name or reg no..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500/50 transition-all font-mono"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filtered.map((u: any) => (
                        <button
                            key={u.id}
                            onClick={() => onSelect(u.id)}
                            className="w-full text-left p-3 hover:bg-white/5 rounded-xl flex items-center justify-between group transition-all border border-transparent hover:border-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-white/50 border border-white/5">{u.name[0]}</div>
                                <div>
                                    <div className="font-bold text-sm">{u.name}</div>
                                    <div className="text-[10px] text-white/30 font-mono">{u.reg_no}</div>
                                </div>
                            </div>
                            <div className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                Recruit <ChevronRight className="w-3 h-3" />
                            </div>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-center py-8 text-white/20 text-xs uppercase font-bold tracking-widest">No available warriors found</div>
                    )}
                </div>
            </div>
        </div>
    );
}
