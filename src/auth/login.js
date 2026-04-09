import { supabase } from "../lib/supabase"

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    console.log("Login error:", error)
    return
  }

  console.log("Logged in user ✅", data.user)
}