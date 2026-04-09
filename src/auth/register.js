import { supabase } from "../lib/supabase"

export async function register(email, password, username) {
  // 1) create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error) {
    console.log("Auth error:", error)
    return
  }

  const user = data.user

  // 2) save extra data in profiles
  const { error: profileError } = await supabase
    .from("profiles")
    .insert([
      {
        id: user.id,
        username: username
      }
    ])

  if (profileError) {
    console.log("Profile error:", profileError)
  }

  console.log("User created successfully ✅")
}