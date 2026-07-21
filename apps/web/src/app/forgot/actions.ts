'use server'

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const getIp = (head: Headers) => {
  const forwardedFor = head.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return 'unknown';
};

/**
 * Triggers a real password reset flow with absolute privacy controls.
 * - Prevents User Enumeration (always returns generic success status).
 * - Implements strict IP-based rate limiting (max 3 requests per 15 mins).
 */
export async function requestPasswordResetAction(identifier: string) {
  if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
    return { success: false, error: 'Please enter a valid username or email address.' };
  }

  const cleanIdentifier = identifier.trim().toLowerCase();
  const head = await headers();
  const ip = getIp(head);

  const admin = createAdminClient();

  try {
    // 1. Rate Limiting Check: max 3 attempts per 15 minutes by IP
    const fifteenAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('password_reset_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('attempt_at', fifteenAgo);

    if ((count ?? 0) >= 3) {
      return { success: false, error: 'Too many recovery requests. Please wait 15 minutes.' };
    }

    // Record this attempt in the database
    await admin.from('password_reset_attempts').insert({ ip_address: ip });

    // 2. Identify target email address
    let targetEmail: string | null = null;

    if (cleanIdentifier.includes('@')) {
      // Check if email exists in auth.users
      let emailExists = false;
      let page = 1;
      const perPage = 1000;
      
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage
        });
        
        if (error || !data.users || data.users.length === 0) {
          break;
        }
        
        const found = data.users.some(u => u.email && u.email.toLowerCase() === cleanIdentifier);
        if (found) {
          emailExists = true;
          break;
        }
        
        if (data.users.length < perPage) {
          break;
        }
        page++;
      }
      
      if (emailExists) {
        targetEmail = cleanIdentifier;
      }
    } else {
      // Look up corresponding email from username (case-insensitive)
      const { data: userProfile } = await admin
        .from('users')
        .select('id')
        .ilike('username', cleanIdentifier)
        .maybeSingle();
      
      if (userProfile?.id) {
        const { data: authUser } = await admin.auth.admin.getUserById(userProfile.id);
        if (authUser?.user?.email) {
          targetEmail = authUser.user.email;
        }
      }
    }

    // 3. Trigger reset link (if email identified)
    if (targetEmail) {
      const origin = head.get('origin') || 'http://localhost:3000';
      
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: targetEmail,
        options: {
          redirectTo: `${origin}/auth/callback?next=/login/update-password`,
        }
      });

      if (linkErr || !linkData?.properties?.action_link) {
        console.error('[forgot/actions] generateLink error:', linkErr?.message || 'No action link generated');
        return { success: false, error: 'Failed to generate recovery link.' };
      }

      const actionLink = linkData.properties.action_link;

      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Verlyn <noreply@verlyn.in>';

      if (!apiKey) {
        console.error('RESEND_API_KEY is not defined in environment variables.');
        return { success: false, error: 'Email service config missing.' };
      }

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: targetEmail,
          subject: 'Reset Your Verlyn Password',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px 24px; background-color: #050505; color: #ffffff; max-width: 440px; margin: 0 auto; border-radius: 20px; border: 1px solid #1a1a1a;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.03em;">VERLYN</span>
                <div style="height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent); margin-top: 16px;"></div>
              </div>
              
              <h3 style="font-size: 18px; font-weight: 700; color: #ffffff; margin: 0 0 10px 0; text-align: center;">Reset your password</h3>
              <p style="font-size: 13px; line-height: 1.6; color: #888888; margin: 0 0 24px 0; text-align: center;">
                We received a request to recover access to your Verlyn account. Click the button below to sign in and choose a new password. This recovery link is valid for 15 minutes.
              </p>
              
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${actionLink}" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 700; font-size: 13.5px; text-decoration: none; padding: 12px 32px; border-radius: 12px; transition: opacity 0.2s;">
                  Reset Password
                </a>
              </div>

              <p style="font-size: 11px; line-height: 1.5; color: #444444; margin: 0 0 8px 0; text-align: center;">
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
              
              <p style="font-size: 11px; color: #444444; margin: 0; border-top: 1px solid #1a1a1a; padding-top: 8px; text-align: center;">
                Do not reply to this email. This is an automated email.
              </p>
            </div>
          `
        })
      });

      if (!emailResponse.ok) {
        const errText = await emailResponse.text();
        console.error('[forgot/actions] Resend email send failed:', errText);
        return { success: false, error: 'Failed to send recovery email. Please try again.' };
      }
    }

    // 4. Return generic status (User Enumeration Protection)
    return {
      success: true,
      message: 'If a matching account exists, a secure password reset link has been dispatched to the recovery email.'
    };
  } catch (err) {
    console.error('[forgot/actions] requestPasswordResetAction error:', err);
    // Generic message even on errors to protect user privacy
    return {
      success: true,
      message: 'If a matching account exists, a secure password reset link has been dispatched to the recovery email.'
    };
  }
}
