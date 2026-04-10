'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return redirect(`/login?message=Could not authenticate user: ${error.message}`)
  }

  revalidatePath('/feed', 'layout')
  redirect('/feed')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string
  const gender = (formData.get('gender') as string) || 'other'

  if (!email || !password || !username) {
    return redirect('/login?message=Email, Username, and Password are required.')
  }

  // Server-side Tier 1 namespace guard (PUBLIC accounts)
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (cleanUsername.length < 5) {
    return redirect('/login?message=Username must be at least 5 characters.')
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

  if (authError) {
    return redirect(`/login?message=Could not sign up user: ${authError.message}`)
  }

  if (authData.user) {
    const avatars = {
      male: [
        'https://i.pinimg.com/736x/07/26/6c/07266c2fe4d3fa13f412435dc74d8ff2.jpg',
        'https://i.pinimg.com/736x/87/18/d3/8718d35fcca245b78f4a1387d853b0ed.jpg',
        'https://i.pinimg.com/736x/8d/4e/02/8d4e02931aabd59fc3ba4feff2031fe1.jpg',
      ],
      female: [
        'https://i.pinimg.com/736x/d4/d6/3e/d4d63e9c5ed55ed4eb2d1f6cf146bb12.jpg',
        'https://i.pinimg.com/736x/bb/8a/65/bb8a65ba48bbdecd150cb2a477ce0691.jpg',
        'https://i.pinimg.com/736x/af/c1/0c/afc10c144ef24deab4a54ed38af3c75d.jpg',
      ],
      other: [
        'https://i.pinimg.com/736x/77/b6/2a/77b62afcb91de0ba3d00cdcb7b827e8a.jpg',
        'https://i.pinimg.com/736x/60/0a/63/600a63edb7aebd318fcc1dfb61b2ed0c.jpg',
      ]
    };
    const group = avatars[gender as keyof typeof avatars] || avatars.other;
    const selectedAvatar = group[Math.floor(Math.random() * group.length)];

    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      username: cleanUsername,
      display_name: username,
      avatar_url: selectedAvatar,
      role: 'PUBLIC',
    })

    if (dbError) {
      console.error('Failed to seed public profile:', dbError)
      return redirect('/login?message=Profile creation failed. Please try again.')
    }
  }

  revalidatePath('/feed', 'layout')
  redirect('/feed')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || 'http://localhost:3000';
  const email = formData.get('email') as string;

  if (!email) return redirect('/login/reset?message=Email is required.');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/login/update-password`,
  });

  if (error) return redirect(`/login/reset?message=${error.message}`);
  
  return redirect('/login/reset?success=true');
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get('password') as string;

  if (!password) return redirect('/login/update-password?message=Password is required.');

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return redirect(`/login/update-password?message=${error.message}`);

  redirect('/feed');
}
