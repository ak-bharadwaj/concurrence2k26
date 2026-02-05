import { X, Copy, CheckCircle2, Edit3, Save } from "lucide-react";
import React, { useState } from "react";
import Image from "next/image";

export function MemberDetailModal({ user, onClose, onSave }: { user: any, onClose: () => void, onSave?: (id: string, field: string, value: any) => void }) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ ...user });

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFieldSave = (field: string, value: any) => {
        if (onSave) onSave(user.id, field, value);
    };

    const handleBulkSave = () => {
        if (onSave) {
            Object.keys(formData).forEach(key => {
                if (formData[key] !== user[key]) {
                    onSave(user.id, key, formData[key]);
                }
            });
        }
        setIsEditing(false);
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-sm relative overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">

                {/* Header with Avatar */}
                <div className="p-6 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="p-2 bg-black/40 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all backdrop-blur-md"
                            title={isEditing ? "Cancel" : "Edit Profile"}
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={onClose} className="p-2 bg-black/40 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all backdrop-blur-md">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-white/10 flex items-center justify-center mb-4 shadow-xl relative group">
                        {user.screenshot_url ? (
                            <Image src={user.screenshot_url} alt="User" fill className="rounded-full object-cover" />
                        ) : (
                            <span className="text-2xl font-black text-white/50">{user.name?.[0]}</span>
                        )}
                        <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-neutral-900 ${user.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>

                    {isEditing ? (
                        <div className="space-y-2 w-full px-4">
                            <input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 w-full text-sm font-bold text-center outline-none focus:border-orange-500/50"
                                placeholder="Name"
                            />
                            <input
                                value={formData.reg_no}
                                onChange={(e) => setFormData({ ...formData, reg_no: e.target.value })}
                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 w-full text-[10px] font-mono text-center outline-none focus:border-orange-500/50 uppercase"
                                placeholder="Registration No"
                            />
                        </div>
                    ) : (
                        <>
                            <h2 className="text-lg font-bold text-white text-center">{user.name || "Unknown Warrior"}</h2>
                            <p className="text-xs text-white/40 font-mono tracking-widest uppercase">{user.reg_no || "UNR-000"}</p>
                        </>
                    )}
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">Contact Info</label>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2">
                            {isEditing ? (
                                <>
                                    <input
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 w-full text-xs outline-none focus:border-orange-500/50"
                                        placeholder="Email"
                                    />
                                    <input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 w-full text-xs outline-none focus:border-orange-500/50"
                                        placeholder="Phone"
                                    />
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">College</label>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                                {isEditing ? (
                                    <input
                                        value={formData.college}
                                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 w-full text-[10px] outline-none focus:border-orange-500/50"
                                    />
                                ) : (
                                    <div className="text-[10px] font-bold text-white uppercase truncate">{user.college || 'N/A'}</div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">Year & Branch</label>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                                {isEditing ? (
                                    <div className="flex flex-col gap-1">
                                        <select
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                            className="bg-black/40 border border-white/10 rounded-lg px-1 py-1 w-full text-[10px] outline-none"
                                        >
                                            <option value="">Year</option>
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                            <option value="3">3rd Year</option>
                                            <option value="4">4th Year</option>
                                        </select>
                                        <input
                                            value={formData.branch}
                                            onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                            className="bg-black/40 border border-white/10 rounded-lg px-1 py-1 w-full text-[10px] outline-none uppercase"
                                            placeholder="Branch"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-bold text-white">{user.year ? `${user.year}nd Year` : '??'} / {user.branch || '---'}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">T-Shirt & Role</label>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                                {isEditing ? (
                                    <>
                                        <select
                                            value={formData.tshirt_size}
                                            onChange={(e) => setFormData({ ...formData, tshirt_size: e.target.value })}
                                            className="bg-black/40 border border-white/10 rounded-lg px-1 py-1 w-full text-[10px] outline-none"
                                        >
                                            {["S", "M", "L", "XL", "XXL"].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="bg-black/40 border border-white/10 rounded-lg px-1 py-1 w-full text-[10px] outline-none"
                                        >
                                            <option value="MEMBER">MEMBER</option>
                                            <option value="LEADER">LEADER</option>
                                        </select>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-[10px] font-bold text-white uppercase text-center">{user.tshirt_size || 'M'} SIZE</div>
                                        <div className="text-[8px] font-black text-orange-500 uppercase text-center">{user.role || 'MEMBER'}</div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">Transaction</label>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                {isEditing ? (
                                    <input
                                        value={formData.transaction_id}
                                        onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 w-full text-[9px] font-mono outline-none focus:border-orange-500/50"
                                        placeholder="UTR ID"
                                    />
                                ) : (
                                    <>
                                        <div className="text-xs font-mono text-cyan-400 truncate w-full" title={user.transaction_id}>{user.transaction_id || '---'}</div>
                                        <div className="text-[9px] text-white/30 uppercase mt-0.5 font-bold italic tracking-tighter">REF CODE</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 pt-2">
                        <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest pl-1">Attendance Protocol</label>
                        <div className={`w-full p-3 rounded-xl border flex items-center justify-between ${user.is_present ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/20'}`}>
                            <span className="text-xs font-bold text-white/80">{user.is_present ? 'CHECKED IN (VENUE)' : 'NOT CHECKED IN'}</span>
                            {user.is_present ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500/50" />}
                        </div>
                    </div>

                    {isEditing && (
                        <button
                            onClick={handleBulkSave}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all"
                        >
                            <Save className="w-4 h-4" /> Save Modifications
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
