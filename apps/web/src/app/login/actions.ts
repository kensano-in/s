'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

  if (!email || !password || !username) {
    return redirect('/login?message=Email, Username, and Password are required.')
  }

  // Server-side Tier 1 namespace guard (PUBLIC accounts)
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (cleanUsername.length < 5) {
    return redirect('/login?message=Namespace Denied: Username must be at least 5 characters.')
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

  if (authError) {
    return redirect(`/login?message=Could not sign up user: ${authError.message}`)
  }

  if (authData.user) {
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      username: cleanUsername,
      display_name: username,
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
