
import { X, CheckCircle2, AlertCircle, ExternalLink, Calendar, Users, Crown, AlertTriangle } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";

export function VerificationGroupModal({ group, onClose, onApprove, onReject, onApproveMember }: {
    group: any,
    onClose: () => void,
    onApprove: () => void,
    onReject: () => void,
    onApproveMember?: (userId: string) => void
}) {
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [approvingMember, setApprovingMember] = useState<string | null>(null);

    if (!group) return null;

    // Find the proof sources
    const proofs = group.proofs && group.proofs.length > 0 ? group.proofs : [group.members[0]];
    const totalAmount = group.members.length * 800;

    const isRgm = group.members.some((m: any) => m.college?.toUpperCase().includes('RGM'));
    const maxMembers = group.max_members || 4;
    const isOverCapacity = group.members.length > maxMembers;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-4xl h-full max-h-[95vh] sm:h-auto sm:max-h-[90vh] relative overflow-hidden flex flex-col sm:flex-row shadow-2xl animate-in zoom-in-95 duration-200">

                <button onClick={onClose} className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 p-2 bg-black/40 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all backdrop-blur-md border border-white/5">
                    <X className="w-5 h-5" />
                </button>

                {/* Left: Proof Panel */}
                <div className="w-full sm:w-1/2 bg-black/40 border-b sm:border-b-0 sm:border-r border-white/10 p-4 sm:p-6 flex flex-col overflow-y-auto custom-scrollbar space-y-8">
                    <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-3 flex items-center gap-2 sticky top-0 bg-black/80 p-2 z-10 backdrop-blur">
                        <ExternalLink className="w-3 h-3" /> Payment Proofs ({proofs.length})
                    </h3>

                    {proofs.map((proofSource: any, idx: number) => (
                        <div key={idx} className="space-y-4 border-b border-white/5 pb-8 last:border-0 last:pb-0">
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 group min-h-[250px] sm:min-h-[350px]">
                                {proofSource?.screenshot_url ? (
                                    <a href={proofSource.screenshot_url} target="_blank" rel="noreferrer" className="block w-full h-full">
                                        <Image
                                            src={proofSource.screenshot_url}
                                            alt={`Payment Proof ${idx + 1}`}
                                            fill
                                            className="object-contain hover:scale-105 transition-transform duration-500"
                                        />
                                    </a>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                                        <AlertCircle className="w-12 h-12 mb-2" />
                                        <span className="text-xs uppercase font-bold">No Proof Attached</span>
                                        <span className="text-[10px] opacity-50 mt-1">{proofSource?.name}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center">
                                    <div className="min-w-0">
                                        <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest block mb-1">Transaction ID</label>
                                        <div className="font-mono text-cyan-400 text-sm sm:text-base break-all" title={proofSource?.transaction_id}>
                                            {proofSource?.transaction_id || "MISSING-ID"}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-4">
                                        <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest block mb-1">Payer</label>
                                        <div className="text-xs font-bold text-white">{proofSource?.name}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                            <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest block mb-1">Dues Paid</label>
                            <div className="font-black text-green-400 text-lg">₹{totalAmount}</div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                            <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest block mb-1">Warriors</label>
                            <div className={`font-black text-lg flex items-center gap-2 ${isOverCapacity ? 'text-red-400' : 'text-white'}`}>
                                {group.members.length} <span className="text-[9px] text-white/20 font-mono">/ {maxMembers}</span>
                            </div>
                        </div>
                    </div>
                    {isOverCapacity && (
                        <div className="text-[9px] font-black text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20 flex items-center gap-2 uppercase tracking-tight">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> Over Capacity Detected
                        </div>
                    )}
                </div>
                {/* Right: Members & Actions */}
                <div className="w-full sm:w-1/2 flex flex-col bg-neutral-900 overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">{group.teamName || "Solo Warrior"}</h2>
                            {isRgm && (
                                <span className="bg-orange-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(249,115,22,0.3)] shrink-0">
                                    RGM
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${group.type === 'SQUAD' ? 'bg-purple-500' : 'bg-cyan-500'}`} />
                            {group.type} Division
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 custom-scrollbar">
                        <h3 className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Member Reference List</h3>
                        {group.members.map((m: any, idx: number) => (
                            <div key={m.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
                                            {m.name}
                                            {m.role === 'LEADER' && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                                        </div>
                                        <div className="text-[9px] font-mono text-white/40 truncate">{m.reg_no}</div>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    {m.status === 'APPROVED' ? (
                                        <div className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase bg-green-500/20 text-green-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-2.5 h-2.5" /> OK
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (onApproveMember) {
                                                    setApprovingMember(m.id);
                                                    onApproveMember(m.id);
                                                }
                                            }}
                                            disabled={!!approvingMember}
                                            className="text-[8px] font-black px-2 py-1 transparent hover:bg-green-500 hover:text-black border border-green-500/30 text-green-500 rounded uppercase transition-all disabled:opacity-50"
                                        >
                                            {approvingMember === m.id ? "..." : "Approve"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 sm:p-6 border-t border-white/5 bg-black/20 space-y-3 shrink-0">
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setApproving(true); onApprove(); }}
                                disabled={approving || rejecting}
                                className="flex-1 py-3.5 sm:py-4 bg-green-500 hover:bg-green-400 text-black font-black rounded-xl uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                            >
                                {approving ? "Verifying..." : "Approve Group"}
                            </button>
                            <button
                                onClick={() => { setRejecting(true); onReject(); }}
                                disabled={approving || rejecting}
                                className="px-5 sm:px-6 py-3.5 sm:py-4 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 font-black rounded-xl uppercase tracking-widest text-[10px] sm:text-xs transition-all"
                            >
                                {rejecting ? "..." : "Reject"}
                            </button>
                        </div>
                        <p className="text-[8px] text-white/20 text-center leading-relaxed">
                            Verified state will be cascaded to all unverified members in this squad.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
