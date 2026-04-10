import { supabase } from "./lib/supabase";

async function testSupabase() {
  // 1. نجيب user الحالي
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.log("USER ERROR:", userError);
    return;
  }

  const user = userData.user;

  console.log("USER:", user);

  // 2. INSERT (إضافة بيانات)
  const { data: insertData, error: insertError } = await supabase
    .from("insurance_companies")
    .insert([
      {
        name: "Test Company",
        user_id: user.id,
      },
    ])
    .select();

  console.log("INSERT DATA:", insertData);
  console.log("INSERT ERROR:", insertError);

  // 3. SELECT (عرض بيانات نفس user)
  const { data: selectData, error: selectError } = await supabase
    .from("insurance_companies")
    .select("*")
    .eq("user_id", user.id);

  console.log("SELECT DATA:", selectData);
  console.log("SELECT ERROR:", selectError);
}

testSupabase();
