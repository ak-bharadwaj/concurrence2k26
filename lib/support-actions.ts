"use server";

import { supabase } from "./supabase";

// Get all support tickets (admin)
export async function getAllSupportTickets() {
    const { data, error } = await supabase
        .from("support_tickets")
        .select("*, users(name, email, reg_no)")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

// Get user's support tickets
export async function getUserSupportTickets(userId: string) {
    const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

// Respond to support ticket (admin)
export async function respondToSupportTicket(ticketId: string, response: string, status: 'OPEN' | 'RESOLVED') {
    const { error } = await supabase
        .from("support_tickets")
        .update({ admin_response: response, status })
        .eq("id", ticketId);

    if (error) throw error;
    return true;
}

// Submit a new ticket (user)
export async function submitSupportTicket(ticketData: {
    user_id: string;
    issue_type: string;
    description: string;
}) {
    const { data, error } = await supabase
        .from("support_tickets")
        .insert([ticketData])
        .select()
        .single();

    if (error) throw error;
    return data;
}
