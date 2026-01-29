import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Users, Clock, Trophy } from "lucide-react";

export const metadata: Metadata = {
  title: "Register | TechSprint 2K26",
  description:
    "Register your team for TechSprint 2K26 hackathon. Form a team of 3-5 members and compete in IdeateX and CodeJam for a chance to win an internship!",
};

// TODO: Replace this with your actual Google Form URL
const GOOGLE_FORM_URL = "https://forms.google.com/your-form-url";

export default function RegisterPage() {
  return (
    <main className="min-h-screen pt-24 pb-12">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[200px] -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[200px] -z-10" />

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Register for{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              TechSprint 2K26
            </span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Form your team of 3-5 members and compete in IdeateX and CodeJam for a chance to win an internship!
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <span className="px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium">
              💡 IdeateX — Pitch Phase
            </span>
            <span className="px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium">
              {"</>"} CodeJam — 24hr Coding
            </span>
            <span className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
              🎯 Win an Internship
            </span>
          </div>
        </div>

        {/* Registration Card */}
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-8 text-center space-y-8">
            <h2 className="text-2xl font-semibold text-white">
              Ready to Participate?
            </h2>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                <p className="text-white font-medium">Team Size</p>
                <p className="text-white/50 text-sm">3-5 Members</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-white font-medium">Duration</p>
                <p className="text-white/50 text-sm">24 Hours</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-white font-medium">Prize</p>
                <p className="text-white/50 text-sm">Internship + Cash</p>
              </div>
            </div>

            {/* Register Button */}
            <a
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full hover:from-cyan-400 hover:to-purple-400 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105"
            >
              Register via Google Form
              <ExternalLink className="w-5 h-5" />
            </a>

            <p className="text-white/40 text-sm">
              You will be redirected to Google Forms to complete your registration.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
