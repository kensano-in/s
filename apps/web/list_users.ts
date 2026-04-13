
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

async function getUsers() {
  const { data: users, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Error fetching users:', error)
    return
  }
  console.log('Found users:', users.users.map(u => ({ email: u.email, id: u.id, metadata: u.user_metadata })))
}

getUsers()
