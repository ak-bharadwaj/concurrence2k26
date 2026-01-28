"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, ChevronDown } from "lucide-react";
import { schedule } from "@/lib/data";
import { cn } from "@/lib/utils";

export function ScheduleSection() {
  const [expandedDay, setExpandedDay] = useState<number>(0);

  return (
    <section id="schedule" className="py-16 sm:py-20 relative overflow-hidden">
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
            Event <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Schedule</span>
          </h2>
          <p className="text-white/40 max-w-md mx-auto text-sm px-4">
            Two days of exciting events and competitions
          </p>
        </motion.div>

        {/* Schedule Cards */}
        <div className="max-w-2xl mx-auto space-y-3">
          {schedule.map((day, dayIndex) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: dayIndex * 0.1 }}
              className="overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              {/* Day Header */}
              <button
                onClick={() =>
                  setExpandedDay(expandedDay === dayIndex ? -1 : dayIndex)
                }
                className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border",
                    expandedDay === dayIndex
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-white/[0.02] border-white/[0.06]"
                  )}>
                    <Calendar className={cn(
                      "w-4 h-4",
                      expandedDay === dayIndex ? "text-cyan-400" : "text-white/40"
                    )} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-white">
                      {day.day}
                    </h3>
                    <p className="text-white/40 text-xs">{day.date}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedDay === dayIndex ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </motion.div>
              </button>

              {/* Events List */}
              <AnimatePresence>
                {expandedDay === dayIndex && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {day.events.map((event, eventIndex) => (
                        <motion.div
                          key={event.event}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: eventIndex * 0.03 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-200"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-medium text-white text-xs leading-tight">
                              {event.event}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/30">
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {event.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" />
                                {event.venue}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
