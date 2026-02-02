
import { X, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

export function MemberDetailModal({ user, onClose }: { user: any, onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-sm relative overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">

                {/* Header with Avatar */}
                <div className="p-6 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all backdrop-blur-md">
                        <X className="w-4 h-4" />
                    </button>

                    <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-white/10 flex items-center justify-center mb-4 shadow-xl relative group">
                        {user.screenshot_url ? (
                            <Image src={user.screenshot_url} alt="User" fill className="rounded-full object-cover" />
                        ) : (
                            <span className="text-2xl font-black text-white/50">{user.name?.[0]}</span>
                        )}
                        <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-neutral-900 ${user.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>

                    <h2 className="text-lg font-bold text-white text-center">{user.name || "Unknown Warrior"}</h2>
                    <p className="text-xs text-white/40 font-mono tracking-widest uppercase">{user.reg_no || "UNR-000"}</p>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">Contact Info</label>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/60">{user.email}</span>
                                <button onClick={() => handleCopy(user.email || "")} className="text-white/20 hover:text-white transition-colors">
                                    {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                            </div>
                            <div className="h-px bg-white/5 w-full" />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/60">{user.phone || "No Contact"}</span>
                                <button onClick={() => handleCopy(user.phone || "")} className="text-white/20 hover:text-white transition-colors">
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">Payment</label>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                <div className="text-xs font-bold text-white">{user.amount || 'N/A'}</div>
                                <div className="text-[9px] text-white/30 uppercase mt-0.5">{user.payment_mode || 'INDIVIDUAL'}</div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">Transaction</label>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                <div className="text-xs font-mono text-cyan-400 truncate w-full" title={user.transaction_id}>{user.transaction_id || '---'}</div>
                                <div className="text-[9px] text-white/30 uppercase mt-0.5">ID REF</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 pt-2">
                        <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">Status Check</label>
                        <div className={`w-full p-3 rounded-xl border flex items-center justify-between ${user.is_present ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/20'}`}>
                            <span className="text-xs font-bold text-white/80">{user.is_present ? 'CHECKED IN (VENUE)' : 'NOT CHECKED IN'}</span>
                            {user.is_present ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500/50" />}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
