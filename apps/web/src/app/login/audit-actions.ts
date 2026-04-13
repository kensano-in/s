'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

export async function submitManualAuditRequest(userId: string, statement: string) {
  try {
    const supabase = await createClient();
    const head = await headers();
    const ip = head.get('x-forwarded-for') || '0.0.0.0';

    // 1. Log the initiation event
    const { error: eventError } = await supabase.from('security_events').insert({
      event_type: 'manual_audit_requested',
      severity: 'medium',
      user_id: userId,
      ip_address: ip,
      payload: { statement_length: statement.length }
    });

    if (eventError) console.error('Failed to log security event:', eventError);

    // 2. Create the audit request entry
    const { data, error } = await supabase.from('manual_audit_requests').insert({
      user_id: userId,
      statement: statement,
      ip_address: ip,
      status: 'PENDING'
    }).select().single();

    if (error) throw error;

    return { success: true, requestId: data.id };
  } catch (err: any) {
    console.error('Manual Audit Error:', err);
    return { success: false, error: err.message };
  }
}
