"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, HelpCircle, ChevronDown } from "lucide-react";
import { GlassNavbar } from "@/components/glass-navbar";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FAQPage() {
    const router = useRouter();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        {
            category: "Registration",
            questions: [
                {
                    q: "What is the registration fee?",
                    a: "The registration fee is ₹800 per participant. You can register as a solo participant or as part of a team (2-5 members)."
                },
                {
                    q: "Can I register as a team?",
                    a: "Yes! You can form a team of 2-5 members. One person creates the team and shares the team code with others to join."
                },
                {
                    q: "How do I join an existing team?",
                    a: "During registration, select 'Elite Squad' → 'Join Squad' → Enter the team code shared by your team leader."
                },
                {
                    q: "Can I change my team after registration?",
                    a: "Team changes are only allowed before payment approval. Contact support if you need assistance."
                }
            ]
        },
        {
            category: "Payment",
            questions: [
                {
                    q: "What payment methods are accepted?",
                    a: "We accept UPI payments. Scan the QR code provided during registration and upload the payment screenshot."
                },
                {
                    q: "How long does payment verification take?",
                    a: "Payment verification typically takes 2-24 hours. You'll receive an email once approved."
                },
                {
                    q: "What if my payment is rejected?",
                    a: "If rejected, you'll receive an email with the reason. You can re-upload a correct screenshot or contact support."
                },
                {
                    q: "Can I get a refund?",
                    a: "Refunds are processed only in case of event cancellation. Registration fees are non-refundable otherwise."
                }
            ]
        },
        {
            category: "Event Day",
            questions: [
                {
                    q: "What should I bring to the event?",
                    a: "Bring your QR code ticket (available on your dashboard after approval), valid ID, laptop, and charger."
                },
                {
                    q: "When does the event start?",
                    a: "Check the event schedule page for detailed timings. Registration typically opens 1 hour before the event."
                },
                {
                    q: "Can I attend if I'm a solo participant?",
                    a: "Yes! Solo participants will be grouped into teams at the venue based on skills and interests."
                },
                {
                    q: "Is accommodation provided?",
                    a: "Accommodation details will be shared via email to outstation participants after registration approval."
                }
            ]
        },
        {
            category: "Technical",
            questions: [
                {
                    q: "I didn't receive my QR code ticket",
                    a: "QR codes are generated only after payment approval. Check your dashboard or contact support."
                },
                {
                    q: "I forgot my login credentials",
                    a: "Use your registration number and the password you set during registration. Contact support if you need help."
                },
                {
                    q: "The website isn't working properly",
                    a: "Try clearing your browser cache or using a different browser. Contact support if the issue persists."
                },
                {
                    q: "How do I contact support?",
                    a: "Visit the Support Center from your dashboard to submit a ticket. We typically respond within 24 hours."
                }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            <GlassNavbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <button onClick={() => router.push("/")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </button>
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Frequently Asked Questions</h1>
                    <p className="text-white/60">Find answers to common questions about TechSprint 2K26</p>
                </div>

                <div className="space-y-6">
                    {faqs.map((category, catIndex) => (
                        <div key={catIndex} className="glass-card p-6">
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                <HelpCircle className="w-6 h-6 text-cyan-400" />
                                {category.category}
                            </h2>

                            <div className="space-y-3">
                                {category.questions.map((faq, qIndex) => {
                                    const index = catIndex * 100 + qIndex;
                                    const isOpen = openIndex === index;

                                    return (
                                        <div key={qIndex} className="border border-white/10 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setOpenIndex(isOpen ? null : index)}
                                                className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors text-left"
                                            >
                                                <span className="font-bold">{faq.q}</span>
                                                <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {isOpen && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-4 py-3 bg-white/[0.02] text-white/80">
                                                            {faq.a}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Still Have Questions */}
                <div className="glass-card p-6 mt-6 text-center">
                    <h3 className="text-xl font-bold mb-2">Still have questions?</h3>
                    <p className="text-white/60 mb-4">Our support team is here to help!</p>
                    <button
                        onClick={() => router.push("/support")}
                        className="px-6 py-3 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-all font-bold"
                    >
                        Contact Support
                    </button>
                </div>
            </div>
        </div>
    );
}
