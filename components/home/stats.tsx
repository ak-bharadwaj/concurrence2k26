"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Calendar, Trophy, Users, Building2 } from "lucide-react";
import { festInfo } from "@/lib/data";

const stats = [
  {
    icon: Calendar,
    value: festInfo.stats.events,
    label: "Events",
    suffix: "+",
  },
  {
    icon: Trophy,
    value: festInfo.stats.prizes,
    label: "Prize Pool",
    prefix: "Rs. ",
  },
  {
    icon: Users,
    value: festInfo.stats.participants,
    label: "Participants",
    suffix: "",
  },
  {
    icon: Building2,
    value: festInfo.stats.colleges,
    label: "Colleges",
    suffix: "",
  },
];

function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
}: {
  value: string | number;
  prefix?: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    const numericValue =
      typeof value === "string"
        ? Number.parseInt(value.replace(/[^0-9]/g, ""))
        : value;
    const duration = 2000;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, value]);

  const formattedValue =
    typeof value === "string" && value.includes(",")
      ? displayValue.toLocaleString()
      : displayValue;

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-bold gradient-text">
      {prefix}
      {formattedValue}
      {suffix}
    </div>
  );
}

export function Stats() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-blue/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/50 to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">RIPPLE 2026</span> in Numbers
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of participants from colleges across the country for
            three days of innovation, culture, and creativity.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 text-center group hover:bg-white/10 transition-colors"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-neon-cyan/20 via-neon-blue/20 to-neon-purple/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <stat.icon className="w-7 h-7 text-neon-cyan" />
              </div>
              <AnimatedCounter
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
              <p className="text-muted-foreground mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
