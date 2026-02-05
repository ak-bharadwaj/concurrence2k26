const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 🔍 ZERO-LEAK DIAGNOSTIC MONITOR ===");
console.log("Watching for premature writes in 'users' and 'teams'...");
console.log("-------------------------------------------------------");

// 1. Monitor Users
supabase
    .channel('users_leak_check')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
        const u = payload.new;
        const isLeak = (u.status === 'UNPAID' || u.status === 'PENDING') && u.role !== 'MEMBER';
        // Note: SQUAD JOINERS (MEMBER role) are allowed early as UNPAID.

        if (isLeak) {
            console.log(`\n🚨 LEAK DETECTED! [users]`);
            console.log(`   Name: ${u.name}`);
            console.log(`   Email: ${u.email}`);
            console.log(`   Status: ${u.status}`);
            console.log(`   Role: ${u.role}`);
            console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
        } else {
            console.log(`\n✅ Valid Write: [users] ${u.name} (${u.role}/${u.status})`);
        }
    })
    .subscribe();

// 2. Monitor Teams
supabase
    .channel('teams_leak_check')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'teams' }, (payload) => {
        const t = payload.new;
        console.log(`\n🚨 DATA POINT: [teams] New Team '${t.name}' created!`);
        console.log(`   Code: ${t.unique_code}`);
        console.log(`   Leader: ${t.leader_id || 'NONE'}`);
        console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
        console.log(`   ⚠️ This should ONLY happen AFTER payment submission.`);
    })
    .subscribe();

console.log("\nREADY. Please perform your registration steps now.");
console.log("Press Ctrl+C to stop.\n");
