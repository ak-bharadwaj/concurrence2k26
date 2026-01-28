"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Globe, ExternalLink } from "lucide-react";
import { collegeInfo } from "@/lib/data";
import { Button } from "@/components/ui/button";

export function About() {
  return (
    <section id="about" className="py-16 sm:py-20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-purple-500/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-[120px] -z-10" />

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
          <p className="text-white/50 max-w-2xl mx-auto text-sm sm:text-base px-4 leading-relaxed">
            {collegeInfo.about}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 h-[280px] sm:h-[350px] lg:h-[400px]"
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
            className="rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-5"
          >
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Get in Touch
            </h3>

            <div className="space-y-3 sm:space-y-4">
              {/* Address */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm sm:text-base">Address</p>
                  <p className="text-white/50 text-xs sm:text-sm">
                    {collegeInfo.address}
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm sm:text-base">Phone</p>
                  <p className="text-white/50 text-xs sm:text-sm">
                    {collegeInfo.phone}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm sm:text-base">Email</p>
                  <p className="text-white/50 text-xs sm:text-sm">
                    {collegeInfo.email}
                  </p>
                </div>
              </div>

              {/* Website */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium text-white text-sm sm:text-base">Website</p>
                  <p className="text-white/50 text-xs sm:text-sm">
                    {collegeInfo.website}
                  </p>
                </div>
              </div>
            </div>

            <Button
              asChild
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white border-0 rounded-xl py-5 sm:py-6 font-semibold shadow-lg shadow-cyan-500/20"
            >
              <a
                href={`https://${collegeInfo.website}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit College Website
                <ExternalLink className="ml-2 w-4 h-4" />
              </a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
