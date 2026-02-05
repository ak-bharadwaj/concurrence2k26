
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

async function checkSchema() {
    let output = "Checking QR Codes Schema...\n";

    // Select * to get all columns
    const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .limit(1);

    if (error) {
        output += `Error fetching QR codes: ${JSON.stringify(error, null, 2)}\n`;
        // Try to infer from error message if possible, but usually error is generic or "column does not exist" if we selected specific columns. 
        // Since we selected "*", it should work unless table doesn't exist.
    } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        output += `Columns found: ${columns.join(', ')}\n`;
        output += `Sample Row: ${JSON.stringify(data[0], null, 2)}\n`;
    } else {
        output += "Table appears empty, cannot infer columns from data.\n";
    }

    fs.writeFileSync('debug_qr_schema_output.txt', output);
    console.log("Output written to debug_qr_schema_output.txt");
}

checkSchema();
