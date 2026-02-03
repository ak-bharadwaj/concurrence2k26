
import { X, CheckCircle2, AlertCircle, ExternalLink, Calendar, Users, Crown, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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

    // Find the proof source (usually the leader or whoever paid)
    const proofSource = group.members.find((m: any) => m.screenshot_url) || group.members[0];
    const totalAmount = group.members.length * 800;

    const isRgm = group.members.some((m: any) => m.college?.toUpperCase().includes('RGM'));
    const maxMembers = group.max_members || (isRgm ? 4 : 5);
    const isOverCapacity = group.members.length > maxMembers;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] relative overflow-hidden flex flex-col sm:flex-row shadow-2xl animate-in zoom-in-95 duration-200">

                <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all backdrop-blur-md">
                    <X className="w-5 h-5" />
                </button>

                {/* Left: Proof Panel */}
                <div className="w-full sm:w-1/2 bg-black/40 border-b sm:border-b-0 sm:border-r border-white/10 p-6 flex flex-col">
                    <h3 className="text-sm font-black uppercase text-white/40 tracking-widest mb-4 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" /> Payment Proof
                    </h3>

                    <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 group min-h-[300px]">
                        {proofSource?.screenshot_url ? (
                            <a href={proofSource.screenshot_url} target="_blank" rel="noreferrer" className="block w-full h-full">
                                <Image
                                    src={proofSource.screenshot_url}
                                    alt="Payment Proof"
                                    fill
                                    className="object-contain hover:scale-105 transition-transform duration-500"
                                />
                            </a>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                                <AlertCircle className="w-12 h-12 mb-2" />
                                <span className="text-xs uppercase font-bold">No Proof Attached</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 space-y-4">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                            <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest block mb-1">Transaction ID (UTR)</label>
                            <div className="font-mono text-cyan-400 text-lg sm:text-xl truncate" title={proofSource?.transaction_id}>
                                {proofSource?.transaction_id || "MISSING-ID"}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                                <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest block mb-1">Total Amount</label>
                                <div className="font-black text-green-400 text-xl">₹{totalAmount}</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-4 relative">
                                <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest block mb-1">Head Count</label>
                                <div className={`font-black text-xl flex items-center gap-2 ${isOverCapacity ? 'text-red-400' : 'text-white'}`}>
                                    <Users className="w-5 h-5 text-white/40" /> {group.members.length}
                                    <span className="text-[10px] text-white/20 font-mono">/ {maxMembers}</span>
                                </div>
                                {isOverCapacity && (
                                    <div className="mt-2 text-[9px] font-black text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20 flex items-center gap-2 uppercase tracking-tighter">
                                        <AlertTriangle className="w-3 h-3" /> Over Capacity Protection
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Members & Actions */}
                <div className="w-full sm:w-1/2 flex flex-col bg-neutral-900">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-white tracking-tight">{group.teamName || "Solo Warrior"}</h2>
                            {isRgm && (
                                <span className="bg-orange-500 text-black text-[10px] font-black px-2 py-1 rounded-md shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                                    RGM SQUAD
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-white/40 font-mono uppercase tracking-widest flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${group.type === 'SQUAD' ? 'bg-purple-500' : 'bg-cyan-500'}`} />
                            {group.type} Division
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        <h3 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">Member Reference List</h3>
                        {group.members.map((m: any, idx: number) => (
                            <div key={m.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white flex items-center gap-2">
                                            {m.name}
                                            {m.role === 'LEADER' && <Crown className="w-3 h-3 text-yellow-400" />}
                                        </div>
                                        <div className="text-[10px] font-mono text-white/40">{m.reg_no}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {m.status === 'APPROVED' ? (
                                        <div className="text-[9px] font-black px-2 py-1 rounded uppercase bg-green-500/20 text-green-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
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
                                            className="text-[9px] font-black px-3 py-1 transparent hover:bg-green-500 hover:text-black border border-green-500/30 text-green-500 rounded uppercase transition-all flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {approvingMember === m.id ? "..." : "Approve"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black/20 space-y-3">
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setApproving(true); onApprove(); }}
                                disabled={approving || rejecting}
                                className="flex-1 py-4 bg-green-500 hover:bg-green-400 text-black font-black rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                            >
                                {approving ? "Verifying..." : "Approve Entire Group"}
                            </button>
                            <button
                                onClick={() => { setRejecting(true); onReject(); }}
                                disabled={approving || rejecting}
                                className="px-6 py-4 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 font-black rounded-xl uppercase tracking-widest text-xs transition-all"
                            >
                                {rejecting ? "..." : "Reject"}
                            </button>
                        </div>
                        <p className="text-[9px] text-white/20 text-center leading-relaxed px-4">
                            Approved status will be cascaded to all unverified members in this group. Verified state will be updated for the entire squad.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
