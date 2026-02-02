"use client";

import { useEffect, useState } from "react";
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
    PlusCircle
} from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/lib/supabase";
import { getAdminSession, adminLogout } from "@/lib/auth";
import Image from "next/image";
import { MemberDetailModal } from "./MemberDetailModal";


type Tab = "USERS" | "VERIFY_QUEUE" | "ADMINS" | "QR" | "EMAILS" | "GROUPS" | "LOGS" | "TEAMS" | "SCAN";

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
        logs: []
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
    const [recruitState, setRecruitState] = useState<{ teamId: string, slotId: number } | null>(null);

    useEffect(() => {
        const session = getAdminSession();
        if (!session || session.role !== "MAIN") {
            window.location.href = "/admin/login";
            return;
        }
        setAdmin(session);
        fetchAllData();

        // Real-time Subscription
        const channel = supabase
            .channel('dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchAllData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchAllData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_codes' }, () => fetchAllData())
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
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { error } = await supabase.from('teams').insert({
            name,
            payment_mode: mode,
            unique_code: code,
            max_members: 4 // Default
        });
        if (error) throw error;
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

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
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

                if (formData.bulk) {
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
                }

                if (!formData.bulk) {
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
                    sender_name: formData.sender_name || 'TechSprint Admin',
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

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [
                { data: users },
                { data: admins },
                { data: qr },
                { data: emails },
                { data: groups },
                { data: logs },
                { data: teams }
            ] = await Promise.all([
                supabase.from("users").select("*").order("created_at", { ascending: false }),
                supabase.from("admins").select("*").order("created_at", { ascending: false }),
                supabase.from("qr_codes").select("*").order("created_at", { ascending: false }),
                supabase.from("email_accounts").select("*").order("created_at", { ascending: false }),
                supabase.from("group_links").select("*").order("created_at", { ascending: false }),
                supabase.from("action_logs").select("*, users(name), admins(username)").order("timestamp", { ascending: false }).limit(50),
                supabase.from("teams").select("*, users(count)")
            ]);

            setData({
                users: (users || []).sort((a: any, b: any) => {
                    const priorityStatus = ["VERIFYING", "PENDING"];
                    const aPriority = priorityStatus.indexOf(a.status);
                    const bPriority = priorityStatus.indexOf(b.status);

                    if (aPriority !== bPriority) {
                        if (aPriority === -1) return 1;
                        if (bPriority === -1) return -1;
                        return aPriority - bPriority;
                    }
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }),
                admins: admins || [],
                qr: qr || [],
                emails: emails || [],
                groups: groups || [],
                logs: logs || [],
                teams: (teams || []).map((t: any) => ({
                    ...t,
                    memberCount: (users || []).filter((u: any) => u.team_id === t.id).length
                }))
            });
        } catch (err: any) {
            console.error("Fetch Data Error:", err);
            alert("Error loading data: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportXLSX = async () => {
        const users = data.users;
        if (!users.length) return alert("No data to export");

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("TechSprint Users");

        worksheet.columns = [
            { header: "ID", key: "id", width: 30 },
            { header: "Name", key: "name", width: 20 },
            { header: "Reg No", key: "reg_no", width: 15 },
            { header: "Email", key: "email", width: 25 },
            { header: "Phone", key: "phone", width: 15 },
            { header: "College", key: "college", width: 10 },
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
        anchor.download = `TechSprint_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`;
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
                        }, { onConflict: 'reg_no' });

                    if (error) console.error("Error upserting row:", error);
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
            setLoading(true);
            const { error } = await supabase.from("users").delete().eq("id", id);
            if (error) throw error;
            fetchAllData();
        } catch (err: any) {
            alert("Delete failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInlineSave = async (id: string, field: string, value: string) => {
        try {
            setLoading(true);

            // Handle rejection by deleting
            if (field === 'status' && value === 'REJECTED') {
                const confirmDelete = window.confirm("Rejecting will PERMANENTLY DELETE this user from the database. Continue?");
                if (!confirmDelete) return;

                const { error: delError } = await supabase.from("users").delete().eq("id", id);
                if (delError) throw delError;

                setData((prev: any) => ({
                    ...prev,
                    users: prev.users.filter((u: any) => u.id !== id)
                }));
                alert("User rejected and deleted from database.");
                return;
            }

            const { error } = await supabase
                .from("users")
                .update({ [field]: value })
                .eq("id", id);

            if (error) throw error;

            setData((prev: any) => ({
                ...prev,
                users: prev.users.map((u: any) => u.id === id ? { ...u, [field]: value } : u)
            }));

            await supabase.from("action_logs").insert([{
                admin_id: admin.id,
                user_id: id,
                action: `EDITED_${field.toUpperCase()}`
            }]);

        } catch (err: any) {
            alert("Failed to save: " + err.message);
        } finally {
            setLoading(false);
            setEditingId(null);
            setEditField(null);
        }
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
            const { data: allUsers } = await supabase
                .from('users')
                .select('*, teams(name, unique_code, payment_mode)');

            const { data: allTeams } = await supabase.from('teams').select('*');

            if (!allUsers || !allTeams) return alert("Failed to fetch export data");

            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Master Roster');

            // Styles
            const headerStyle: Partial<ExcelJS.Style> = {
                font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } },
                alignment: { horizontal: 'center' }
            };

            const addBlock = (title: string, members: any[]) => {
                const startRow = sheet.lastRow ? sheet.lastRow.number + 2 : 1;

                // Title
                const titleRow = sheet.getRow(startRow);
                titleRow.getCell(1).value = title;
                titleRow.getCell(1).font = { bold: true, size: 14 };
                titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
                sheet.mergeCells(startRow, 1, startRow, 10);

                // Headers
                const headerRow = sheet.getRow(startRow + 1);
                headerRow.values = ['Name', 'Reg No', 'Phone', 'Email', 'Role', 'Status', 'In Venue?', 'Payment', 'Amount', 'Transaction ID'];
                headerRow.eachCell((cell) => {
                    cell.style = { ...headerStyle };
                });

                // Data
                members.forEach((m) => {
                    const row = sheet.addRow([
                        m.name,
                        m.reg_no,
                        m.phone,
                        m.email,
                        m.role,
                        m.status,
                        m.is_present ? 'YES' : 'NO',
                        m.payment_mode || 'INDIVIDUAL',
                        m.amount || '0',
                        m.transaction_id || '---'
                    ]);
                    // Auto-color status
                    if (m.status === 'APPROVED') row.getCell(6).font = { color: { argb: 'FF008800' }, bold: true };
                    if (m.status === 'REJECTED') row.getCell(6).font = { color: { argb: 'FFFF0000' }, bold: true };
                    if (m.is_present) row.getCell(7).font = { color: { argb: 'FF0000BB' }, bold: true };
                });

                // Borders (Box Style)
                const endRow = sheet.lastRow!.number;
                for (let r = startRow; r <= endRow; r++) {
                    const row = sheet.getRow(r);
                    for (let c = 1; c <= 10; c++) {
                        const cell = row.getCell(c);
                        cell.border = {
                            top: r === startRow ? { style: 'thick' } : { style: 'thin' },
                            left: c === 1 ? { style: 'thick' } : { style: 'thin' },
                            bottom: r === endRow ? { style: 'thick' } : { style: 'thin' },
                            right: c === 10 ? { style: 'thick' } : { style: 'thin' }
                        };
                    }
                }
            };

            // 1. Teams
            allTeams.forEach((t: any) => {
                const members = allUsers.filter((u: any) => u.team_id === t.id);
                if (members.length > 0) {
                    addBlock(`TEAM: ${t.name.toUpperCase()} (${t.unique_code})`, members);
                }
            });

            // 2. Solo
            const solo = allUsers.filter((u: any) => !u.team_id);
            if (solo.length > 0) {
                addBlock('SOLO WARRIORS (INDIVIDUALS)', solo);
            }

            // Columns
            sheet.columns = [
                { width: 30 }, { width: 20 }, { width: 20 }, { width: 35 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 }, { width: 25 }
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

    const filteredUsers = data.users.filter((u: any) => {
        const matchesSearch =
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;

        return matchesSearch && matchesStatus;
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
                    max_members: 5
                })
                .select()
                .single();

            if (teamError) throw teamError;

            // 2. Move both users to new team
            const { error: moveError } = await supabase
                .from('users')
                .update({ team_id: newTeam.id })
                .in('id', [soloId, recruitId]);

            if (moveError) throw moveError;

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
                    const maxMembers = team.max_members || 5;
                    const incomingCount = userId === 'BULK' ? selectedUsers.length : 1;

                    if (currentCount + incomingCount > maxMembers) {
                        throw new Error(`Capacity Limit Exceeded! Squad can only hold ${maxMembers} warriors.`);
                    }
                }
            }

            // BULK MERGE LOGIC
            if (userId === 'BULK') {
                const { error } = await supabase
                    .from("users")
                    .update({ team_id: teamId || null })
                    .in("id", selectedUsers);

                if (error) throw error;
                alert(`Successfully merged ${selectedUsers.length} warriors!`);
                setSelectedUsers([]);
            } else {
                // SINGLE MOVE LOGIC
                const { error } = await supabase
                    .from("users")
                    .update({ team_id: teamId || null })
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
            // 1. Release members
            const { error: releaseErr } = await supabase.from('users').update({ team_id: null }).eq('team_id', teamId);
            if (releaseErr) throw releaseErr;
            // 2. Delete team
            const { error: delErr } = await supabase.from('teams').delete().eq('id', teamId);
            if (delErr) throw delErr;
            fetchAllData();
        } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    };

    const handleBulkCreateTeam = async () => {
        const name = prompt("Enter New Squad Name:");
        if (!name) return;
        try {
            setLoading(true);
            // 1. Create Team
            const { data: team, error: createErr } = await supabase.from('teams').insert({
                name,
                unique_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                payment_mode: 'BULK',
                max_members: 5
            }).select().single();
            if (createErr) throw createErr;

            // 2. Add members
            const { error: addErr } = await supabase.from('users').update({ team_id: team.id }).in('id', selectedUsers);
            if (addErr) throw addErr;

            setSelectedUsers([]);
            setTeamViewMode('ALL'); // Show new squad
            fetchAllData();
        } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    };

    const handleScan = async (result: any) => {
        if (!result) return;
        const regNo = result[0]?.rawValue || result;
        if (!regNo) return;

        try {
            setLoading(true);
            const { data: user, error } = await supabase
                .from("users")
                .select("*, teams(name)")
                .eq("reg_no", regNo)
                .single();

            if (error || !user) throw new Error("Participant not found in database.");

            if (user.status !== "APPROVED") {
                alert(`🚨 ACCESS DENIED: ${user.name} has status ${user.status}. Payment verification required.`);
                return;
            }

            if (user.is_present) {
                alert(`⚠️ DUPLICATE ENTRY: ${user.name} has already checked in.`);
                return;
            }

            // Success ACK
            const { error: upErr } = await supabase
                .from("users")
                .update({ is_present: true, attended_at: new Date().toISOString() })
                .eq("id", user.id);

            if (upErr) throw upErr;

            alert(`✅ ENTRY APPROVED: Welcome, ${user.name}!`);
            fetchAllData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!admin) return null;

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
                    <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-white/40 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-white/20 mb-2 px-3 tracking-widest">Main Operations</p>
                        <NavItem icon={Users} label="Participants" active={activeTab === "USERS"} onClick={() => { setActiveTab("USERS"); setMobileMenuOpen(false); }} />
                        <NavItem icon={ShieldCheck} label="Verify Queue" active={activeTab === "VERIFY_QUEUE"} onClick={() => { setActiveTab("VERIFY_QUEUE"); setMobileMenuOpen(false); }} />
                        <NavItem icon={QrCode} label="Scan Entry" active={activeTab === "SCAN"} onClick={() => { setActiveTab("SCAN"); setMobileMenuOpen(false); }} />
                        <NavItem icon={Menu} label="All Teams" active={activeTab === "TEAMS"} onClick={() => { setActiveTab("TEAMS"); setMobileMenuOpen(false); }} />
                    </div>
                    <NavItem icon={ShieldCheck} label="Sub Admins" active={activeTab === 'ADMINS'} onClick={() => { setActiveTab('ADMINS'); setMobileMenuOpen(false); }} />
                    <NavItem icon={QrCode} label="QR Codes" active={activeTab === 'QR'} onClick={() => { setActiveTab('QR'); setMobileMenuOpen(false); }} />
                    <NavItem icon={Mail} label="Email Accounts" active={activeTab === 'EMAILS'} onClick={() => { setActiveTab('EMAILS'); setMobileMenuOpen(false); }} />
                    <NavItem icon={LinkIcon} label="WhatsApp Links" active={activeTab === 'GROUPS'} onClick={() => { setActiveTab('GROUPS'); setMobileMenuOpen(false); }} />
                    <NavItem icon={Activity} label="Action Logs" active={activeTab === 'LOGS'} onClick={() => { setActiveTab('LOGS'); setMobileMenuOpen(false); }} />
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => { adminLogout(); window.location.href = "/admin/login"; }}
                        className="w-full flex items-center gap-3 p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-20 border-b border-white/10 px-4 sm:px-8 flex items-center justify-between sticky top-0 bg-black/50 backdrop-blur-xl z-10">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-white/60 hover:text-white">
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-sm sm:text-xl font-bold truncate max-w-[150px] sm:max-w-none">{activeTab.replace('_', ' ')} Management</h2>
                        {activeTab === 'USERS' && (
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search name, reg, utr..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs w-64 outline-none focus:border-orange-500/50 transition-all font-mono"
                                    />
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white font-bold text-lg">×</button>
                                    )}
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-500/50 appearance-none text-white/60"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="VERIFYING">Verifying</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={fetchAllData} title="Refresh" className="text-white/40 hover:text-white transition-colors">
                            <Activity className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        {activeTab === 'USERS' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUniversalExport}
                                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 border border-green-500/20 px-4 py-2 rounded-lg text-xs font-black text-white hover:opacity-90 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                                >
                                    <Download className="w-4 h-4" /> Master Roster (.XLSX)
                                </button>
                                <label className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-xs font-bold hover:bg-white/10 transition-all cursor-pointer uppercase tracking-tighter opacity-50 hover:opacity-100">
                                    <Upload className="w-4 h-4" /> Import
                                    <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                                </label>
                            </div>
                        )}

                        {activeTab !== 'USERS' && activeTab !== 'LOGS' && (
                            <button
                                onClick={() => { setFormData({}); setShowModal(activeTab); }}
                                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                            >
                                <Plus className="w-4 h-4" /> Add New
                            </button>
                        )}
                    </div>
                </header>

                <div className="p-8">

                    {activeTab === 'SCAN' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-black tracking-tighter uppercase">Nexus Entry Protocol</h2>
                                <p className="text-white/40 text-xs font-bold tracking-widest uppercase">Align scanner with participant's Nexus ID</p>
                            </div>

                            <div className="relative aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden border-4 border-white/10 shadow-[0_0_50px_rgba(255,165,0,0.1)]">
                                <Scanner
                                    onScan={handleScan}
                                    allowMultiple={true}
                                    scanDelay={2000}
                                    components={{
                                        finder: true,
                                    }}
                                    styles={{
                                        container: {
                                            width: '100%',
                                            height: '100%',
                                        }
                                    }}
                                />
                                <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40" />
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="w-full h-0.5 bg-orange-500 absolute top-1/2 -translate-y-1/2 animate-scan-line shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center">
                                    <div className="text-2xl font-black text-cyan-400">{data.users.filter((u: any) => u.is_present).length}</div>
                                    <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">Inside Venue</div>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center">
                                    <div className="text-2xl font-black text-white/20">{data.users.filter((u: any) => !u.is_present && u.status === 'APPROVED').length}</div>
                                    <div className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-1">Pending Entry</div>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button onClick={fetchAllData} className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest">
                                    <RotateCcw className="w-4 h-4" /> Reset Sensor Array
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'VERIFY_QUEUE' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black tracking-tight">VERIFICATION COMMAND CENTER</h2>
                                <div className="text-[10px] text-white/40 uppercase font-black">
                                    {data.users.filter((u: any) => ['PENDING', 'VERIFYING'].includes(u.status)).length} Pending Units
                                </div>
                            </div>
                            <TableLayout
                                headers={['Profile', 'UTR / ID', 'Proof', 'Action']}
                                data={data.users.filter((u: any) => ['PENDING', 'VERIFYING'].includes(u.status))}
                                renderRow={(u: any) => (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                        <td className="py-4 px-4">
                                            <div className="font-black text-sm uppercase">{u.name}</div>
                                            <div className="text-[10px] text-orange-500 font-mono">{u.reg_no}</div>
                                        </td>
                                        <td className="py-4 px-4 font-mono text-xs text-white/60">
                                            {u.transaction_id || 'N/A'}
                                        </td>
                                        <td className="py-4 px-4">
                                            {u.screenshot_url ? (
                                                <a href={u.screenshot_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 hover:border-orange-500/50 transition-all overflow-hidden relative group">
                                                    <Image src={u.screenshot_url} alt="Proof" fill className="object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ExternalLink className="w-4 h-4 text-white" />
                                                    </div>
                                                </a>
                                            ) : <span className="text-[10px] text-white/20">NO PROOF</span>}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleInlineSave(u.id, 'status', 'APPROVED')} className="px-4 py-2 bg-green-500/10 text-green-500 text-[10px] font-black rounded-lg border border-green-500/20 hover:bg-green-500 hover:text-black transition-all">APPROVE</button>
                                                <button onClick={() => handleInlineSave(u.id, 'status', 'REJECTED')} className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-black rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-black transition-all">REJECT</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            />
                        </div>
                    )}

                    {activeTab === 'USERS' && (
                        <>
                            {selectedUsers.length > 0 && (
                                <div className="bg-orange-500/10 border border-orange-500/20 p-4 mb-4 rounded-xl flex items-center justify-between sticky top-24 z-20 backdrop-blur-md">
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-orange-400 text-sm">{selectedUsers.length} Warriors Selected</span>
                                        <button onClick={() => setSelectedUsers([])} className="text-[10px] text-white/40 hover:text-white uppercase font-bold">Clear Selection</button>
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
                                    'Profile', 'Contact (Edit)', 'College', 'Branch', 'Status', 'Payment Proof', 'UTR (Edit)', 'Joined At', 'Actions'
                                ]}
                                data={filteredUsers}
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
                                            <div className="font-bold">{u.name}</div>
                                            <div className="text-[10px] text-white/40 uppercase font-mono">{u.reg_no}</div>
                                            {u.is_present && <span className="mt-1 inline-flex items-center gap-1 text-[8px] font-black bg-cyan-500 text-black px-1 rounded uppercase">In Venue</span>}
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
                                                <div onDoubleClick={() => { setEditingId(u.id); setEditField('phone'); setEditValue(u.phone); }} className="text-white/40 cursor-pointer hover:text-orange-400 mt-1">
                                                    {u.phone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-[10px] text-white/60">
                                            <span className={`px-2 py-0.5 rounded-full ${u.college?.includes('RGM') ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                {u.college || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-[10px] text-white/60">
                                            {editingId === u.id && editField === 'branch' ? (
                                                <select
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={(e) => handleInlineSave(u.id, 'branch', e.target.value)}
                                                    onBlur={() => setEditingId(null)}
                                                    className="bg-black/50 border border-orange-500/50 rounded px-1 py-1 w-full outline-none text-[10px]"
                                                >
                                                    <option value="">Select</option>
                                                    {["CSE", "CSE-AIML", "CSE-DS", "CSE-BS", "EEE", "ECE", "MECH", "CIVIL", "OTHERS"].map(b => (
                                                        <option key={b} value={b}>{b}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span onDoubleClick={() => { setEditingId(u.id); setEditField('branch'); setEditValue(u.branch || ""); }} className="cursor-pointer hover:text-orange-400 bg-white/5 px-2 py-0.5 rounded">
                                                    {u.branch || 'N/A'}
                                                </span>
                                            )}
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
                                                <span className="text-[10px] text-white/20">No Image</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 font-mono text-[10px] text-white/40">
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
                                        <td className="py-4 px-4 text-[10px] text-white/20 whitespace-nowrap">{new Date(u.created_at).toLocaleString()}</td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setMovingUser(u)} className="p-2 text-white/20 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-all" title="Move to Squad">
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

                    {activeTab === 'ADMINS' && <TableLayout
                        headers={['Username', 'Role', 'Status', 'Actions']}
                        data={data.admins}
                        renderRow={(a: any) => (
                            <tr key={a.id} className="border-b border-white/5">
                                <td className="py-4 px-4">{a.username}</td>
                                <td className="py-4 px-4 text-xs uppercase font-bold text-orange-400">{a.role}</td>
                                <td className="py-4 px-4">
                                    <button onClick={() => toggleStatus('admins', a.id, a.active)}>
                                        {a.active ? <ToggleRight className="text-green-500" /> : <ToggleLeft className="text-white/20" />}
                                    </button>
                                </td>
                                <td className="py-4 px-4">
                                    <button onClick={() => deleteItem('admins', a.id)} className="text-red-500/40 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        )}
                    />}

                    {activeTab === 'QR' && <TableLayout
                        headers={['Set Name', 'UPI ID', 'Amount', 'Usage/Limit', 'Status', 'Actions']}
                        data={data.qr}
                        renderRow={(q: any) => (
                            <tr key={q.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                <td className="py-4 px-4">
                                    <div className="font-bold text-sm tracking-tight">{q.upi_name || 'N/A'}</div>
                                    <div className="text-[9px] text-white/30 uppercase font-mono tracking-tighter truncate max-w-[150px]">{q.id}</div>
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
                                        {q.active ? <ToggleRight className="text-green-500 w-6 h-6" /> : <ToggleLeft className="text-white/20 w-6 h-6" />}
                                    </button>
                                </td>
                                <td className="py-4 px-4">
                                    <button onClick={() => deleteItem('qr_codes', q.id)} className="p-2 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        )}
                    />}

                    {activeTab === 'TEAMS' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-black tracking-tight text-white">SQUAD COMMAND CENTER</h2>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Manage Legions & Recruit Warriors</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setTeamViewMode(prev => prev === 'ALL' ? 'SOLO' : 'ALL')}
                                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${teamViewMode === 'SOLO' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                                    >
                                        {teamViewMode === 'SOLO' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                        {teamViewMode === 'ALL' ? 'Filter: Solo Only' : 'Show All'}
                                    </button>
                                    <button onClick={handleUniversalExport} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-lg hover:opacity-90 transition-all text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                        <Download className="w-3 h-3" /> Download Unified Roster
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {teamViewMode === 'ALL' ? (
                                    data.teams.map((team: any) => (
                                        <SquadRow
                                            key={team.id}
                                            team={team}
                                            members={data.users.filter((u: any) => u.team_id === team.id)}
                                            onRecruit={(slotId: number) => setRecruitState({ teamId: team.id, slotId })}
                                            onKick={handleMoveMember}
                                            onEdit={(field: string, val: any) => handleEditTeam(team.id, field, val)}
                                            onViewMember={(m: any) => setViewMember(m)}
                                            onDelete={handleDeleteTeam}
                                        />
                                    ))
                                ) : (
                                    data.users.filter((u: any) => !u.team_id).map((solo: any) => (
                                        <SquadRow
                                            key={solo.id}
                                            team={{
                                                id: `SOLO-${solo.id}`,
                                                name: `${solo.name}'s Party`,
                                                unique_code: 'SOLO',
                                                isVirtual: true,
                                                payment_mode: 'INDIVIDUAL'
                                            }}
                                            members={[solo]}
                                            onRecruit={(slotId: number) => setRecruitState({ teamId: `SOLO_CONVERT:${solo.id}`, slotId })}
                                            onKick={() => { }}
                                            onViewMember={(m: any) => setViewMember(m)}
                                            isVirtual
                                        />
                                    ))
                                )}
                            </div>

                            {teamViewMode === 'ALL' && data.teams.length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                    <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                    <p className="text-white/20 uppercase font-black tracking-widest text-sm">No Active Squads Deployed</p>
                                </div>
                            )}

                            {teamViewMode === 'SOLO' && data.users.filter((u: any) => !u.team_id).length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                    <ShieldCheck className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                    <p className="text-white/20 uppercase font-black tracking-widest text-sm">All Warriors Have Joined Legions</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'EMAILS' && <TableLayout
                        headers={['Account Info', 'Configuration', 'Status', 'Actions']}
                        data={data.emails}
                        renderRow={(e: any) => (
                            <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                <td className="py-4 px-4">
                                    <div className="font-black text-sm text-white">{e.email_address}</div>
                                    <div className="text-[10px] text-white/40 uppercase font-black">{e.sender_name || 'No Sender Name'}</div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="text-xs font-mono text-cyan-400">{e.smtp_host}:{e.smtp_port}</div>
                                    <div className="text-[10px] text-white/20 uppercase font-bold">{e.smtp_port === 465 ? 'SSL/TLS' : 'STARTTLS'}</div>
                                </td>
                                <td className="py-4 px-4">
                                    <button onClick={() => toggleStatus('email_accounts', e.id, e.active)} className="transition-transform active:scale-90">
                                        {e.active ? <ToggleRight className="text-green-500 w-6 h-6" /> : <ToggleLeft className="text-white/20 w-6 h-6" />}
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
                        renderRow={(g: any) => (
                            <tr key={g.id} className="border-b border-white/5">
                                <td className="py-4 px-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.college === 'RGM' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                        {g.college}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-xs font-mono text-white/40">{g.whatsapp_link}</td>
                                <td className="py-4 px-4">
                                    <button onClick={() => toggleStatus('group_links', g.id, g.active)}>
                                        {g.active ? <ToggleRight className="text-green-500" /> : <ToggleLeft className="text-white/20" />}
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
                                        <p className="text-[10px] text-white/20">{new Date(log.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>}
                </div>
            </main>
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white/10 border border-white/20 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                    >
                        <h3 className="text-xl font-bold mb-6">Add {showModal}</h3>
                        <form onSubmit={handleAdd} className="space-y-4">
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
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.bulk !== false ? 'bg-orange-500 text-black' : 'text-white/40 hover:text-white'}`}
                                        >
                                            Bulk Set (5 QR)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, bulk: false })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.bulk === false ? 'bg-orange-500 text-black' : 'text-white/40 hover:text-white'}`}
                                        >
                                            Single QR
                                        </button>
                                    </div>

                                    <FormInput label="Set Name / UPI Name" placeholder="Set A / TechSprint Main" value={formData.upi_name} onChange={v => setFormData({ ...formData, upi_name: v })} />
                                    <FormInput label="UPI ID" placeholder="event@upi" value={formData.upi_id} onChange={v => setFormData({ ...formData, upi_id: v })} />

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
                                            <FormInput label="Daily Limit (Each)" type="number" placeholder="100" value={formData.daily_limit?.toString()} onChange={v => setFormData({ ...formData, daily_limit: parseInt(v) })} />
                                        </div>
                                    ) : (
                                        <div className="space-y-4 mt-4">
                                            <FormFile label="QR Image File" file={formData.qr_file} onChange={file => setFormData({ ...formData, qr_file: file })} />
                                            <FormInput label="Amount (₹)" type="number" placeholder="800" value={formData.amount?.toString()} onChange={v => setFormData({ ...formData, amount: parseInt(v) })} />
                                            <FormInput label="Daily Limit" type="number" placeholder="100" value={formData.daily_limit?.toString()} onChange={v => setFormData({ ...formData, daily_limit: parseInt(v) })} />
                                        </div>
                                    )}
                                </>
                            )}
                            {showModal === 'EMAILS' && (
                                <>
                                    <FormInput label="Email Address" onChange={v => setFormData({ ...formData, email_address: v })} />
                                    <FormInput label="App Password" type="password" onChange={v => setFormData({ ...formData, app_password: v })} />
                                    <FormInput label="Sender Name" placeholder="TechSprint Admin" onChange={v => setFormData({ ...formData, sender_name: v })} />
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
                                    {data.users.filter((u: any) => u.team_id === editingId).map((u: any) => (
                                        <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center font-black text-xs text-cyan-400 border border-cyan-500/20">{u.name[0]}</div>
                                                <div>
                                                    <div className="font-black text-sm uppercase">{u.name}</div>
                                                    <div className="text-[10px] text-white/40 tracking-wider">{u.reg_no} • {u.role}</div>
                                                </div>
                                            </div>
                                            <StatusBadge status={u.status} />
                                        </div>
                                    ))}
                                    {data.users.filter((u: any) => u.team_id === editingId).length === 0 && (
                                        <div className="text-center py-12 text-white/20 uppercase font-black tracking-widest text-[10px]">No deployed members found</div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => setShowModal(null)} className="flex-1 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-all">Cancel</button>
                                <button type="submit" disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Add'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {movingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-neutral-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-black mb-2 uppercase italic tracking-tighter">Reassign Warrior</h3>
                        <p className="text-white/40 text-[10px] uppercase font-bold mb-6 tracking-widest">Moving {movingUser.name} to new squad</p>

                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                            <button onClick={() => handleMoveMember(movingUser.id, "")} className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:border-red-500/50 transition-all group">
                                <div className="font-bold text-sm group-hover:text-red-500">REMOVE FROM ALL TEAMS</div>
                                <div className="text-[10px] text-white/20 uppercase">Convert to Independent Unit</div>
                            </button>
                            {data.teams.map((t: any) => (
                                <button key={t.id} onClick={() => handleMoveMember(movingUser.id, t.id)} className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-xl hover:border-orange-500/50 transition-all">
                                    <div className="font-bold text-sm uppercase">{t.name}</div>
                                    <div className="text-[10px] text-white/20 uppercase font-mono">{t.unique_code} • {t.memberCount}/{t.max_members} Units</div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setMovingUser(null)} className="w-full mt-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-widest">Abort Relocation</button>
                    </motion.div>
                </div>
            )}

            {recruitState && (
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
            )}

            {viewMember && (
                <MemberDetailModal
                    user={viewMember}
                    onClose={() => setViewMember(null)}
                />
            )}
        </div>
    );
}



function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${active ? "bg-gradient-to-r from-orange-500/20 to-transparent text-orange-400 border border-orange-500/20" : "text-white/40 hover:text-white hover:bg-white/5"
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
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1">{label}</label>
            <label className="flex items-center gap-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 transition-all overflow-hidden">
                <Upload className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-sm text-white/40 truncate flex-1">
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
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1">{label}</label>
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
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1">{label}</label>
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

function TableLayout({ headers, data, renderRow }: any) {
    return (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-white/5">
                        <tr>
                            {headers.map((h: any, i: number) => (
                                <th key={i} className="p-4 text-[10px] uppercase tracking-widest text-white/40">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map(renderRow)}
                    </tbody>
                </table>
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
        BULK: "bg-purple-500/10 text-purple-400",
        INDIVIDUAL: "bg-cyan-500/10 text-cyan-400"
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || "bg-white/5 text-white/40"}`}>
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
                            <span className="text-[9px] text-white/30 font-mono tracking-widest uppercase">{team.unique_code}</span>
                            {!isVirtual && (
                                <button onClick={() => {
                                    if (confirm("Regen code?")) onEdit('unique_code', Math.random().toString(36).substring(2, 8).toUpperCase());
                                }} className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] px-1 border border-white/10 rounded uppercase text-white/40 hover:text-white">Regen</button>
                            )}
                        </div>
                    </div>
                </div>
                {!isVirtual && (
                    <div className="flex items-center gap-2">
                        <select
                            value={team.payment_mode}
                            onChange={(e) => onEdit('payment_mode', e.target.value)}
                            className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-black/40 border border-white/10 outline-none transition-all cursor-pointer ${team.payment_mode === 'BULK' ? 'text-purple-400 border-purple-500/20' : 'text-blue-400 border-blue-500/20'}`}
                        >
                            <option value="INDIVIDUAL">INDV</option>
                            <option value="BULK">BULK</option>
                        </select>
                        <button onClick={() => onEdit('max_members', (team.max_members || 5) + 1)} className="p-2 text-white/20 hover:text-cyan-400 transition-colors" title="Add Vacant Slot">
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
                    <Plus className="w-4 h-4 text-white/20 group-hover/slot:text-white" />
                </div>
                <span className="text-[9px] uppercase font-black tracking-widest text-white/20 group-hover/slot:text-white transition-colors">Recruit</span>
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
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white z-10"><X className="w-4 h-4" /></button>

                <div className="p-6 border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-black uppercase tracking-tight">Recruit Warrior</h2>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Select a Solo Warrior to joint this Squad</p>
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
