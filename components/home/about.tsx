"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Globe, ExternalLink } from "lucide-react";
import { collegeInfo } from "@/lib/data";

export function About() {
  return (
    <section id="about" className="py-16 sm:py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            About <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Us</span>
          </h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm px-4 leading-relaxed">
            {collegeInfo.about}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] h-[250px] sm:h-[300px]"
          >
            <iframe
              src={collegeInfo.mapEmbed}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="College Location Map"
              className="grayscale hover:grayscale-0 transition-all duration-500"
            />
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 sm:p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Get in Touch
            </h3>

            <div className="space-y-3">
              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium text-white text-xs">Address</p>
                  <p className="text-white/40 text-[11px] leading-relaxed">
                    {collegeInfo.address}
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white text-xs">Phone</p>
                  <p className="text-white/40 text-[11px]">
                    {collegeInfo.phone}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-white text-xs">Email</p>
                  <p className="text-white/40 text-[11px]">
                    {collegeInfo.email}
                  </p>
                </div>
              </div>

              {/* Website */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium text-white text-xs">Website</p>
                  <p className="text-white/40 text-[11px]">
                    {collegeInfo.website}
                  </p>
                </div>
              </div>
            </div>

            {/* Minimalistic Button */}
            <a
              href={`https://${collegeInfo.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2 w-full py-3 mt-4 text-xs font-medium text-white/70 border border-white/10 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 hover:text-white transition-all duration-300"
            >
              Visit College Website
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
