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
      <div className="absolute top-1/2 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/5 rounded-full blur-[120px] -z-10" />

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
          <p className="text-white/50 max-w-md mx-auto text-sm sm:text-base px-4">
            Two days packed with exciting events and competitions
          </p>
        </motion.div>

        {/* Schedule Cards */}
        <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
          {schedule.map((day, dayIndex) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: dayIndex * 0.1 }}
              className="overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              {/* Day Header */}
              <button
                onClick={() =>
                  setExpandedDay(expandedDay === dayIndex ? -1 : dayIndex)
                }
                className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-white/5 transition-colors duration-200"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {day.day}
                    </h3>
                    <p className="text-white/50 text-xs sm:text-sm">{day.date}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedDay === dayIndex ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-white/50" />
                </motion.div>
              </button>

              {/* Events List */}
              <AnimatePresence>
                {expandedDay === dayIndex && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2">
                      {day.events.map((event, eventIndex) => (
                        <motion.div
                          key={event.event}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: eventIndex * 0.05 }}
                          className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200"
                        >
                          <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-medium text-white text-sm sm:text-base leading-tight">
                              {event.event}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {event.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
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
