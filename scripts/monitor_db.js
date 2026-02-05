const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fqksvcwccfuevmbrlegi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxa3N2Y3djY2Z1ZXZtYnJsZWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTgxMDYsImV4cCI6MjA4NTQ5NDEwNn0.IBD-CCJi6J48V8YlcZq9NSaBG2DIWxkPves8rm3UH9s');

console.log("=== REAL-TIME DATABASE MONITOR ===");
console.log("Watching for new users and teams...\n");

// Subscribe to new users
const userChannel = supabase
    .channel('user_monitor')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'users'
    }, (payload) => {
        const user = payload.new;
        console.log(`🚨 NEW USER CREATED:`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Team ID: ${user.team_id || 'NONE'}`);
        console.log(`   Time: ${new Date().toLocaleTimeString()}\n`);
    })
    .subscribe();

// Subscribe to new teams
const teamChannel = supabase
    .channel('team_monitor')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'teams'
    }, (payload) => {
        const team = payload.new;
        console.log(`🚨 NEW TEAM CREATED:`);
        console.log(`   Name: ${team.name}`);
        console.log(`   Code: ${team.unique_code}`);
        console.log(`   Leader ID: ${team.leader_id || 'NONE'}`);
        console.log(`   Time: ${new Date().toLocaleTimeString()}\n`);
    })
    .subscribe();

console.log("✅ Monitoring started. Try registering now...");
console.log("Press Ctrl+C to stop.\n");
