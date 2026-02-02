"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAllSupportTickets, respondToSupportTicket } from "@/lib/support-actions";
import { Loader2, MessageCircle, Send, CheckCircle, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getFriendlyError } from "@/lib/error-handler";

export default function AdminSupportPage() {
    const [admin, setAdmin] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL"); // ALL, OPEN, RESOLVED
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [response, setResponse] = useState("");
    const [responding, setResponding] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (tickets.length > 0) {
            if (filter === "ALL") {
                setFilteredTickets(tickets);
            } else {
                setFilteredTickets(tickets.filter(t => t.status === filter));
            }
        }
    }, [filter, tickets]);

    const checkAuth = async () => {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as any);

        const adminSession = cookies['admin_session'];
        if (!adminSession) {
            router.push("/admin/login");
            return;
        }

        try {
            const { data: adminData, error } = await supabase
                .from("admins")
                .select("*")
                .eq("id", adminSession)
                .single();

            if (error) throw error;
            setAdmin(adminData);
            await fetchTickets();
        } catch (err) {
            router.push("/admin/login");
        }
    };

    const fetchTickets = async () => {
        try {
            const data = await getAllSupportTickets();
            setTickets(data || []);
            setFilteredTickets(data || []);
        } catch (err: any) {
            console.error("Error fetching tickets:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async (status: 'OPEN' | 'RESOLVED') => {
        if (!response.trim() && status === 'RESOLVED') {
            alert("Please provide a response before resolving");
            return;
        }

        try {
            setResponding(true);
            await respondToSupportTicket(selectedTicket.id, response, status);
            await fetchTickets();
            setSelectedTicket(null);
            setResponse("");
        } catch (err: any) {
            alert(getFriendlyError(err));
        } finally {
            setResponding(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>;

    const openTickets = tickets.filter(t => t.status === 'OPEN').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Support Tickets</h1>
                    <p className="text-white/60">Manage and respond to user support requests</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="glass-card p-4">
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Total Tickets</p>
                        <p className="text-3xl font-bold">{tickets.length}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Open Tickets</p>
                        <p className="text-3xl font-bold text-yellow-500">{openTickets}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Resolved</p>
                        <p className="text-3xl font-bold text-green-500">{resolvedTickets}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6">
                    {['ALL', 'OPEN', 'RESOLVED'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${filter === f
                                    ? 'bg-cyan-500 text-black'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Tickets List */}
                <div className="glass-card p-6">
                    {filteredTickets.length === 0 ? (
                        <div className="text-center py-12 text-white/40">
                            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No {filter.toLowerCase()} tickets</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTickets.map((ticket: any) => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold uppercase">
                                                    {ticket.issue_type}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${ticket.status === 'RESOLVED'
                                                        ? 'bg-green-500/20 text-green-500'
                                                        : 'bg-yellow-500/20 text-yellow-500'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <p className="font-bold">{ticket.users?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-white/40">{ticket.users?.email} • {ticket.users?.reg_no}</p>
                                        </div>
                                        <p className="text-xs text-white/40">
                                            {new Date(ticket.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <p className="text-sm text-white/80 line-clamp-2">{ticket.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Response Modal */}
            <AnimatePresence>
                {selectedTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                        onClick={() => setSelectedTicket(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <h2 className="text-2xl font-bold">Ticket Details</h2>
                                <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white/10 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">User</p>
                                    <p className="font-bold">{selectedTicket.users?.name}</p>
                                    <p className="text-sm text-white/60">{selectedTicket.users?.email}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Issue Type</p>
                                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold uppercase">
                                        {selectedTicket.issue_type}
                                    </span>
                                </div>

                                <div>
                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Description</p>
                                    <p className="text-white/90">{selectedTicket.description}</p>
                                </div>

                                {selectedTicket.admin_response && (
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                        <p className="text-xs font-bold text-purple-400 mb-2">Previous Response:</p>
                                        <p className="text-sm text-white/90">{selectedTicket.admin_response}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-white/80">Your Response</label>
                                    <textarea
                                        value={response}
                                        onChange={(e) => setResponse(e.target.value)}
                                        placeholder="Type your response here..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleRespond('RESOLVED')}
                                        disabled={responding}
                                        className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {responding ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                        Resolve Ticket
                                    </button>
                                    <button
                                        onClick={() => handleRespond('OPEN')}
                                        disabled={responding}
                                        className="flex-1 px-6 py-3 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Send className="w-5 h-5" />
                                        Send Response
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
