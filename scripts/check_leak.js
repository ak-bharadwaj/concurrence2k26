const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fqksvcwccfuevmbrlegi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxa3N2Y3djY2Z1ZXZtYnJsZWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTgxMDYsImV4cCI6MjA4NTQ5NDEwNn0.IBD-CCJi6J48V8YlcZq9NSaBG2DIWxkPves8rm3UH9s');

async function checkCurrentState() {
    console.log("=== CHECKING CURRENT DATABASE STATE ===\n");

    // Get all users created in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: recentUsers } = await supabase
        .from('users')
        .select('id, name, email, status, role, team_id, created_at')
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });

    console.log(`Users created in last 10 minutes: ${recentUsers.length}`);
    recentUsers.forEach(u => {
        console.log(`  - ${u.name}: Status=${u.status}, Role=${u.role}, Team=${u.team_id ? 'YES' : 'NO'}, Created=${u.created_at}`);
    });

    // Get all teams created in last 10 minutes
    const { data: recentTeams } = await supabase
        .from('teams')
        .select('id, name, leader_id, created_at')
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });

    console.log(`\nTeams created in last 10 minutes: ${recentTeams.length}`);
    recentTeams.forEach(t => {
        console.log(`  - ${t.name}: Leader=${t.leader_id ? 'YES' : 'NO'}, Created=${t.created_at}`);
    });

    // Check for users with PENDING/APPROVED status (should only exist AFTER payment)
    const { data: paidUsers } = await supabase
        .from('users')
        .select('id, name, status, created_at')
        .in('status', ['PENDING', 'APPROVED'])
        .gte('created_at', tenMinutesAgo);

    console.log(`\nUsers with PENDING/APPROVED status (last 10 min): ${paidUsers.length}`);
    if (paidUsers.length > 0) {
        console.log("⚠️ WARNING: These users should only exist AFTER payment!");
        paidUsers.forEach(u => {
            console.log(`  - ${u.name}: ${u.status}`);
        });
    }
}

checkCurrentState();
