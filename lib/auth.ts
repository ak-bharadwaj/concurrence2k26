import { supabase } from "./supabase";

export async function adminLogin(username: string, password_hash: string) {
    console.log("--- LOGIN DEBUG ---");
    console.log("Username:", username);
    console.log("Password Hash:", password_hash);
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    const { data: adminData, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username.trim());

    if (error) {
        console.error("DB Query Error:", error);
        throw new Error(`Login Error: ${error.message}`);
    }

    console.log("Query Results found:", adminData?.length);
    if (adminData) {
        adminData.forEach((row, i) => {
            console.log(`Row ${i} match check:`, {
                usernameMatch: row.username === username.trim(),
                passMatch: row.password_hash === password_hash,
                activeMatch: row.active === true
            });
            console.log(`Row ${i} raw:`, row);
        });
    }

    const admin = adminData?.find(a =>
        a.username.trim() === username.trim() &&
        a.password_hash === password_hash &&
        a.active === true
    );

    if (!admin) {
        console.warn("LOGIN REJECTED: Credentials do not match any active admin record.");
        throw new Error("Invalid username or password");
    }

    console.log("LOGIN SUCCESS:", admin.username);

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
