import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// API Route to reset QR usage counters
// Call this daily via Vercel Cron or external scheduler
// Add to vercel.json: { "crons": [{ "path": "/api/cron/reset-qr", "schedule": "0 0 * * *" }] }

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Reset all active QR codes
        const { error } = await supabase
            .from('qr_codes')
            .update({ today_usage: 0 })
            .eq('active', true);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'QR usage counters reset successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('QR reset error:', error);
        return NextResponse.json({
            error: error.message || 'Reset failed'
        }, { status: 500 });
    }
}
