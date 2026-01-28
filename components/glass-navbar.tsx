"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/events", label: "Events" },
    { href: "/#schedule", label: "Schedule" },
    { href: "/#about", label: "About" },
];

export function GlassNavbar() {
    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl"
        >
            <nav className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center"
                    >
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
                    </motion.div>
                    <span
                        className="text-sm sm:text-base font-semibold text-white/90 tracking-wide"
                        style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
                    >
                        RIPPLE
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="flex items-center gap-1 sm:gap-2">
                    {navLinks.slice(1).map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-white/60 hover:text-white transition-colors duration-200 rounded-full hover:bg-white/[0.05]"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </nav>
        </motion.header>
    );
}
