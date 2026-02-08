
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using Anon key as client would

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateTeam() {
    console.log("Attempting to create a test team...");
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Attempt with basic fields first
    const { data, error } = await supabase
        .from("teams")
        .insert([{
            name: "Debug Team " + Date.now(),
            unique_code: code,
            payment_mode: "BULK",
            max_members: 4,
            status: "PENDING"
            // omitted leader_id for now to test basic insert, or use a dummy UUID if needed
        }])
        .select()
        .single();

    if (error) {
        console.error("FAILED to create team:");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS! Team created:", data);
        // Clean up
        await supabase.from("teams").delete().eq("id", data.id);
        console.log("Cleaned up test team.");
    }
}

testCreateTeam();
