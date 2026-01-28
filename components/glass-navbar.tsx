"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const navLinks = [
    { href: "/events", label: "Events" },
    { href: "/#schedule", label: "Schedule" },
    { href: "/#about", label: "About" },
];

export function GlassNavbar() {
    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl"
        >
            <nav className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
                    <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.4 }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center"
                    >
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                    </motion.div>
                    <span
                        className="text-xs sm:text-sm font-semibold text-white/90 tracking-wide"
                        style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
                    >
                        RIPPLE
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="flex items-center">
                    {navLinks.map((link, index) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs text-white/50 hover:text-white transition-colors duration-200 rounded-full hover:bg-white/[0.04] ${index === navLinks.length - 1 ? "" : ""
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </nav>
        </motion.header>
    );
}
