import { supabase } from './lib/supabase'

export async function testSupabase() {
  const { data, error } = await supabase
    .from('insurance_companies')
    .select('*')

  console.log('DATA:', data)
  console.log('ERROR:', error)
}