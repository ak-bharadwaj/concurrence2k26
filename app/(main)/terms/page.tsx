"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Shield, AlertCircle } from "lucide-react";

export default function TermsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <button onClick={() => router.push("/")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </button>
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Terms & Conditions</h1>
                    <p className="text-white/60">Last updated: February 1, 2026</p>
                </div>

                <div className="glass-card p-6 mb-6">
                    <div className="flex items-start gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl mb-6">
                        <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-cyan-400">
                            By registering for Hackathon 2K26, you agree to these terms and conditions. Please read them carefully.
                        </p>
                    </div>

                    <div className="space-y-6 text-white/80">
                        <section>
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                1. Registration & Eligibility
                            </h2>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Participants must be currently enrolled students with a valid student ID.</li>
                                <li>Registration fee of ₹800 per participant is mandatory and non-refundable (except in case of event cancellation).</li>
                                <li>Each participant can register only once. Duplicate registrations will be rejected.</li>
                                <li>Teams must consist of 2-5 members. Solo participants will be grouped at the venue.</li>
                                <li>All team members must complete individual registration and payment.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                2. Payment & Verification
                            </h2>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Payment must be made via UPI to the provided QR code.</li>
                                <li>Upload a clear screenshot of the payment confirmation immediately after payment.</li>
                                <li>Payment verification may take up to 24 hours.</li>
                                <li>Incorrect or fraudulent payment screenshots will result in registration rejection.</li>
                                <li>Refunds are processed only if the event is cancelled by the organizers.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                3. Event Participation
                            </h2>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Participants must present their QR code ticket at the venue entrance.</li>
                                <li>Entry will be denied without a valid QR code and student ID.</li>
                                <li>Participants must adhere to the event schedule and rules.</li>
                                <li>Disruptive behavior may result in immediate disqualification without refund.</li>
                                <li>The organizers reserve the right to modify the event schedule or format if necessary.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                4. Code of Conduct
                            </h2>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Participants must maintain professional and respectful behavior.</li>
                                <li>Plagiarism or use of pre-built solutions is strictly prohibited.</li>
                                <li>All code and solutions must be original work created during the event.</li>
                                <li>Participants must not engage in any form of cheating or unfair practices.</li>
                                <li>Violation of the code of conduct will result in immediate disqualification.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-green-400" />
                                5. Privacy & Data Protection
                            </h2>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Personal information collected during registration will be used solely for event management.</li>
                                <li>We will not share your data with third parties without consent.</li>
                                <li>Event photos and videos may be used for promotional purposes.</li>
                                <li>Participants can request data deletion after the event by contacting support.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                6. Intellectual Property
                            </h2>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Participants retain ownership of their code and solutions.</li>
                                <li>By participating, you grant organizers the right to showcase your project.</li>
                                <li>Winning projects may be featured on our website and social media.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                7. Liability & Disclaimer
                            </h2>
                            <ul className="space-y-2 list-disc list-inside">
                                <li>Organizers are not responsible for personal belongings lost or damaged during the event.</li>
                                <li>Participants attend at their own risk.</li>
                                <li>Organizers are not liable for any injuries or accidents during the event.</li>
                                <li>Event cancellation or postponement decisions are at the sole discretion of organizers.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                8. Changes to Terms
                            </h2>
                            <p>
                                We reserve the right to modify these terms at any time. Participants will be notified of significant changes via email. Continued participation after changes constitutes acceptance of the new terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                9. Contact Information
                            </h2>
                            <p>
                                For questions or concerns about these terms, please contact us through the Support Center on your dashboard or email us at support@hackathon2k26.com
                            </p>
                        </section>
                    </div>
                </div>

                <div className="glass-card p-6 text-center">
                    <p className="text-white/60 mb-4">By clicking "I Agree" during registration, you acknowledge that you have read and agree to these terms.</p>
                    <button
                        onClick={() => router.push("/register")}
                        className="px-6 py-3 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-all font-bold"
                    >
                        Proceed to Registration
                    </button>
                </div>
            </div>
        </div>
    );
}
