import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";


// إعداد Supabase
const supabaseUrl = "https://your-project.supabase.co";
const supabaseKey = "public-anon-key";
const supabase = createClient(supabaseUrl, supabaseKey);

// دالة التسجيل
export async function registerUser(username, passwordPlain) {
  try {
    // تحويل كلمة المرور إلى hash
    const hashedPassword = await bcrypt.hash(passwordPlain, 10);

    // إضافة المستخدم للجدول users
    const { data, error } = await supabase
      .from("users")
      .insert([{ username, password: hashedPassword }])
      .select();

    if (error) {
      console.error("Error inserting user:", error);
      return null;
    }

    console.log("User registered:", data[0]);
    return data[0];
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}