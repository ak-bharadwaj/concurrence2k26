"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Instagram, Twitter, Linkedin, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { collegeInfo, techSprintInfo, socialLinks } from "@/lib/data";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/support", label: "Support" },
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "Terms" },
];

const socialIcons = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

export function Footer() {
  const devs = [
    { name: "Akshith Bharadwaj ", email: "dornipaduakshith@gmail.com", linkedin: "https://linkedin.com/in/akshith-bharadwaj", github: "https://github.com/ak-bharadwaj" },
    { name: "Dheeraj Gowd", email: "dheerajgowd777@gmail.com", linkedin: "https://linkedin.com/in/yaramala-dheeraj-gowd", github: "https://github.com/dheerajgowd-18" },
  ];

  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
          {/* Brand Section */}
          <div className="flex flex-col items-center lg:items-start space-y-4 max-w-sm text-center lg:text-left">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center p-2 group transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5">
                <Image
                  src="/college-logo.png"
                  alt="Hackathon Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div>
                <span
                  className="block text-xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tighter"
                  style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
                >
                  HACKATHON
                </span>
                <span className="text-xs font-bold text-white/30 tracking-[0.2em] uppercase">2K26 Edition</span>
              </div>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed font-medium">
              {techSprintInfo.tagline}
            </p>
            <p className="text-white/20 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
              <MapPin className="w-3 h-3 text-cyan-400" /> {collegeInfo.shortName}, Nandyal
            </p>
          </div>

          {/* Developers Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="hidden sm:block h-12 w-px bg-white/10 mx-4" />
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              {devs.map((dev) => (
                <div
                  key={dev.name}
                  className="flex flex-col p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-cyan-500/50 hover:bg-cyan-500/[0.02] transition-all duration-500 group min-w-[200px]"
                >
                  <span className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1 group-hover:text-cyan-500/50 transition-colors">Developer</span>
                  <span className="text-white text-lg font-black tracking-tight mb-4 group-hover:text-cyan-400 transition-colors">{dev.name}</span>

                  <div className="flex items-center gap-3 mt-auto">
                    <a href={`mailto:${dev.email}`} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all border border-white/5 hover:border-cyan-500/30">
                      <Mail className="w-4 h-4" />
                    </a>
                    <a href={dev.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-all border border-white/5 hover:border-blue-500/30">
                      <Linkedin className="w-4 h-4" />
                    </a>
                    <a href={dev.github} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5 hover:border-white/20">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
            <p>© 2026 Hackathon • {collegeInfo.name}</p>
            <span className="hidden sm:block h-3 w-px bg-white/10" />
            <p className="text-cyan-500/40">{collegeInfo.department}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
