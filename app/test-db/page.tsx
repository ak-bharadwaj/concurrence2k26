"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestDBPage() {
    const [status, setStatus] = useState<any>(null);
    const [admins, setAdmins] = useState<any[]>([]);

    useEffect(() => {
        async function check() {
            try {
                const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

                const { data, error } = await supabase
                    .from("admins")
                    .select("*");

                setStatus({
                    url,
                    key_length: anonKey?.length,
                    error: error?.message || null,
                    count: data?.length || 0
                });

                if (data) setAdmins(data);
            } catch (err: any) {
                setStatus({ error: err.message });
            }
        }
        check();
    }, []);

    return (
        <div className="p-10 bg-black text-white min-h-screen font-mono">
            <h1 className="text-2xl mb-4 text-cyan-400">Database Connection Test</h1>

            <div className="bg-white/5 p-4 rounded mb-4">
                <h2 className="text-xl mb-2 underline">Status</h2>
                <pre>{JSON.stringify(status, null, 2)}</pre>
            </div>

            <div className="bg-white/5 p-4 rounded">
                <h2 className="text-xl mb-2 underline">Admins Found</h2>
                {admins.length === 0 ? (
                    <p className="text-red-400">No admins visible to Public role.</p>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="p-2 border border-white/10">Username</th>
                                <th className="p-2 border border-white/10">Pass Hash</th>
                                <th className="p-2 border border-white/10">Role</th>
                                <th className="p-2 border border-white/10">Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.map((admin, i) => (
                                <tr key={i}>
                                    <td className="p-2 border border-white/10">{admin.username}</td>
                                    <td className="p-2 border border-white/10">{admin.password_hash}</td>
                                    <td className="p-2 border border-white/10">{admin.role}</td>
                                    <td className="p-2 border border-white/10 text-cyan-300">{String(admin.active)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
