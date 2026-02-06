"use server";

import { supabase } from "./supabase";

// Get all support tickets (admin)
export async function getAllSupportTickets() {
    try {
        const { data, error } = await supabase
            .from("support_tickets")
            .select("*, users(name, email, reg_no)")
            .order("created_at", { ascending: false });

        if (error) return { error: error.message };
        return { data };
    } catch (err: any) {
        return { error: err.message };
    }
}

// Get user's support tickets
export async function getUserSupportTickets(userId: string) {
    try {
        const { data, error } = await supabase
            .from("support_tickets")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) return { error: error.message };
        return { data };
    } catch (err: any) {
        return { error: err.message };
    }
}

// Respond to support ticket (admin)
export async function respondToSupportTicket(ticketId: string, response: string, status: 'OPEN' | 'RESOLVED') {
    try {
        const { error } = await supabase
            .from("support_tickets")
            .update({ admin_response: response, status })
            .eq("id", ticketId);

        if (error) return { error: error.message };
        return { data: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

// Submit a new ticket (user)
export async function submitSupportTicket(ticketData: {
    user_id: string;
    issue_type: string;
    description: string;
}) {
    try {
        const { data, error } = await supabase
            .from("support_tickets")
            .insert([ticketData])
            .select()
            .single();

        if (error) return { error: error.message };
        return { data };
    } catch (err: any) {
        return { error: err.message };
    }
}
