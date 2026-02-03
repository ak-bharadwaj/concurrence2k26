
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fqksvcwccfuevmbrlegi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxa3N2Y3djY2Z1ZXZtYnJsZWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTgxMDYsImV4cCI6MjA4NTQ5NDEwNn0.IBD-CCJi6J48V8YlcZq9NSaBG2DIWxkPves8rm3UH9s');

async function checkRequests() {
    const { data, error } = await supabase.from('join_requests').select('*').limit(5);
    if (error) {
        console.error("Error fetching join_requests:", error);
    } else {
        console.log("Join requests found:", data);
    }
}

checkRequests();
