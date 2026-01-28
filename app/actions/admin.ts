"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PaymentStatus = "pending" | "verified" | "rejected";

export async function updatePaymentStatus(
  registrationId: string,
  status: PaymentStatus,
  adminNotes?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const { error } = await supabase
    .from("registrations")
    .update({
      payment_status: status,
      admin_notes: adminNotes || null,
      verified_by: user.email,
      verified_at: new Date().toISOString(),
    })
    .eq("registration_id", registrationId);

  if (error) {
    console.error("[v0] Error updating payment status:", error);
    return { success: false, message: "Failed to update status" };
  }

  revalidatePath("/admin", "max");
  return { success: true, message: `Payment ${status} successfully` };
}

export async function deleteRegistration(registrationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const { error } = await supabase
    .from("registrations")
    .delete()
    .eq("registration_id", registrationId);

  if (error) {
    console.error("[v0] Error deleting registration:", error);
    return { success: false, message: "Failed to delete registration" };
  }

  revalidatePath("/admin", "max");
  return { success: true, message: "Registration deleted successfully" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "max");
}
