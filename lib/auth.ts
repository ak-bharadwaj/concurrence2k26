import { supabase } from "./supabase";

export async function adminLogin(username: string, password_hash: string) {
    console.log("Attempting Login for:", username);
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    const { data: adminData, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username)
        .limit(1);

    if (error) {
        console.error("Supabase Query Error:", error);
        throw new Error(`Login Error: ${error.message}`);
    }

    console.log("Found admins for username:", adminData?.length);

    const admin = adminData?.find(a => a.password_hash === password_hash && a.active === true);

    if (!admin) {
        if (adminData && adminData.length > 0) {
            console.warn("Admin found but password or active status mismatch.");
            console.log("Params:", { password_hash, active: true });
            console.log("Record:", adminData[0]);
        } else {
            console.warn("No admin found with username:", username);
        }
        throw new Error("Invalid username or password");
    }

    // Set session in cookies for middleware protection
    if (typeof window !== "undefined") {
        document.cookie = `admin_session=${admin.id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        localStorage.setItem("ts_admin", JSON.stringify(admin));
    }

    return admin;
}

export function getAdminSession() {
    if (typeof window !== "undefined") {
        const admin = localStorage.getItem("ts_admin");
        return admin ? JSON.parse(admin) : null;
    }
    return null;
}

export function adminLogout() {
    if (typeof window !== "undefined") {
        document.cookie = "admin_session=; path=/; max-age=0;";
        localStorage.removeItem("ts_admin");
    }
}
