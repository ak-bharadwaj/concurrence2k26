"use client";

import React from "react"

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Calendar,
  CreditCard,
  CheckCircle,
  IndianRupee,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { events, categories } from "@/lib/data";
import { registerForEvents, type RegistrationData } from "@/app/actions/register";
import { cn } from "@/lib/utils";

const departments = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Electrical",
  "Mechanical",
  "Civil",
  "Chemical",
  "Biotechnology",
  "Other",
];

const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

const categoryColors: Record<string, string> = {
  technical: "from-blue-500 to-cyan-500",
  cultural: "from-purple-500 to-pink-500",
  workshops: "from-green-500 to-emerald-500",
  gaming: "from-orange-500 to-red-500",
};

export function RegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedEvent = searchParams.get("event");
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<RegistrationData>({
    fullName: "",
    email: "",
    phone: "",
    college: "",
    department: "",
    year: "",
    selectedEvents: preSelectedEvent ? [preSelectedEvent] : [],
    transactionId: "",
    agreedToTerms: false,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preSelectedEvent && !formData.selectedEvents.includes(preSelectedEvent)) {
      setFormData((prev) => ({
        ...prev,
        selectedEvents: [preSelectedEvent],
      }));
    }
  }, [preSelectedEvent, formData.selectedEvents]);

  const totalFee = formData.selectedEvents.reduce((sum, slug) => {
    const event = events.find((e) => e.slug === slug);
    return sum + (event?.registrationFee || 0);
  }, 0);

  const handleEventToggle = (slug: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedEvents: prev.selectedEvents.includes(slug)
        ? prev.selectedEvents.filter((e) => e !== slug)
        : [...prev.selectedEvents, slug],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await registerForEvents(formData);

      if (result.success) {
        // Store registration data in sessionStorage for success page
        sessionStorage.setItem(
          "registrationData",
          JSON.stringify({
            registrationId: result.registrationId,
            ...result.data,
          })
        );
        router.push("/success");
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 space-y-6"
      >
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-neon-cyan" />
          Personal Information
        </h2>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="pl-10 bg-white/5 border-white/10 h-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="pl-10 bg-white/5 border-white/10 h-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="pl-10 bg-white/5 border-white/10 h-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="college">College Name</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="college"
                placeholder="Enter your college name"
                value={formData.college}
                onChange={(e) =>
                  setFormData({ ...formData, college: e.target.value })
                }
                className="pl-10 bg-white/5 border-white/10 h-12"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) =>
                  setFormData({ ...formData, department: value })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={formData.year}
                onValueChange={(value) => setFormData({ ...formData, year: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 h-12">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Event Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 space-y-6"
      >
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-neon-cyan" />
          Select Events
        </h2>
        <p className="text-muted-foreground text-sm">
          Choose one or more events you want to participate in.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const isSelected = formData.selectedEvents.includes(event.slug);
            const category = categories.find((c) => c.id === event.category);

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => handleEventToggle(event.slug)}
                className={cn(
                  "p-4 rounded-xl text-left transition-all duration-300 border",
                  isSelected
                    ? "bg-white/10 border-neon-cyan"
                    : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r text-white",
                      categoryColors[event.category]
                    )}
                  >
                    {category?.name}
                  </span>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-neon-cyan border-neon-cyan"
                        : "border-white/30"
                    )}
                  >
                    {isSelected && (
                      <CheckCircle className="w-3 h-3 text-background" />
                    )}
                  </div>
                </div>
                <h3 className="font-medium text-foreground mb-1">{event.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {event.shortDescription}
                </p>
                <div className="flex items-center gap-1 mt-2 text-neon-cyan font-medium text-sm">
                  <IndianRupee className="w-3 h-3" />
                  {event.registrationFee}
                </div>
              </button>
            );
          })}
        </div>

        {formData.selectedEvents.length > 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30">
            <span className="text-foreground font-medium">
              {formData.selectedEvents.length} event(s) selected
            </span>
            <span className="flex items-center gap-1 text-xl font-bold text-neon-cyan">
              Total: <IndianRupee className="w-4 h-4" />
              {totalFee}
            </span>
          </div>
        )}
      </motion.div>

      {/* Payment Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 space-y-6"
      >
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-neon-cyan" />
          Payment Details
        </h2>

        {/* Important Notice */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-400 mb-1">
                Payment Verification Process
              </h4>
              <p className="text-sm text-blue-400/80">
                After you submit, our team will manually verify your payment against
                the transaction ID and amount. Your registration will be confirmed
                only after successful verification (within 24-48 hours).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Scan the QR code below to make payment via UPI
            </p>
            <div className="w-48 h-48 mx-auto bg-white rounded-xl p-2">
              <div className="w-full h-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground text-sm p-4">
                  <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/50 rounded-lg flex items-center justify-center mb-2">
                    UPI QR Code
                  </div>
                  <p className="text-xs">ripple2026@upi</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                <span
                  key={app}
                  className="px-3 py-1 text-xs bg-white/5 rounded-full text-muted-foreground"
                >
                  {app}
                </span>
              ))}
            </div>
          </div>

          {/* Amount to Pay */}
          {totalFee > 0 && (
            <div className="p-4 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-center">
              <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
              <p className="text-3xl font-bold text-neon-cyan flex items-center justify-center">
                <IndianRupee className="w-6 h-6" />
                {totalFee}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Pay exact amount for faster verification
              </p>
            </div>
          )}

          {/* Payment Instructions */}
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <h4 className="font-medium text-yellow-500 mb-2">
              Payment Instructions
            </h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Scan the QR code or use UPI ID: <span className="font-mono text-foreground">ripple2026@upi</span></li>
              <li>Pay <strong className="text-neon-cyan">Rs. {totalFee > 0 ? totalFee : "___"}</strong> (exact amount)</li>
              <li>Screenshot or note the 12-digit UTR/Transaction ID</li>
              <li>Enter the transaction ID below</li>
            </ol>
          </div>

          {/* Transaction ID Input */}
          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID / UTR Number</Label>
            <Input
              id="transactionId"
              placeholder="Enter 12-digit transaction ID"
              value={formData.transactionId}
              onChange={(e) =>
                setFormData({ ...formData, transactionId: e.target.value })
              }
              className="bg-white/5 border-white/10 h-12 font-mono"
              required
            />
            <p className="text-xs text-muted-foreground">
              You can find this in your UPI app payment history
            </p>
          </div>
        </div>
      </motion.div>

      {/* Terms & Submit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={formData.agreedToTerms}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, agreedToTerms: checked === true })
            }
            className="mt-1"
          />
          <Label htmlFor="terms" className="text-sm text-muted-foreground">
            I confirm that all the information provided is correct and I agree to
            the terms and conditions of RIPPLE 2026. I understand that the
            registration fee is non-refundable.
          </Label>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending || formData.selectedEvents.length === 0}
          className="w-full bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:opacity-90 text-white border-0 h-12 text-lg"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Complete Registration
              <IndianRupee className="ml-2 w-4 h-4" />
              {totalFee}
            </>
          )}
        </Button>
      </motion.div>
    </form>
  );
}
