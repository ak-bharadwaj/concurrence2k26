"use server";

import { supabase } from "./supabase";
import { sendEmail, EMAIL_TEMPLATES } from "./email";

export async function getNextAvailableQR(amount: number = 800) {
    // We need to find an active QR for the amount that hasn't hit its daily limit
    const { data: qrs, error } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("active", true)
        .eq("amount", amount)
        .order("today_usage", { ascending: true }); // Get all, then filter to ensure we handle the limit check properly

    if (error) throw error;

    // Filter for available capacity
    const available = qrs?.find(q => q.today_usage < q.daily_limit);

    if (!available) {
        // Fallback: try to find any active QR with capacity if specific amount is exhausted
        const { data: fallback } = await supabase
            .from("qr_codes")
            .select("*")
            .eq("active", true)
            .order("today_usage", { ascending: true });

        return fallback?.find(q => q.today_usage < q.daily_limit) || fallback?.[0] || null;
    }

    return available;
}

export async function resetQRUsage() {
    const { error } = await supabase
        .from("qr_codes")
        .update({ today_usage: 0 })
        .eq("active", true); // Only reset active ones or all? Usually all.

    if (error) throw error;
    return true;
}

export async function createTeam(name: string, paymentMode: "INDIVIDUAL" | "BULK" = "INDIVIDUAL", maxMembers: number = 5) {
    let team = null;
    let attempts = 0;

    // Fetch the latest team_number to increment
    const { data: lastTeam, error: lastError } = await supabase
        .from("teams")
        .select("team_number")
        .not("team_number", "is", null)
        .order("team_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lastError) console.error("Error fetching last team number:", lastError);

    let nextNum = 0;
    if (lastTeam?.team_number) {
        // Extract number from A000 format
        const match = lastTeam.team_number.match(/A(\d+)/);
        if (match) {
            nextNum = parseInt(match[1]) + 10;
        }
    }
    const team_number = `A${nextNum.toString().padStart(3, '0')}`;

    while (attempts < 5) {
        const unique_code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data, error } = await supabase
            .from("teams")
            .insert([{
                name,
                unique_code,
                payment_mode: paymentMode,
                max_members: maxMembers,
                team_number // New column
            }])
            .select()
            .single();

        if (error && error.code === '23505' && error.message.includes('unique_code')) {
            attempts++;
            continue;
        }

        if (error) throw error;
        team = data;
        break;
    }

    if (!team) throw new Error("Failed to generate a unique team code. Please try again.");
    return team;
}

export async function joinTeam(code: string) {
    const { data: team, error } = await supabase
        .from("teams")
        .select("*")
        .eq("unique_code", code)
        .single();

    if (error) throw new Error("Invalid Team Code");

    // Check if team is full
    const { count } = await supabase
        .from("users")
        .select("*", { count: 'exact', head: true })
        .eq("team_id", team.id);

    if (count !== null && count >= (team.max_members || 5)) {
        throw new Error("Team is full");
    }

    return team;
}

export async function getTeamDetails(teamId: string) {
    const { data: team, error: tErr } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

    if (tErr) throw tErr;

    const { data: members, error: mErr } = await supabase
        .from("users")
        .select("name, status")
        .eq("team_id", teamId);

    if (mErr) throw mErr;

    return { ...team, members };
}

export async function createTicket(userId: string | null, issueType: string, description: string) {
    const { error } = await supabase
        .from("support_tickets")
        .insert([{ user_id: userId, issue_type: issueType, description: description }]);
    if (error) throw error;
    return true;
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
    role?: string;
}) {
    // 1. Check if user already exists and is locked (Approved/Pending)
    const { data: existingUser } = await supabase
        .from("users")
        .select("status, id")
        .eq("reg_no", userData.reg_no)
        .maybeSingle();

    if (existingUser && (existingUser.status === "APPROVED" || existingUser.status === "PENDING" || existingUser.status === "VERIFYING")) {
        throw new Error("This registration is already locked (Approved/Pending). Please contact support for changes.");
    }

    // 2. Verify team_id if provided
    if (userData.team_id) {
        const { data: team, error: teamErr } = await supabase.from("teams").select("id").eq("id", userData.team_id).maybeSingle();
        if (teamErr || !team) throw new Error("The specified squad does not exist.");
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
        status: "UNPAID",
        transaction_id: null,
        screenshot_url: null,
        assigned_qr_id: null
    };

    const { data, error } = await supabase
        .from("users")
        .upsert(sanitizedData, { onConflict: 'reg_no' })
        .select()
        .single();

    if (error) throw error;

    // Send Welcome Email (Non-blocking)
    sendEmail(userData.email, "Registration Received - TechSprint 2K26", EMAIL_TEMPLATES.WELCOME(userData.name));

    // If Leader, update team leader_id
    if (userData.team_id && userData.role === 'LEADER') {
        await supabase.from("teams").update({ leader_id: data.id }).eq("id", userData.team_id);
    }

    return data;
}

// 2. Submit Payment Details
export async function submitPayment(userId: string, paymentData: {
    transaction_id: string;
    screenshot_url: string;
    assigned_qr_id?: string;
}) {
    // 1. Fetch user and team info to check for BULK mode
    const { data: user, error: uErr } = await supabase
        .from("users")
        .select("*, teams!team_id(*)")
        .eq("id", userId)
        .single();

    if (uErr) throw uErr;

    const isBulkLeader = user.role === 'LEADER' && user.teams?.payment_mode === 'BULK' && user.team_id;

    // 2. Block individual payment for non-leaders in BULK mode
    if (user.teams?.payment_mode === 'BULK' && user.role !== 'LEADER') {
        throw new Error("This squad is in BULK payment mode. Only the squad leader can submit the team payment.");
    }

    // 3. Update the payer's status
    const { error } = await supabase
        .from("users")
        .update({
            ...paymentData,
            status: "PENDING"
        })
        .eq("id", userId);

    if (error) throw error;

    // 3. If it's a BULK leader, push all members to PENDING for verification
    if (isBulkLeader) {
        // Only update members who are UNPAID or REJECTED
        await supabase
            .from("users")
            .update({ status: "PENDING" })
            .eq("team_id", user.team_id)
            .neq("id", userId)
            .in("status", ["UNPAID", "REJECTED"]);
    }

    // Send Payment Received Email (Non-blocking)
    sendEmail(user.email, "Payment Received - TechSprint 2K26", EMAIL_TEMPLATES.PAYMENT_RECEIVED(user.name));

    return true;
}

export async function updateStatus(
    userId: string,
    adminId: string,
    newStatus: "UNPAID" | "PENDING" | "APPROVED" | "REJECTED" | "VERIFYING",
    action: string,
    whatsappLink?: string
) {
    const updateData: any = { status: newStatus };

    // Record who performed the action if it's a final state
    if (newStatus === "APPROVED" || newStatus === "REJECTED") {
        updateData.verified_by = adminId;
    }

    const { data: user, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        // Race condition protection: Only update if not already in the target status
        .neq("status", newStatus)
        .select("*, teams!team_id(*)")
        .single();

    if (error) throw error;
    if (!user) return null;

    // If newStatus is APPROVED and they are a leader of a BULK team, approve all members
    if (newStatus === "APPROVED" && user.role === "LEADER" && user.teams?.payment_mode === "BULK" && user.team_id) {
        await supabase
            .from("users")
            .update({ status: "APPROVED", verified_by: adminId })
            .eq("team_id", user.team_id)
            .neq("status", "APPROVED")
            .neq("status", "REJECTED"); // Don't auto-approve someone who was specifically rejected
    }

    // Log action
    const { error: logError } = await supabase.from("action_logs").insert([
        {
            user_id: userId,
            admin_id: adminId,
            action: action,
        },
    ]);

    if (logError) console.error("Error logging action:", logError);

    // 4. Send Email Notification (Non-blocking)
    if (newStatus === "APPROVED") {
        const qrUrl = (uid: string) => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${uid}`;

        // Always notify the specifically updated user
        sendEmail(
            user.email,
            "Registration Approved! 🎉 - TechSprint 2K26",
            EMAIL_TEMPLATES.PAYMENT_VERIFIED(user.name, qrUrl(user.id), user.reg_no, whatsappLink)
        );

        // If it was a BULK leader, notify all newly approved members
        if (user.role === "LEADER" && user.teams?.payment_mode === "BULK" && user.team_id) {
            const { data: members } = await supabase
                .from("users")
                .select("*")
                .eq("team_id", user.team_id)
                .neq("id", userId)
                .eq("status", "APPROVED"); // Only those we just flipped

            if (members) {
                members.forEach(m => {
                    sendEmail(
                        m.email,
                        "Registration Approved! 🎉 - TechSprint 2K26",
                        EMAIL_TEMPLATES.PAYMENT_VERIFIED(m.name, qrUrl(m.id), m.reg_no, whatsappLink)
                    );
                });
            }
        }
    } else if (newStatus === "REJECTED") {
        sendEmail(
            user.email,
            "Action Required: Payment Issue ⚠️",
            EMAIL_TEMPLATES.PAYMENT_REJECTED(user.name)
        );
    }

    return user;
}

export async function getActiveGroupLink(college: string) {
    const normalizedCollege = college === "RGM College" ? "RGM" : "OTHERS";
    const { data, error } = await supabase
        .from("group_links")
        .select("whatsapp_link")
        .eq("college", normalizedCollege)
        .eq("active", true)
        .limit(1);

    if (error) throw error;
    return data[0]?.whatsapp_link || null;
}

export async function getActiveEmailAccounts() {
    const { data, error } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("active", true);

    if (error) throw error;
    return data;
}

export async function deleteUser(userId: string) {
    const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

    if (error) throw error;
    return true;
}

// --- Squad & Unstop Flow Helpers ---

export async function requestJoinTeam(teamId: string, userId: string) {
    const { error } = await supabase
        .from("join_requests")
        .insert([{ team_id: teamId, user_id: userId, status: 'PENDING' }]);
    if (error) throw error;
    return true;
}

export async function getJoinRequests(teamId: string) {
    const { data, error } = await supabase
        .from("join_requests")
        .select("*, users(name, reg_no, college)")
        .eq("team_id", teamId)
        .eq("status", 'PENDING');
    if (error) throw error;
    return data;
}

export async function respondToJoinRequest(requestId: string, status: 'APPROVED' | 'REJECTED') {
    const { data: request, error: rErr } = await supabase
        .from("join_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (rErr) throw rErr;

    if (status === 'APPROVED') {
        const { error: uErr } = await supabase
            .from("users")
            .update({ team_id: request.team_id, role: 'MEMBER' })
            .eq("id", request.user_id);
        if (uErr) throw uErr;
    }

    const { error: dErr } = await supabase
        .from("join_requests")
        .update({ status })
        .eq("id", requestId);
    if (dErr) throw dErr;

    return true;
}

export async function registerBulkMembers(leaderId: string, teamId: string, members: any[]) {
    // 1. Fetch existing statuses to prevent overwriting APPROVED/PENDING users
    const regNos = members.map(m => m.reg_no);
    const { data: existingUsers } = await supabase
        .from("users")
        .select("reg_no, status")
        .in("reg_no", regNos);

    const lockedRegNos = new Set(
        existingUsers?.filter(u => ["APPROVED", "PENDING", "VERIFYING"].includes(u.status)).map(u => u.reg_no) || []
    );

    // 2. Filter out locked members
    const membersToInsert = members
        .filter(m => !lockedRegNos.has(m.reg_no))
        .map(m => ({
            name: m.name,
            reg_no: m.reg_no,
            email: m.email,
            phone: m.phone,
            college: m.college || 'RGM College',
            branch: m.branch,
            year: m.year,
            team_id: teamId,
            role: 'MEMBER',
            status: 'UNPAID'
        }));

    if (membersToInsert.length === 0) return [];

    const { data, error } = await supabase
        .from("users")
        .upsert(membersToInsert, { onConflict: 'reg_no' })
        .select();

    if (error) throw error;
    return data;
}

// --- Team Management Functions ---

export async function removeMemberFromTeam(userId: string, teamId: string) {
    const { data: user, error: userErr } = await supabase
        .from("users")
        .select("team_id, role")
        .eq("id", userId)
        .single();

    if (userErr) throw userErr;
    if (user.team_id !== teamId) throw new Error("User is not in this team");
    if (user.role === "LEADER") throw new Error("Team leader cannot be removed");

    const { data: team } = await supabase.from("teams").select("payment_mode").eq("id", teamId).single();

    const updateData: any = { team_id: null, role: "MEMBER" };
    // If team was BULK, reset the removed user's status to UNPAID to prevent "free-riding"
    if (team?.payment_mode === 'BULK') {
        updateData.status = "UNPAID";
    }

    const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);

    if (error) throw error;
    return true;
}

export async function leaveTeam(userId: string) {
    const { data: user, error: userErr } = await supabase
        .from("users")
        .select("team_id, role")
        .eq("id", userId)
        .single();

    if (userErr) throw userErr;
    if (!user.team_id) throw new Error("You are not in a team");
    if (user.role === "LEADER") throw new Error("Team leader cannot leave. Delete the team instead.");

    const { data: team } = await supabase.from("teams").select("payment_mode").eq("id", user.team_id).single();

    const updateData: any = { team_id: null, role: "MEMBER" };
    // If team was BULK, reset user's status to UNPAID to prevent "free-riding"
    if (team?.payment_mode === 'BULK') {
        updateData.status = "UNPAID";
    }

    const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);

    if (error) throw error;
    return true;
}

export async function updateTeamSettings(teamId: string, settings: { name?: string; max_members?: number }) {
    const { error } = await supabase
        .from("teams")
        .update(settings)
        .eq("id", teamId);

    if (error) throw error;
    return true;
}

export async function deleteTeam(teamId: string) {
    const { data: team } = await supabase.from("teams").select("payment_mode").eq("id", teamId).single();

    const updateData: any = { team_id: null, role: "MEMBER" };
    // If team was BULK, reset all members' status to UNPAID
    if (team?.payment_mode === 'BULK') {
        updateData.status = "UNPAID";
    }

    // First, remove all members from the team and logically reset their status
    const { error: memberErr } = await supabase
        .from("users")
        .update(updateData)
        .eq("team_id", teamId);

    if (memberErr) throw memberErr;

    // Delete any pending join requests
    await supabase.from("join_requests").delete().eq("team_id", teamId);

    // Delete the team
    const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

    if (error) throw error;
    return true;
}

export async function addMemberToTeam(memberData: {
    reg_no: string,
    name: string,
    email: string,
    phone?: string,
    college?: string,
    branch?: string,
    year?: string,
    other_college?: string
}, teamId: string) {
    const { reg_no, name, email, phone, college, branch, year, other_college } = memberData;

    // 1. Check if user already exists
    const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("reg_no", reg_no.trim().toUpperCase())
        .maybeSingle();

    if (existingUser && existingUser.team_id) {
        throw new Error("This participant is already registered in another squad.");
    }

    // 2. Check team capacity
    const { data: team } = await supabase.from("teams").select("*, leader:users!fk_team_leader(*)").eq("id", teamId).single();
    const { count } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", teamId);

    if (count !== null && count >= (team?.max_members || 5)) {
        throw new Error("Your squad has reached its maximum deployment capacity.");
    }

    if (existingUser) {
        // Double check capacity again for existing user joining (race condition protection)
        const { count: finalCount } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", teamId);
        if (finalCount !== null && finalCount >= (team?.max_members || 5)) {
            throw new Error("The squad just hit its limit. Deployment aborted.");
        }

        // Just link the existing solo user
        // Anomaly Fix: Only inherit status if payment mode is BULK
        const targetStatus = team?.payment_mode === "BULK" ? (team?.leader?.status || "PENDING") : "UNPAID";

        const { error: uErr } = await supabase
            .from("users")
            .update({
                team_id: teamId,
                role: "MEMBER",
                status: targetStatus
            })
            .eq("id", existingUser.id);
        if (uErr) throw uErr;

        // Cleanup any ghost join requests
        await supabase.from("join_requests").delete().eq("user_id", existingUser.id).eq("team_id", teamId);

        return existingUser;
    } else {
        // 3. Create new user record
        const finalCollege = (college === 'OTHERS' && other_college) ? other_college : (college || team?.leader?.college);
        const targetStatus = team?.payment_mode === "BULK" ? (team?.leader?.status || "PENDING") : "UNPAID";

        // Double check capacity again for new user (race condition protection)
        const { count: finalCount } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", teamId);
        if (finalCount !== null && finalCount >= (team?.max_members || 5)) {
            throw new Error("The squad just hit its limit. Deployment aborted.");
        }

        const { data: newUser, error: iErr } = await supabase
            .from("users")
            .insert([{
                reg_no: reg_no.trim().toUpperCase(),
                name,
                email,
                phone,
                college: finalCollege,
                branch: branch || "N/A",
                year: year || "I",
                team_id: teamId,
                role: "MEMBER",
                status: targetStatus
            }])
            .select()
            .single();

        if (iErr) throw iErr;

        // Cleanup any ghost join requests
        await supabase.from("join_requests").delete().eq("user_id", newUser.id).eq("team_id", teamId);

        return newUser;
    }
}

export async function updateMemberDetails(userId: string, updates: any) {
    const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId);

    if (error) throw error;
    return true;
}

export async function markAttendance(userId: string, teamId: string, date: string, time: string) {
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

    if (error) throw error;
    return data;
}

export async function fetchAttendanceReport(date: string) {
    // This fetches all users and their attendance for a specific date
    const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, name, reg_no, status, team_id, teams!team_id(name, team_number)");

    if (uErr) throw uErr;

    const { data: attendance, error: aErr } = await supabase
        .from("attendance")
        .select("*")
        .eq("attendance_date", date);

    if (aErr) throw aErr;

    // Combine
    return users.map(u => {
        const record = attendance?.find(a => a.user_id === u.id);
        return {
            ...u,
            attendanceStatus: record ? 'PRESENT' : 'ABSENT'
        };
    });
}
