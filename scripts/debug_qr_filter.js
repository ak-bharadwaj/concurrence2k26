
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFilter() {
    let output = "Testing .eq('active', true) filter...\n";

    const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("amount", 800)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

    if (error) {
        output += `FAILED! Error: ${JSON.stringify(error, null, 2)}\n`;
        console.error("FAILED");
    } else if (!data) {
        output += "SUCCESS but returned NULL (No match found)\n";
        console.log("NULL");
    } else {
        output += `SUCCESS! Found matched QR: ${data.id}\n`;
        output += JSON.stringify(data, null, 2);
        console.log("SUCCESS");
    }

    fs.writeFileSync('debug_qr_filter_result.txt', output);
}

testFilter();
