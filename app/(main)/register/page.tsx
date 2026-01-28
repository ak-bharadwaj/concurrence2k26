import type { Metadata } from "next";
import { Suspense } from "react";
import { RegistrationForm } from "@/components/register/registration-form";

export const metadata: Metadata = {
  title: "Register | RIPPLE 2026",
  description:
    "Register for RIPPLE 2026 events. Choose from technical, cultural, workshops, and gaming events. Quick and easy registration with UPI payment.",
};

function RegistrationFormFallback() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="h-8 bg-white/10 rounded w-1/3 mb-6" />
      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-1/4" />
            <div className="h-10 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen pt-24 pb-12">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-[200px] -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[200px] -z-10" />

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Register</span> for RIPPLE 2026
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Fill in your details and select the events you want to participate
            in. You can register for multiple events at once.
          </p>
        </div>

        {/* Form */}
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={<RegistrationFormFallback />}>
            <RegistrationForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
