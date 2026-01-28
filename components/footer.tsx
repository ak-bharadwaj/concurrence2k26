import Link from "next/link";
import { Sparkles, Instagram, Twitter, Facebook, Linkedin, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { collegeInfo, festInfo } from "@/lib/data";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/#schedule", label: "Schedule" },
  { href: "/#about", label: "About" },
];

const socialIcons = [
  { href: collegeInfo.social.instagram, icon: Instagram, label: "Instagram" },
  { href: collegeInfo.social.twitter, icon: Twitter, label: "Twitter" },
  { href: collegeInfo.social.facebook, icon: Facebook, label: "Facebook" },
  { href: collegeInfo.social.linkedin, icon: Linkedin, label: "LinkedIn" },
  { href: collegeInfo.social.youtube, icon: Youtube, label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"
                style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
              >
                RIPPLE
              </span>
            </Link>
            <p className="text-white/40 text-xs sm:text-sm leading-relaxed">
              {festInfo.tagline}
            </p>
            <p className="text-white/30 text-xs">
              {festInfo.dates.start} - {festInfo.dates.end}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/40 hover:text-cyan-400 transition-colors text-xs sm:text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-xs text-white/40">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-cyan-400" />
                <span className="leading-relaxed">{collegeInfo.address}</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-white/40">
                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
                <span>{collegeInfo.phone}</span>
              </li>
              <li className="flex items-center gap-2 text-xs text-white/40">
                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
                <span>{collegeInfo.email}</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-4">Follow Us</h3>
            <div className="flex flex-wrap gap-2">
              {socialIcons.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500/30 transition-all duration-200 group"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4 text-white/40 group-hover:text-cyan-400 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-center">
          <p className="text-xs text-white/30">
            © 2026 {festInfo.name}. All rights reserved.
          </p>
          <p className="text-xs text-white/30">
            {collegeInfo.shortName}
          </p>
        </div>
      </div>
    </footer>
  );
}
