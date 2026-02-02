"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createTicket } from "@/lib/supabase-actions";
import { getUserSupportTickets } from "@/lib/support-actions";
import { Loader2, MessageCircle, Send, CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { GlassNavbar } from "@/components/glass-navbar";
import { getFriendlyError } from "@/lib/error-handler";

export default function SupportPage() {
    const [user, setUser] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [issueType, setIssueType] = useState("PAYMENT");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {} as any);

        const userId = cookies['student_session'];
        if (!userId) {
            router.push("/login");
            return;
        }

        try {
            const { data: userData, error: uErr } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();

            if (uErr) throw uErr;
            setUser(userData);

            const ticketsData = await getUserSupportTickets(userId);
            setTickets(ticketsData || []);
        } catch (err: any) {
            setError(getFriendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            setError("Please describe your issue");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await createTicket(user.id, issueType, description);
            setSuccess(true);
            setDescription("");
            setTimeout(() => setSuccess(false), 3000);
            await fetchData();
        } catch (err: any) {
            setError(getFriendlyError(err));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-black text-white">
            <GlassNavbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Support Center</h1>
                    <p className="text-white/60 mt-2">Need help? Submit a ticket and our team will assist you.</p>
                </div>

                {/* Submit New Ticket */}
                <div className="glass-card p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-cyan-400" />
                        Submit New Ticket
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-white/80">Issue Type</label>
                            <select
                                value={issueType}
                                onChange={(e) => setIssueType(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                            >
                                <option value="PAYMENT">Payment Issue</option>
                                <option value="REGISTRATION">Registration Issue</option>
                                <option value="TEAM">Team Management</option>
                                <option value="TECHNICAL">Technical Problem</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2 text-white/80">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your issue in detail..."
                                rows={5}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-500 text-sm flex items-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Ticket submitted successfully! We'll respond soon.
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full px-6 py-3 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {submitting ? "Submitting..." : "Submit Ticket"}
                        </button>
                    </form>
                </div>

                {/* Previous Tickets */}
                <div className="glass-card p-6">
                    <h2 className="text-xl font-bold mb-4">Your Tickets ({tickets.length})</h2>

                    {tickets.length === 0 ? (
                        <div className="text-center py-12 text-white/40">
                            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No tickets submitted yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tickets.map((ticket: any) => (
                                <div key={ticket.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold uppercase">
                                                    {ticket.issue_type}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${ticket.status === 'RESOLVED'
                                                        ? 'bg-green-500/20 text-green-500'
                                                        : 'bg-yellow-500/20 text-yellow-500'
                                                    }`}>
                                                    {ticket.status === 'RESOLVED' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <Clock className="w-3 h-3 inline mr-1" />}
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/40">
                                                {new Date(ticket.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-sm text-white/80 mb-3">{ticket.description}</p>

                                    {ticket.admin_response && (
                                        <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                            <p className="text-xs font-bold text-purple-400 mb-1">Admin Response:</p>
                                            <p className="text-sm text-white/90">{ticket.admin_response}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
