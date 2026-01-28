"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    IconHome,
    IconCalendarEvent,
    IconClipboardList,
    IconInfoCircle,
} from "@tabler/icons-react";

const navLinks = [
    {
        title: "Home",
        icon: IconHome,
        href: "/",
    },
    {
        title: "Events",
        icon: IconCalendarEvent,
        href: "/events",
    },
    {
        title: "Schedule",
        icon: IconClipboardList,
        href: "/#schedule",
    },
    {
        title: "About",
        icon: IconInfoCircle,
        href: "/#about",
    },
];

export function FloatingNav() {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
            <nav className="flex items-center gap-2 px-4 py-3 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl shadow-cyan-500/20">
                {navLinks.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <motion.div
                            key={item.href}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1 + index * 0.1 }}
                        >
                            <Link
                                href={item.href}
                                className="group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 hover:bg-white/10 active:scale-95"
                            >
                                <Icon className="w-5 h-5 text-neutral-400 group-hover:text-cyan-400 transition-colors duration-300" />

                                {/* Tooltip */}
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                    {item.title}
                                </span>
                            </Link>
                        </motion.div>
                    );
                })}
            </nav>
        </motion.div>
    );
}
