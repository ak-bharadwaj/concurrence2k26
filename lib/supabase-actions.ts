"use server";

import { supabase } from "./supabase";
import { sendEmail, EMAIL_TEMPLATES } from "./email";

export async function getNextAvailableQR(amount: number = 800) {
    try {
        const { data: qr, error } = await supabase
            .from("qr_codes")
            .select("*")
            .eq("amount", amount)
            .eq("active", true)
            .order("today_usage", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) return { error: error.message };
        if (!qr) return { data: null };

        const { error: updateError } = await supabase
            .from("qr_codes")
            .update({ today_usage: qr.today_usage + 1 })
            .eq("id", qr.id);

        if (updateError) {
            console.error("QR Update Error:", updateError);
        }

        return { data: qr };
    } catch (err: any) {
        console.error("Error fetching QR:", err);
        return { error: err.message || "Failed to fetch QR" };
    }
}

export async function resetQRUsage() {
    try {
        const { error } = await supabase
            .from("qr_codes")
            .update({ today_usage: 0 });
        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function createTeam(name: string, leaderId: string | null, paymentMode: "INDIVIDUAL" | "BULK" = "INDIVIDUAL", maxMembers: number = 5) {
    // Generate unique 6-digit code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: team, error } = await supabase
        .from("teams")
        .insert([{
            name: name.trim(),
            unique_code: code,
            leader_id: leaderId,
            payment_mode: paymentMode,
            max_members: maxMembers,
            status: "PENDING"
        }])
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data: retryTeam, error: retryErr } = await supabase
                .from("teams")
                .insert([{
                    name: name.trim(),
                    unique_code: newCode,
                    leader_id: leaderId,
                    payment_mode: paymentMode,
                    max_members: maxMembers,
                    status: "PENDING"
                }])
                .select()
                .single();
            if (retryErr) return { error: retryErr.message };
            return { data: retryTeam };
        }
        return { error: error.message };
    }

    return { data: team };
}

export async function joinTeam(code: string) {
    try {
        const { data: team, error } = await supabase
            .from("teams")
            .select("*, leader:users!fk_team_leader(*)")
            .eq("unique_code", code.trim().toUpperCase())
            .maybeSingle();

        if (error) return { error: error.message };
        if (!team) return { error: "Squad not found. Please check the code." };

        return { data: team };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function getTeamDetails(teamId: string) {
    try {
        const { data, error } = await supabase
            .from("teams")
            .select(`
                *,
                members:users(*)
            `)
            .eq("id", teamId)
            .single();

        if (error) return { error: error.message };
        return { data };
    } catch (err: any) {
        return { error: err.message || "Failed to fetch team details" };
    }
}

export async function createTicket(userId: string | null, issueType: string, description: string) {
    try {
        const { error } = await supabase
            .from("support_tickets")
            .insert([{ user_id: userId, issue_type: issueType, description, status: "OPEN" }]);
        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

// 1. Register User (UNPAID/Partial)
export async function registerUser(userData: {
    name: string;
    reg_no: string;
    email: string;
    phone: string;
    college: string;
    branch: string;
    year: string;
    team_id?: string;
    today_date?: string;
    tshirt_size?: string;
    role?: string;
    status?: "UNPAID" | "PENDING" | "APPROVED" | "REJECTED" | "VERIFYING";
    transaction_id?: string;
    screenshot_url?: string;
    assigned_qr_id?: string;
}) {
    try {
        // 1. Check for existing record by Email (our new unique anchor)
        const { data: existingUser } = await supabase
            .from("users")
            .select("id, status, phone")
            .eq("email", userData.email)
            .maybeSingle();

        if (existingUser && ["APPROVED", "PENDING", "VERIFYING"].includes(existingUser.status)) {
            return { error: "This registration (Email) is already locked (Approved/Pending). Please contact support for changes." };
        }

        // 1b. Check if phone number is used by ANOTHER user
        const { data: phoneConflict } = await supabase
            .from("users")
            .select("email")
            .eq("phone", userData.phone)
            .neq("email", userData.email) // Allow update for same email
            .maybeSingle();

        if (phoneConflict) {
            return { error: `The mobile number ${userData.phone} is already linked to another registration. Please use a unique mobile number.` };
        }

        // 2. Verify team_id if provided
        if (userData.team_id) {
            const { data: team, error: teamErr } = await supabase.from("teams").select("id").eq("id", userData.team_id).maybeSingle();
            if (teamErr || !team) return { error: "The specified squad does not exist." };
        }

        // 3. Sanitize input to prevent 'column does not exist' errors
        const sanitizedData = {
            name: userData.name,
            reg_no: userData.reg_no,
            email: userData.email,
            phone: userData.phone,
            college: userData.college,
            branch: userData.branch,
            year: userData.year,
            team_id: userData.team_id,
            role: userData.role || 'MEMBER',
            tshirt_size: userData.tshirt_size,
            status: userData.status || "UNPAID",
            transaction_id: userData.transaction_id || null,
            screenshot_url: userData.screenshot_url || null,
            assigned_qr_id: userData.assigned_qr_id || null
        };

        const { data, error } = await supabase
            .from("users")
            .upsert(sanitizedData, { onConflict: 'email' })
            .select()
            .single();

        if (error) {
            console.error("SUPABASE ERROR in registerUser:", error);
            if (error.code === '42703') {
                return { error: "Database Sync Required: Please run the 'add_tshirt_column.sql' script in your Supabase SQL Editor to enable t-shirt size selection." };
            }
            return { error: error.message || "Registration failed. Please try again." };
        }

        // Send Welcome Email (Non-blocking)
        sendEmail(userData.email, "Registration Received - Hackathon 2K26", EMAIL_TEMPLATES.WELCOME(userData.name));

        // If Leader, update team leader_id
        if (userData.team_id && userData.role === 'LEADER') {
            await supabase.from("teams").update({ leader_id: data.id }).eq("id", userData.team_id);
        }

        return { data };
    } catch (err: any) {
        console.error("UNEXPECTED ERROR in registerUser:", err);
        return { error: err.message || "An unexpected error occurred during identity synchronization." };
    }
}

export async function purgeUnpaidUsers() {
    try {
        const { error } = await supabase
            .from("users")
            .delete()
            .eq("status", "UNPAID");
        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function checkUserAvailability(email: string, phone: string) {
    const { data, error } = await supabase
        .from("users")
        .select("id, status")
        .or(`email.eq.${email.trim().toLowerCase()},phone.eq.${phone.trim()}`);

    if (error) return { error };

    const lockedStatuses = ["PENDING", "APPROVED", "VERIFYING"];
    const conflict = data?.find(u => lockedStatuses.includes(u.status));

    if (conflict) {
        return { error: "User already registered or payment pending." };
    }

    return { data: true };
}

// 2. Submit Payment Details
export async function submitPayment(userId: string, paymentData: {
    transaction_id: string;
    screenshot_url: string;
    assigned_qr_id?: string;
}) {
    try {
        const { data: user, error: userErr } = await supabase
            .from("users")
            .update({
                transaction_id: paymentData.transaction_id,
                screenshot_url: paymentData.screenshot_url,
                assigned_qr_id: paymentData.assigned_qr_id,
                status: "PENDING"
            })
            .eq("id", userId)
            .select("*, teams(*)")
            .single();

        if (userErr) return { error: userErr.message };

        // If this user is a MEMBER of a team, and the team is INDIVIDUAL payment, 
        // we might want to check if they are the last one to pay (not required for now)

        // If this user is part of a squad, auto-reject their other pending join requests
        await supabase.from("join_requests").update({ status: 'COMPLETED' }).eq("user_id", userId).neq("status", "COMPLETED");

        // Send Email (Non-blocking)
        sendEmail(user.email, "Payment Received - Hackathon 2K26", EMAIL_TEMPLATES.PAYMENT_RECEIVED(user.name));

        return { data: true };
    } catch (err: any) {
        console.error("UNEXPECTED ERROR in submitPayment:", err);
        return { error: err.message || "An unexpected error occurred during payment submission." };
    }
}

export async function updateStatus(
    userId: string,
    adminId: string,
    newStatus: "UNPAID" | "PENDING" | "APPROVED" | "REJECTED" | "VERIFYING",
    action: string,
    whatsappLink?: string
) {
    const updateData: any = { status: newStatus };

    if (newStatus === "APPROVED" || newStatus === "REJECTED") {
        updateData.verified_by = adminId;
    }

    try {
        const { data: user, error } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", userId)
            .neq("status", newStatus)
            .select("*, teams!team_id(*)")
            .single();

        if (error) return { error: error.message };
        if (!user) return { error: "User not found" };

        if (newStatus === "APPROVED" && user.role === "LEADER" && user.teams?.payment_mode === "BULK" && user.team_id) {
            await supabase
                .from("users")
                .update({ status: "APPROVED", verified_by: adminId })
                .eq("team_id", user.team_id)
                .neq("status", "APPROVED")
                .neq("status", "REJECTED");
        }

        const { error: logError } = await supabase.from("action_logs").insert([
            {
                user_id: userId,
                admin_id: adminId,
                action: action,
            },
        ]);

        if (logError) console.error("Error logging action:", logError);

        if (newStatus === "APPROVED") {
            const qrUrl = (uid: string) => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${uid}`;
            sendEmail(
                user.email,
                "Registration Approved! 🎉 - Hackathon 2K26",
                EMAIL_TEMPLATES.PAYMENT_VERIFIED(user.name, qrUrl(user.id), user.reg_no, whatsappLink)
            );

            if (user.role === "LEADER" && user.teams?.payment_mode === "BULK" && user.team_id) {
                const { data: members } = await supabase
                    .from("users")
                    .select("*")
                    .eq("team_id", user.team_id)
                    .neq("id", userId)
                    .eq("status", "APPROVED");

                if (members) {
                    members.forEach(m => {
                        sendEmail(
                            m.email,
                            "Registration Approved! 🎉 - Hackathon 2K26",
                            EMAIL_TEMPLATES.PAYMENT_VERIFIED(m.name, qrUrl(m.id), m.reg_no, whatsappLink)
                        );
                    });
                }
            }
        } else if (newStatus === "REJECTED") {
            sendEmail(
                user.email,
                "Action Required: Payment Issue \u26A0\uFE0F",
                EMAIL_TEMPLATES.PAYMENT_REJECTED(user.name)
            );
        }

        return { data: user };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function approveTeamPayment(
    teamId: string,
    adminId: string,
    paymentDetails: { transaction_id: string | null; screenshot_url: string | null }
) {
    try {
        const { data: team, error: teamErr } = await supabase
            .from("teams")
            .update({ status: "APPROVED" })
            .eq("id", teamId)
            .select()
            .single();

        if (teamErr) return { error: teamErr.message };

        const { error: membersErr } = await supabase
            .from("users")
            .update({ status: "APPROVED", verified_by: adminId })
            .eq("team_id", teamId);

        if (membersErr) return { error: membersErr.message };

        return { data: team };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function getActiveGroupLink(college: string) {
    try {
        const { data, error } = await supabase
            .from("whatsapp_links")
            .select("link")
            .eq("college", college)
            .eq("is_active", true)
            .maybeSingle();

        if (error) return { error: error.message };
        return { data: data?.link || null };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function getActiveEmailAccounts() {
    try {
        const { data, error } = await supabase
            .from("email_accounts")
            .select("*")
            .eq("is_active", true);

        if (error) return { error: error.message };
        return { data };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function deleteUser(userId: string) {
    try {
        const { error } = await supabase
            .from("users")
            .delete()
            .eq("id", userId);
        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message || "Delete failed" };
    }
}

// --- Squad & Unstop Flow Helpers ---

export async function requestJoinTeam(teamId: string, userId: string | null, candidateData?: any) {
    try {
        const insertData: any = { team_id: teamId, status: 'PENDING' };
        if (userId) insertData.user_id = userId;
        if (candidateData) insertData.candidate_data = candidateData;

        const { data, error } = await supabase
            .from("join_requests")
            .upsert(insertData, { onConflict: 'team_id,user_id' })
            .select()
            .single();

        if (error) return { error: `DB Error: ${error.message} (Payload: ${JSON.stringify(insertData)})` };
        return { data };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function getJoinRequests(teamId: string, status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' = 'PENDING') {
    try {
        const { data, error } = await supabase
            .from("join_requests")
            .select(`
                *,
                users:user_id (
                    name,
                    reg_no,
                    college,
                    email,
                    phone
                )
            `)
            .eq("team_id", teamId)
            .eq("status", status);

        if (error) {
            console.error("Error fetching join requests:", error);
            return { error: error.message };
        }

        const formattedData = (data || []).map(req => {
            const userData = req.user_id ? (Array.isArray(req.users) ? req.users[0] : req.users) : req.candidate_data;
            return {
                ...req,
                users: userData,
                user: userData
            };
        });

        return { data: formattedData };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function getUserJoinRequest(userId: string) {
    try {
        const { data, error } = await supabase
            .from("join_requests")
            .select("*, teams!team_id(name)")
            .eq("user_id", userId)
            .eq("status", 'PENDING')
            .maybeSingle();

        if (error) return { error: error.message };
        return { data };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function respondToJoinRequest(requestId: string, status: 'ACCEPTED' | 'REJECTED') {
    try {
        const { data: request, error: reqErr } = await supabase
            .from("join_requests")
            .select("*, users!user_id(name, email)")
            .eq("id", requestId)
            .single();

        if (reqErr) return { error: reqErr.message };

        if (status === 'ACCEPTED') {
            const { data: team } = await supabase.from("teams").select("max_members, leader_id, users!leader_id(status)").eq("id", request.team_id).single();
            const { count } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", request.team_id);

            const currentMax = team?.max_members || 5;
            if (count !== null && count >= currentMax) {
                return { error: `Cannot accept: Squad is already at maximum capacity (${currentMax}).` };
            }

            if (request.user_id) {
                const { error: userErr } = await supabase
                    .from("users")
                    .update({
                        team_id: request.team_id,
                        role: "MEMBER"
                    })
                    .eq("id", request.user_id);

                if (userErr) return { error: userErr.message };
            }

            if (count !== null && count + 1 >= currentMax) {
                await supabase
                    .from("join_requests")
                    .update({ status: 'REJECTED' })
                    .eq("team_id", request.team_id)
                    .eq("status", 'PENDING')
                    .neq("id", requestId);
            }
        }

        const { error: updateErr } = await supabase
            .from("join_requests")
            .update({ status: status })
            .eq("id", requestId);

        if (updateErr) return { error: updateErr.message };

        const targetEmail = request.users?.email || request.candidate_data?.email;
        const targetName = request.users?.name || request.candidate_data?.name || "Warrior";

        if (targetEmail) {
            if (status === 'ACCEPTED') {
                await sendEmail(
                    targetEmail,
                    "Welcome to the Squad! \uD83D\uDE80",
                    EMAIL_TEMPLATES.CUSTOM(
                        targetName,
                        "Congratulations! You have joined the squad.",
                        "Great news! The team leader has accepted your request. You are now officially part of the squad. Please login to your dashboard to sync with your team and complete your payment to finalize your registration."
                    )
                );
            } else if (status === 'REJECTED') {
                await sendEmail(
                    targetEmail,
                    "Update on your Squad Request",
                    EMAIL_TEMPLATES.CUSTOM(
                        targetName,
                        "Squad Request Declined",
                        "Unfortunately, your request to join the squad was declined by the captain. Don't worry, you can still join other teams or participate independently."
                    )
                );
            }
        }

        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function registerBulkMembers(
    leaderId: string,
    teamId: string,
    members: any[],
    initialStatus: "UNPAID" | "PENDING" = "UNPAID"
) {
    try {
        const membersToInsert = members.map(m => ({
            name: m.name,
            reg_no: m.reg_no.trim().toUpperCase(),
            email: m.email.trim().toLowerCase(),
            phone: m.phone,
            college: m.college === "RGM" ? "RGM College" : (m.otherCollege || m.college),
            branch: m.branch || "N/A",
            year: m.year || "I",
            tshirt_size: m.tshirt_size || "M",
            team_id: teamId,
            role: "MEMBER",
            status: initialStatus
        }));

        const { error } = await supabase.from("users").upsert(membersToInsert, { onConflict: 'email' });
        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

// --- Team Management Functions ---

export async function removeMemberFromTeam(userId: string, teamId: string) {
    try {
        const { error } = await supabase
            .from("users")
            .update({ team_id: null, role: "MEMBER" })
            .eq("id", userId)
            .eq("team_id", teamId);

        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function leaveTeam(userId: string) {
    try {
        const { data: user } = await supabase.from("users").select("role, team_id").eq("id", userId).single();
        if (user?.role === 'LEADER') {
            return { error: "Leaders cannot leave. You must delete the squad to disband." };
        }

        const { error } = await supabase
            .from("users")
            .update({ team_id: null, role: "MEMBER" })
            .eq("id", userId);

        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function updateTeamSettings(teamId: string, settings: { name?: string; max_members?: number }) {
    try {
        const { error } = await supabase
            .from("teams")
            .update(settings)
            .eq("id", teamId);

        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function deleteTeam(teamId: string) {
    try {
        const { data: team } = await supabase.from("teams").select("payment_mode").eq("id", teamId).single();

        const updateData: any = { team_id: null, role: "MEMBER" };
        if (team?.payment_mode === 'BULK') {
            updateData.status = "UNPAID";
        }

        const { error: memberErr } = await supabase
            .from("users")
            .update(updateData)
            .eq("team_id", teamId);

        if (memberErr) return { error: memberErr.message };

        await supabase.from("join_requests").delete().eq("team_id", teamId);

        const { error } = await supabase
            .from("teams")
            .delete()
            .eq("id", teamId);

        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function addMemberToTeam(memberData: any, teamId: string) {
    try {
        const { reg_no, name, email, phone, college, branch, year, tshirt_size, otherCollege } = memberData;

        const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .eq("email", email.trim().toLowerCase())
            .maybeSingle();

        if (existingUser && existingUser.team_id) {
            return { error: "This participant is already registered in another squad." };
        }

        const { data: team } = await supabase.from("teams").select("*, users!leader_id(status)").eq("id", teamId).single();
        const { count } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", teamId);

        if (count !== null && count >= (team?.max_members || 5)) {
            return { error: "Oops, looks like you're late! This squad is full now." };
        }

        if (existingUser) {
            const targetStatus = team?.payment_mode === "BULK" ? (team?.users?.status || "PENDING") : "UNPAID";

            const { error: uErr } = await supabase
                .from("users")
                .update({
                    team_id: teamId,
                    role: "MEMBER",
                    status: targetStatus
                })
                .eq("id", existingUser.id);
            if (uErr) return { error: uErr.message };

            await supabase.from("join_requests").update({ status: 'COMPLETED' }).eq("user_id", existingUser.id).neq("team_id", teamId);

            return { data: existingUser };
        } else {
            const finalCollege = (college === 'OTHERS' && otherCollege) ? otherCollege : (college || team?.users?.college);
            const targetStatus = team?.payment_mode === "BULK" ? (team?.users?.status || "PENDING") : "UNPAID";

            const { data: newUser, error: iErr } = await supabase
                .from("users")
                .insert([{
                    reg_no: reg_no.trim().toUpperCase(),
                    name,
                    email: email.trim().toLowerCase(),
                    phone,
                    college: finalCollege,
                    branch: branch || "N/A",
                    tshirt_size: tshirt_size || "M",
                    year: year || "I",
                    team_id: teamId,
                    role: "MEMBER",
                    status: targetStatus
                }])
                .select()
                .single();

            if (iErr) return { error: iErr.message };
            return { data: newUser };
        }
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function updateMemberDetails(userId: string, updates: any) {
    try {
        const { error } = await supabase
            .from("users")
            .update(updates)
            .eq("id", userId);

        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function markAttendance(userId: string, teamId: string, date: string, time: string) {
    try {
        const { data, error } = await supabase
            .from("attendance")
            .upsert([{
                user_id: userId,
                team_id: teamId,
                attendance_date: date,
                attendance_time: time,
                status: 'PRESENT'
            }], { onConflict: 'user_id, attendance_date' })
            .select()
            .single();

        if (error) return { error: error.message };
        return { data };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function fetchAttendanceReport(date: string) {
    try {
        const { data: users, error: uErr } = await supabase
            .from("users")
            .select("id, name, reg_no, status, team_id, teams!team_id(name, team_number)");

        if (uErr) return { error: uErr.message };

        const { data: attendance, error: aErr } = await supabase
            .from("attendance")
            .select("*")
            .eq("attendance_date", date);

        if (aErr) return { error: aErr.message };

        const result = users.map(u => {
            const record = attendance?.find(a => a.user_id === u.id);
            return {
                ...u,
                attendanceStatus: record ? 'PRESENT' : 'ABSENT'
            };
        });
        return { data: result };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function sendCustomUserEmail(userId: string, subject: string, message: string) {
    try {
        const { data: user, error: userErr } = await supabase
            .from("users")
            .select("name, email")
            .eq("id", userId)
            .single();

        if (userErr || !user) return { error: "User not found" };

        await sendEmail(user.email, subject, EMAIL_TEMPLATES.CUSTOM(user.name, subject, message));
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}
