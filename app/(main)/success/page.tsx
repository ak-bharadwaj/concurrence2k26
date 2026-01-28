import type { Metadata } from "next";
import { SuccessContent } from "@/components/success/success-content";

export const metadata: Metadata = {
  title: "Registration Successful | RIPPLE 2026",
  description: "Your registration for RIPPLE 2026 has been successful.",
};

export default function SuccessPage() {
  return (
    <main className="min-h-screen pt-24 pb-12 flex items-center justify-center">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[200px] -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-[200px] -z-10" />

      <div className="container mx-auto px-4">
        <SuccessContent />
      </div>
    </main>
  );
}
