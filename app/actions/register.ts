"use server";

import { createClient } from "@/lib/supabase/server";
import { events } from "@/lib/data";

export interface RegistrationData {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  selectedEvents: string[];
  transactionId: string;
  agreedToTerms: boolean;
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  registrationId?: string;
  data?: RegistrationData & { totalFee: number; paymentStatus: string };
}

function generateRegistrationId(): string {
  return `RIPPLE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

export async function registerForEvents(
  data: RegistrationData
): Promise<RegistrationResult> {
  const supabase = await createClient();

  // Validation
  if (!data.fullName || data.fullName.trim().length < 2) {
    return {
      success: false,
      message: "Please enter a valid full name",
    };
  }

  if (!validateEmail(data.email)) {
    return {
      success: false,
      message: "Please enter a valid email address",
    };
  }

  if (!validatePhone(data.phone)) {
    return {
      success: false,
      message: "Please enter a valid 10-digit phone number",
    };
  }

  if (!data.college || data.college.trim().length < 2) {
    return {
      success: false,
      message: "Please enter your college name",
    };
  }

  if (!data.department) {
    return {
      success: false,
      message: "Please select your department",
    };
  }

  if (!data.year) {
    return {
      success: false,
      message: "Please select your year of study",
    };
  }

  if (!data.selectedEvents || data.selectedEvents.length === 0) {
    return {
      success: false,
      message: "Please select at least one event",
    };
  }

  if (!data.transactionId || data.transactionId.trim().length < 6) {
    return {
      success: false,
      message: "Please enter a valid transaction ID (min 6 characters)",
    };
  }

  if (!data.agreedToTerms) {
    return {
      success: false,
      message: "Please agree to the terms and conditions",
    };
  }

  // Check for duplicate registration (same email + event combo)
  const { data: existingRegs } = await supabase
    .from("registrations")
    .select("selected_events")
    .eq("email", data.email);

  if (existingRegs && existingRegs.length > 0) {
    const allRegisteredEvents = existingRegs.flatMap(
      (reg) => reg.selected_events as string[]
    );
    const duplicateEvents = data.selectedEvents.filter((slug) =>
      allRegisteredEvents.includes(slug)
    );

    if (duplicateEvents.length > 0) {
      const duplicatedEventNames = duplicateEvents
        .map((slug) => events.find((event) => event.slug === slug)?.name)
        .join(", ");

      return {
        success: false,
        message: `You have already registered for: ${duplicatedEventNames}`,
      };
    }
  }

  // Calculate total fee
  const totalFee = data.selectedEvents.reduce((sum, slug) => {
    const event = events.find((e) => e.slug === slug);
    return sum + (event?.registrationFee || 0);
  }, 0);

  // Generate registration ID
  const registrationId = generateRegistrationId();

  // Insert into Supabase with PENDING payment status
  const { error } = await supabase.from("registrations").insert({
    registration_id: registrationId,
    full_name: data.fullName.trim(),
    email: data.email.toLowerCase().trim(),
    phone: data.phone.replace(/\s/g, ""),
    college: data.college.trim(),
    department: data.department,
    year_of_study: data.year,
    selected_events: data.selectedEvents,
    transaction_id: data.transactionId.trim(),
    total_fee: totalFee,
    payment_status: "pending", // Always start as pending - admin must verify
  });

  if (error) {
    return {
      success: false,
      message: "Registration failed. Please try again later.",
    };
  }

  return {
    success: true,
    message:
      "Registration submitted! Your payment is pending verification. You will receive confirmation once verified.",
    registrationId,
    data: {
      ...data,
      totalFee,
      paymentStatus: "pending",
    },
  };
}
