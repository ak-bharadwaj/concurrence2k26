
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllQRCodes() {
    const { data, error } = await supabase.from("qr_codes").select("*");
    if (error) {
        console.error(error);
        return;
    }
    fs.writeFileSync('all_qr_data.json', JSON.stringify(data, null, 2));
    console.log("All QR data written to all_qr_data.json");
}

checkAllQRCodes();
