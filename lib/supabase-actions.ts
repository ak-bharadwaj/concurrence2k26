"use server";

import { createAdminClient } from "./supabase-admin";
import { cookies } from "next/headers";
import { sendEmail, EMAIL_TEMPLATES } from "./email";

export async function getNextAvailableQR(amount: number = 800) {
    try {
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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
    try {
        const supabase = createAdminClient();
        // Generate unique 6-digit code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data: team, error } = await supabase
            .from("teams")
            .insert([{
                name: name.trim(),
                unique_code: code,
                leader_id: leaderId,
                payment_mode: paymentMode,
                max_members: maxMembers
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
                        max_members: maxMembers
                    }])
                    .select()
                    .single();
                if (retryErr) return { error: retryErr.message };
                return { data: retryTeam };
            }
            return { error: error.message };
        }

        return { data: team };
    } catch (err: any) {
        return { error: err.message || "Failed to create team." };
    }
}

export async function joinTeam(code: string) {
    try {
        const supabase = createAdminClient();
        const { data: team, error } = await supabase
            .from("teams")
            .select("id, name, unique_code, payment_mode, max_members, leader_id, members:users!team_id(id), leader:users!leader_id(id, name, email, status)")
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
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("teams")
            .select(`
                *,
                members:users!team_id(*)
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
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
        // 1. Check for existing record by Email (our new unique anchor)
        const { data: existingUser } = await supabase
            .from("users")
            .select("id, status, phone")
            .eq("email", userData.email)
            .maybeSingle();

        if (existingUser && ["APPROVED", "PENDING", "VERIFYING"].includes(existingUser.status)) {
            return { error: "This registration (Email) is already locked (Approved/Pending). Please contact support for changes." };
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
        const supabase = createAdminClient();
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
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("users")
            .select("id, status")
            .or(`email.eq.${email.trim().toLowerCase()}`);

        if (error) return { error: error.message };

        const lockedStatuses = ["PENDING", "APPROVED", "VERIFYING"];
        const conflict = data?.find(u => lockedStatuses.includes(u.status));

        if (conflict) {
            return { error: "User already registered or payment pending." };
        }

        return { data: true };
    } catch (err: any) {
        return { error: err.message || "Availability check failed." };
    }
}

// 2. Submit Payment Details
export async function submitPayment(userId: string, paymentData: {
    transaction_id: string;
    screenshot_url: string;
    assigned_qr_id?: string;
}) {
    try {
        // Security: Verify user session
        const cookieStore = await cookies();
        const studentSession = cookieStore.get('student_session')?.value;
        if (!studentSession || studentSession !== userId) {
            return { error: "Unauthorized: Invalid Session" };
        }

        const supabase = createAdminClient();
        const { data: user, error: userErr } = await supabase
            .from("users")
            .update({
                transaction_id: paymentData.transaction_id,
                screenshot_url: paymentData.screenshot_url,
                assigned_qr_id: paymentData.assigned_qr_id,
                status: "PENDING"
            })
            .eq("id", userId)
            .select("id, name, reg_no, email, phone, status, teams!team_id(id, name, unique_code, payment_mode)")
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

    // Security: Verify Admin Session
    const cookieStore = await cookies();
    const adminSessionId = cookieStore.get('admin_session')?.value;

    if (!adminSessionId) {
        return { error: "Unauthorized: Admin session required" };
    }

    const supabase = createAdminClient();

    // Verify admin role
    const { data: adminUser } = await supabase
        .from("admins")
        .select("role")
        .eq("id", adminSessionId)
        .single();

    if (!adminUser) {
        return { error: "Unauthorized: Invalid Admin" };
    }

    // Use the real admin ID from session
    const verifiedAdminId = adminSessionId;

    if (newStatus === "APPROVED" || newStatus === "REJECTED") {
        updateData.verified_by = verifiedAdminId;
    }

    try {
        const { data: user, error } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", userId)
            .neq("status", newStatus)
            .select("id, name, email, reg_no, status, role, team_id, teams!team_id(id, name, payment_mode)")
            .single();

        if (error) return { error: error.message };
        if (!user) return { error: "User not found" };

        const teamsData: any = user.teams;
        const paymentMode = Array.isArray(teamsData) ? teamsData[0]?.payment_mode : teamsData?.payment_mode;

        if (newStatus === "APPROVED" && user.role === "LEADER" && paymentMode === "BULK" && user.team_id) {
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
                admin_id: verifiedAdminId,
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

            const tData: any = user.teams;
            const pMode = Array.isArray(tData) ? tData[0]?.payment_mode : tData?.payment_mode;
            if (user.role === "LEADER" && pMode === "BULK" && user.team_id) {
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
        const cookieStore = await cookies();
        const adminSessionId = cookieStore.get('admin_session')?.value;
        if (!adminSessionId) return { error: "Unauthorized" };

        const supabase = createAdminClient();

        const { data: team, error: teamErr } = await supabase
            .from("teams")
            .update({}) // Status removed, column doesn't exist
            .eq("id", teamId)
            .select()
            .single();

        if (teamErr) return { error: teamErr.message };

        const { error: membersErr } = await supabase
            .from("users")
            .update({ status: "APPROVED", verified_by: adminSessionId })
            .eq("team_id", teamId);

        if (membersErr) return { error: membersErr.message };

        return { data: team };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function getActiveGroupLink(college: string) {
    try {
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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
        // Security: Verify Admin Session
        const cookieStore = await cookies();
        const adminSessionId = cookieStore.get('admin_session')?.value;
        if (!adminSessionId) return { error: "Unauthorized" };

        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
        const insertData: any = { team_id: teamId, status: 'PENDING' };
        if (userId) {
            insertData.user_id = userId;
        } else if (candidateData) {
            insertData.candidate_data = candidateData;
        }

        // Handle conflict differently for anonymous vs logged in
        // If logged in, conflict is on team_id, user_id
        // If anonymous, we don't have a strict unique constraint on candidate_data->>email yet 
        // but we can try to upsert based on team_id and candidate_data->>email for anonymous

        const { data, error } = await supabase
            .from("join_requests")
            .upsert(insertData, {
                onConflict: userId ? 'team_id,user_id' : undefined // Let DB handle anonymous or use policy
            })
            .select()
            .single();

        if (error) {
            console.error("requestJoinTeam Error:", error);
            return { error: `DB Error: ${error.message}` };
        }
        return { data };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function getJoinRequests(teamId: string, status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' = 'PENDING') {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("join_requests")
            .select(`
                *,
                users:users!user_id (
                    name,
                    reg_no,
                    college,
                    email,
                    phone,
                    status
                )
            `)
            .eq("team_id", teamId)
            .eq("status", status)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching join requests:", error);
            return { error: error.message };
        }

        const formattedData = (data || []).map(req => {
            // Priority: user record, then candidate_data
            const source = req.user_id ? (Array.isArray(req.users) ? req.users[0] : req.users) : req.candidate_data;
            return {
                ...req,
                name: source?.name || req.candidate_data?.name || "Unknown Warrior",
                email: source?.email || req.candidate_data?.email || "---",
                reg_no: source?.reg_no || req.candidate_data?.reg_no || "---",
                college: source?.college || req.candidate_data?.college || "---",
                phone: source?.phone || req.candidate_data?.phone || "---",
                user_status: source?.status || "PENDING"
            };
        });

        return { data: formattedData };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function getUserJoinRequest(userId: string) {
    try {
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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

        const targetEmail = (request.users && !Array.isArray(request.users) ? request.users.email : null) || request.candidate_data?.email;
        const targetName = (request.users && !Array.isArray(request.users) ? request.users.name : null) || request.candidate_data?.name || "Warrior";

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
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
        const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .eq("email", email.trim().toLowerCase())
            .maybeSingle();

        if (existingUser && existingUser.team_id) {
            return { error: "This participant is already registered in another squad." };
        }

        const { data: team } = await supabase.from("teams").select("id, name, max_members, payment_mode, leader_id, users!leader_id(status, email, college)").eq("id", teamId).single();
        const { count } = await supabase.from("users").select("*", { count: 'exact', head: true }).eq("team_id", teamId);

        if (count !== null && count >= (team?.max_members || 5)) {
            return { error: "Oops, looks like you're late! This squad is full now." };
        }

        if (existingUser) {
            const usersData: any = team?.users;
            const leaderStatus = Array.isArray(usersData) ? usersData[0]?.status : usersData?.status;
            const targetStatus = team?.payment_mode === "BULK" ? (leaderStatus || "PENDING") : "UNPAID";

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
            const teamLeader = Array.isArray(team?.users) ? team?.users[0] : team?.users;
            const finalCollege = (college === 'OTHERS' && otherCollege) ? otherCollege : (college || teamLeader?.college);
            const targetStatus = team?.payment_mode === "BULK" ? (teamLeader?.status || "PENDING") : "UNPAID";

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
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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
        const supabase = createAdminClient();
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
