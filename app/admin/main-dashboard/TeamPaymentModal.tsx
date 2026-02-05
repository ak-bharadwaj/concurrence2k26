"use client";

import React from "react";

import { X, ExternalLink, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface TeamPaymentModalProps {
    team: any;
    members: any[];
    onClose: () => void;
}

export function TeamPaymentModal({ team, members, onClose }: TeamPaymentModalProps) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-neutral-900 border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
                    <div>
                        <h3 className="text-xl font-black uppercase italic tracking-tighter">{team.name}</h3>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-1">
                            Team Payment Proofs • {team.payment_mode} Mode
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/50 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Member Payment List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {members.map((member: any) => (
                        <div
                            key={member.id}
                            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all"
                        >
                            <div className="flex items-start justify-between gap-4">
                                {/* Member Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div>
                                            <h4 className="font-bold text-sm">{member.name}</h4>
                                            <p className="text-[10px] text-white/40 uppercase font-mono tracking-wider">
                                                {member.reg_no} • {member.role}
                                            </p>
                                        </div>
                                        <div
                                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${member.status === "APPROVED"
                                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                : member.status === "PENDING"
                                                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                                    : member.status === "REJECTED"
                                                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                        : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                                }`}
                                        >
                                            {member.status}
                                        </div>
                                    </div>

                                    {/* Payment Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                            <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">
                                                Transaction ID
                                            </p>
                                            <p className="font-mono text-sm font-bold text-cyan-400">
                                                {member.transaction_id || (
                                                    <span className="text-white/20 italic">Not submitted</span>
                                                )}
                                            </p>
                                        </div>

                                        <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                            <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mb-1">
                                                Payment Proof
                                            </p>
                                            {member.screenshot_url ? (
                                                <a
                                                    href={member.screenshot_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                    View Screenshot
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            ) : (
                                                <span className="text-white/20 italic text-sm">No screenshot</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Screenshot Preview */}
                                {member.screenshot_url && (
                                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 bg-black/50">
                                        <img
                                            src={member.screenshot_url}
                                            alt="Payment proof"
                                            className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                                            onClick={() => window.open(member.screenshot_url, "_blank")}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {members.length === 0 && (
                        <div className="text-center py-12 text-white/40">
                            <p className="text-sm uppercase tracking-widest">No members in this team</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
