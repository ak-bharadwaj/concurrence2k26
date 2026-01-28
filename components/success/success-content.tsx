"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle,
  Home,
  Calendar,
  Mail,
  Phone,
  Copy,
  Check,
  IndianRupee,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { events, collegeInfo } from "@/lib/data";

interface RegistrationData {
  registrationId: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  selectedEvents: string[];
  totalFee: number;
  paymentStatus: string;
}

export function SuccessContent() {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedData = sessionStorage.getItem("registrationData");
    if (storedData) {
      setData(JSON.parse(storedData));
    }
  }, []);

  const handleCopyId = () => {
    if (data?.registrationId) {
      navigator.clipboard.writeText(data.registrationId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedEventDetails = data?.selectedEvents.map((slug) =>
    events.find((e) => e.slug === slug)
  );

  if (!data) {
    return (
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-neon-cyan/10 flex items-center justify-center"
        >
          <CheckCircle className="w-12 h-12 text-neon-cyan" />
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
          Registration Complete!
        </h1>
        <p className="text-muted-foreground mb-8">
          No registration details found. You may have refreshed the page.
        </p>
        <Button asChild className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:opacity-90 text-white border-0">
          <Link href="/">
            <Home className="mr-2 w-4 h-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Animation */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-4xl font-bold mb-4"
        >
          <span className="gradient-text">Registration Successful!</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-lg"
        >
          Thank you for registering, {data.fullName.split(" ")[0]}!
        </motion.p>
      </div>

      {/* Payment Pending Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mb-6"
      >
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-400 mb-1">
              Payment Verification Pending
            </h3>
            <p className="text-sm text-yellow-400/80">
              Your registration has been received. Our team will verify your payment
              within 24-48 hours. You will receive a confirmation once your payment
              is verified. Please keep your transaction ID handy for reference.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Registration ID Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Your Registration ID
            </p>
            <p className="text-2xl font-bold text-neon-cyan font-mono">
              {data.registrationId}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyId}
            className="border-white/20 bg-white/5 hover:bg-white/10"
          >
            {copied ? (
              <Check className="w-4 h-4 text-neon-cyan" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Save this ID for future reference. You will need it at the event
          registration desk.
        </p>
      </motion.div>

      {/* Registered Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6 mb-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-foreground">
          Registered Events
        </h2>
        <div className="space-y-3">
          {selectedEventDetails?.map((event) =>
            event ? (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-neon-cyan" />
                  <div>
                    <p className="font-medium text-foreground">{event.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.schedule.date} | {event.schedule.venue}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-neon-cyan font-medium">
                  <IndianRupee className="w-3 h-3" />
                  {event.registrationFee}
                </span>
              </div>
            ) : null
          )}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="font-medium text-foreground">Total Paid</span>
          <span className="flex items-center gap-1 text-xl font-bold text-neon-cyan">
            <IndianRupee className="w-4 h-4" />
            {data.totalFee}
          </span>
        </div>
      </motion.div>

      {/* Important Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-6 mb-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-foreground">What is Next?</h2>
        <ul className="space-y-3 text-muted-foreground">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-neon-cyan font-medium">1</span>
            </div>
            <span>
              A confirmation email has been sent to <strong>{data.email}</strong>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-neon-cyan font-medium">2</span>
            </div>
            <span>
              Arrive at the venue 30 minutes before your event starts
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neon-cyan/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-neon-cyan font-medium">3</span>
            </div>
            <span>
              Bring your college ID card and registration ID for verification
            </span>
          </li>
        </ul>
      </motion.div>

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card p-6 mb-8"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Need Help?
        </h2>
        <div className="flex flex-wrap gap-4">
          <a
            href={`mailto:${collegeInfo.email}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="w-4 h-4 text-neon-cyan" />
            {collegeInfo.email}
          </a>
          <a
            href={`tel:${collegeInfo.phone}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Phone className="w-4 h-4 text-neon-cyan" />
            {collegeInfo.phone}
          </a>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Button
          asChild
          className="flex-1 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:opacity-90 text-white border-0"
        >
          <Link href="/">
            <Home className="mr-2 w-4 h-4" />
            Back to Home
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="flex-1 border-white/20 bg-white/5 hover:bg-white/10 text-foreground"
        >
          <Link href="/events">
            <Calendar className="mr-2 w-4 h-4" />
            View All Events
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
