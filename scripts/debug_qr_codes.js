
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

async function checkQRCodes() {
    let output = "Checking QR Codes table...\n";

    // 1. Check Structure (implicitly by selecting) and Data
    const { data, error } = await supabase
        .from("qr_codes")
        .select("*");

    if (error) {
        output += `Error fetching QR codes: ${JSON.stringify(error, null, 2)}\n`;
        fs.writeFileSync('debug_qr_output.txt', output);
        return;
    }

    output += `Total QR Codes found: ${data.length}\n`;

    if (data.length === 0) {
        output += "WARNING: Table is empty!\n";
    } else {
        // Group by amount and active status
        const summary = data.reduce((acc, qr) => {
            const key = `${qr.amount} - ${qr.active ? 'Active' : 'Inactive'}`;
            if (!acc[key]) acc[key] = 0;
            acc[key]++;
            return acc;
        }, {});

        output += `Breakdown: ${JSON.stringify(summary, null, 2)}\n`;

        // Show sample of first active one
        const sample = data.find(q => q.active);
        if (sample) {
            output += `Sample Active QR: ${JSON.stringify(sample, null, 2)}\n`;
        } else {
            output += "WARNING: No active QR codes found!\n";
        }
    }

    fs.writeFileSync('debug_qr_output.txt', output);
    console.log("Output written to debug_qr_output.txt");
}

checkQRCodes();
