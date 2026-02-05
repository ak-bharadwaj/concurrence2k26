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

export async function createTeam(name: string, leaderId: string, paymentMode: "INDIVIDUAL" | "BULK" = "INDIVIDUAL", maxMembers: number = 5) {
    try {
        let team = null;
        let attempts = 0;

        // Use Postgres RPC for atomic team number generation
        const { data: team_number, error: rpcErr } = await supabase.rpc('generate_team_number');
        if (rpcErr) {
            console.error("Error generating team number via RPC:", rpcErr);
            return { error: "Database initialization required. Please ask admin to run the setup script." };
        }

        while (attempts < 5) {
            const unique_code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data, error } = await supabase
                .from("teams")
                .insert([{
                    name,
                    unique_code,
                    leader_id: leaderId,
                    payment_mode: paymentMode,
                    max_members: maxMembers,
                    team_number
                }])
                .select()
                .single();

            if (error && error.code === '23505' && error.message.includes('unique_code')) {
                attempts++;
                continue;
            }

            if (error) {
                console.error("SUPABASE ERROR in createTeam:", error);
                return { error };
            }
            team = data;
            break;
        }

        if (!team) return { error: "Failed to generate a unique squad identity. Please try again." };
        return { data: team };
    } catch (err: any) {
        console.error("UNEXPECTED ERROR in createTeam:", err);
        return { error: err.message || "An unexpected error occurred during squad creation." };
    }
}

export async function joinTeam(code: string) {
    try {
        const { data: team, error } = await supabase
            .from("teams")
            .select("*")
            .eq("unique_code", code.trim().toUpperCase())
            .single();

        if (error) {
            console.error("ERROR finding squad:", error);
            return { error: "Squad not found. Please verify the code and try again." };
        }

        // Check if team is full
        const { count: memberCount } = await supabase
            .from("users")
            .select("*", { count: 'exact', head: true })
            .eq("team_id", team.id);

        const totalMembers = (memberCount || 0);

        if (totalMembers >= (team.max_members || 5)) {
            return { error: `Oops, looks like you're late! This squad '${team.name}' is already at maximum capacity.` };
        }

        return { data: team };
    } catch (err: any) {
        console.error("UNEXPECTED ERROR in joinTeam:", err);
        return { error: err.message || "An unexpected error occurred while searching for the squad." };
    }
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
    today_date?: string; // dummy for compatibility
    tshirt_size?: string;
    role?: string;
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
            status: "UNPAID",
            transaction_id: null,
            screenshot_url: null,
            assigned_qr_id: null
        };

        const { data, error } = await supabase
            .from("users")
            .upsert(sanitizedData, { onConflict: 'email' })
            .select()
            .single();

        if (error) {
            console.error("SUPABASE ERROR in registerUser:", error);
            return { error };
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

// 2. Submit Payment Details
export async function submitPayment(userId: string, paymentData: {
    transaction_id: string;
    screenshot_url: string;
    assigned_qr_id?: string;
}) {
    try {
        // 0. Validate Transaction ID
        const txId = paymentData.transaction_id?.trim();
        if (!txId || txId.length < 12 || txId.length > 20) {
            return { error: "Transaction ID must be between 12 and 20 characters." };
        }

        // 0b. Check for duplicate Transaction ID
        const { data: existingTx } = await supabase
            .from("users")
            .select("id")
            .eq("transaction_id", txId)
            .neq("id", userId)
            .maybeSingle();

        if (existingTx) {
            return { error: "This Transaction ID has already been submitted by another user." };
        }

        // 1. Fetch user and team info to check for BULK mode
        const { data: user, error: uErr } = await supabase
            .from("users")
            .select("*, teams!team_id(*)")
            .eq("id", userId)
            .single();

        if (uErr) {
            console.error("ERROR fetching user for payment:", uErr);
            return { error: "Failed to verify user identity for payment submission." };
        }

        const isBulkLeader = user.role === 'LEADER' && user.teams?.payment_mode === 'BULK' && user.team_id;

        // 3. Update the payer's status
        const { error } = await supabase
            .from("users")
            .update({
                ...paymentData,
                status: "PENDING"
            })
            .eq("id", userId);

        if (error) {
            console.error("SUPABASE ERROR in submitPayment:", error);
            return { error };
        }

        // 4. If it's a BULK leader, push all members to PENDING for verification
        if (isBulkLeader) {
            await supabase
                .from("users")
                .update({ status: "PENDING" })
                .eq("team_id", user.team_id)
                .neq("id", userId)
                .in("status", ["UNPAID", "REJECTED"]);
        }

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
            "Registration Approved! 🎉 - Hackathon 2K26",
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
                        "Registration Approved! 🎉 - Hackathon 2K26",
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

export async function approveTeamPayment(
    teamId: string,
    adminId: string,
    paymentDetails: { transaction_id: string | null; screenshot_url: string | null }
) {
    try {
        // 1. Fetch all team members to notify them later
        const { data: members, error: mErr } = await supabase
            .from("users")
            .select("*")
            .eq("team_id", teamId);

        if (mErr) {
            console.error("ERROR fetching squad members:", mErr);
            return { error: "Failed to locate squad members for payment verification." };
        }
        if (!members || members.length === 0) return { error: "No members found in this squad." };

        // 2. Update all members to APPROVED with the provided proof
        const { error: uErr } = await supabase
            .from("users")
            .update({
                status: "APPROVED",
                verified_by: adminId,
                is_present: true // Auto-verify on approval
            })
            .eq("team_id", teamId)
            .neq("status", "REJECTED");

        if (uErr) {
            console.error("ERROR updating member statuses:", uErr);
            return { error: uErr };
        }

        // 3. Log the action
        const referenceUserId = members.find(m => m.role === 'LEADER')?.id || members[0].id;
        await supabase.from("action_logs").insert([{
            user_id: referenceUserId,
            admin_id: adminId,
            action: "BULK_APPROVE_PAYMENT"
        }]);

        // 4. Send Emails
        const qrUrl = (uid: string) => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${uid}`;
        const leader = members.find(m => m.role === 'LEADER') || members[0];
        const waLink = await getActiveGroupLink(leader.college);

        for (const member of members) {
            if (member.status === "APPROVED") continue;
            sendEmail(
                member.email,
                "Registration Approved! 🎉 - Hackathon 2K26",
                EMAIL_TEMPLATES.PAYMENT_VERIFIED(member.name, qrUrl(member.id), member.reg_no, waLink || "")
            );
        }

        return { data: true };
    } catch (err: any) {
        console.error("UNEXPECTED ERROR in approveTeamPayment:", err);
        return { error: err.message || "An unexpected error occurred during squad payment approval." };
    }
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
// 9. Get Join Requests for a Team
export async function getJoinRequests(teamId: string, status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' = 'PENDING') {
    const { data, error } = await supabase
        .from("join_requests")
        .select(`
            *,
            users:user_id (
                name,
                reg_no,
                college
            )
        `)
        .eq("team_id", teamId)
        .eq("status", status);

    if (error) {
        console.error("Error fetching join requests:", error);
        throw error;
    }

    // Ensure we handle both object and array formats (though should be object)
    // Map to a consistent format the UI expects (req.users.name etc)
    return (data || []).map(req => {
        const userData = Array.isArray(req.users) ? req.users[0] : req.users;
        return {
            ...req,
            users: userData, // Original name
            user: userData   // Alias for robustness
        };
    });
}

export async function getUserJoinRequest(userId: string) {
    const { data, error } = await supabase
        .from("join_requests")
        .select("*, teams!team_id(name)")
        .eq("user_id", userId)
        .eq("status", 'PENDING')
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function respondToJoinRequest(requestId: string, status: 'ACCEPTED' | 'REJECTED') {
    // 1. Fetch request details
    const { data: request, error: reqErr } = await supabase
        .from("join_requests")
        .select("*, users!user_id(name, email)")
        .eq("id", requestId)
        .single();

    if (reqErr) throw reqErr;

    if (status === 'ACCEPTED') {
        // 2. Capacity Check
        const { data: team } = await supabase.from("teams").select("max_members").eq("id", request.team_id).single();
        const { count } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", request.team_id);

        const currentMax = team?.max_members || 5;
        if (count !== null && count >= currentMax) {
            throw new Error(`Cannot accept: Squad is already at maximum capacity (${currentMax}).`);
        }

        // 3. Update User
        const { error: userErr } = await supabase
            .from("users")
            .update({ team_id: request.team_id, role: "MEMBER" })
            .eq("id", request.user_id);

        if (userErr) throw userErr;

        // 4a. Auto-reject others if team is now full
        if (count !== null && count + 1 >= currentMax) {
            await supabase
                .from("join_requests")
                .update({ status: 'REJECTED' })
                .eq("team_id", request.team_id)
                .eq("status", 'PENDING')
                .neq("id", requestId);
        }
    }

    // 4b. Update Request Status
    const { error: updateErr } = await supabase
        .from("join_requests")
        .update({ status: status })
        .eq("id", requestId);

    if (updateErr) throw updateErr;

    // 5. Send Notification Email
    if (request?.users?.email) {
        if (status === 'ACCEPTED') {
            await sendEmail(
                request.users.email,
                "Welcome to the Squad! 🚀",
                EMAIL_TEMPLATES.CUSTOM(
                    request.users.name,
                    "Congratulations! You have joined the squad.",
                    "Great news! The team leader has accepted your request. You are now officially part of the squad. Please login to your dashboard to sync with your team and complete your payment to finalize your registration."
                )
            );
        } else if (status === 'REJECTED') {
            await sendEmail(
                request.users.email,
                "Update on your Squad Request",
                EMAIL_TEMPLATES.CUSTOM(
                    request.users.name,
                    "Squad Request Declined",
                    "Unfortunately, your request to join the squad was declined by the captain. Don't worry, you can still join other teams or participate independently."
                )
            );
        }
    }

    return true;
}

export async function registerBulkMembers(leaderId: string, teamId: string, members: any[]) {
    try {
        // 1. Fetch existing statuses to prevent overwriting APPROVED/PENDING users
        const emails = members.map(m => m.email);
        const { data: existingUsers } = await supabase
            .from("users")
            .select("email, status")
            .in("email", emails);

        const lockedEmails = new Set(
            existingUsers?.filter(u => ["APPROVED", "PENDING", "VERIFYING"].includes(u.status)).map(u => u.email) || []
        );

        // 2. Filter out locked members
        const membersToInsert = members
            .filter(m => !lockedEmails.has(m.email))
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
                tshirt_size: m.tshirt_size,
                status: 'UNPAID'
            }));

        if (membersToInsert.length === 0) return { data: [] };

        const { data, error } = await supabase
            .from("users")
            .upsert(membersToInsert, { onConflict: 'email' })
            .select();

        if (error) {
            console.error("SUPABASE ERROR in registerBulkMembers:", error);
            return { error };
        }
        return { data };
    } catch (err: any) {
        console.error("UNEXPECTED ERROR in registerBulkMembers:", err);
        return { error: err.message || "An unexpected error occurred during squad member synchronization." };
    }
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
    tshirt_size?: string,
    other_college?: string
}, teamId: string) {
    const { reg_no, name, email, phone, college, branch, year, tshirt_size, other_college } = memberData;

    // 1. Check if user already exists
    const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

    if (existingUser && existingUser.team_id) {
        throw new Error("This participant is already registered in another squad.");
    }

    // 2. Check team capacity
    const { data: team } = await supabase.from("teams").select("*, leader:users!fk_team_leader(*)").eq("id", teamId).single();
    const { count } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", teamId);

    if (count !== null && count >= (team?.max_members || 5)) {
        throw new Error("Oops, looks like you're late! This squad is full now.");
    }

    if (existingUser) {
        // Double check capacity again for existing user joining (race condition protection)
        const { count: finalCount } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", teamId);
        if (finalCount !== null && finalCount >= (team?.max_members || 5)) {
            throw new Error("Oops, looks like you're late! This squad is full now.");
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

        // Auto-reject other pending requests for THIS USER if they just joined (they found a home)
        await supabase.from("join_requests").update({ status: 'COMPLETED' }).eq("user_id", existingUser.id).neq("team_id", teamId);

        // Auto-reject other pending requests for THIS TEAM if it's now full
        if (finalCount !== null && finalCount + 1 >= (team?.max_members || 5)) {
            await supabase.from("join_requests").update({ status: 'REJECTED' }).eq("team_id", teamId).eq("status", 'PENDING');
        }

        // Cleanup any ghost join requests for this team
        await supabase.from("join_requests").delete().eq("user_id", existingUser.id).eq("team_id", teamId);

        return existingUser;
    } else {
        // 3. Create new user record
        const finalCollege = (college === 'OTHERS' && other_college) ? other_college : (college || team?.leader?.college);
        const targetStatus = team?.payment_mode === "BULK" ? (team?.leader?.status || "PENDING") : "UNPAID";

        // Double check capacity again for new user (race condition protection)
        const { count: finalCount } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", teamId);
        if (finalCount !== null && finalCount >= (team?.max_members || 5)) {
            throw new Error("Oops, looks like you're late! This squad is full now.");
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
                tshirt_size: tshirt_size || "M",
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

export async function sendCustomUserEmail(userId: string, subject: string, message: string) {
    const { data: user, error: userErr } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", userId)
        .single();

    if (userErr || !user) throw new Error("User not found");

    await sendEmail(user.email, subject, EMAIL_TEMPLATES.CUSTOM(user.name, subject, message));
    return true;
}

