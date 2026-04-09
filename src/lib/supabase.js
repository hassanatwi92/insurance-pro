import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://pgdllmufapzxpzeubgei.supabase.co"
const supabaseAnonKey = "sb_publishable_t28plV_dSwu-GWmem62Bbw_aMdfV67s"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)