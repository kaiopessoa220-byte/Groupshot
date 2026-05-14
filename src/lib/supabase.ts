import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://loaazqaucclypxffhpka.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYWF6cWF1Y2NseXB4ZmZocGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDkwNzMsImV4cCI6MjA5Mjg4NTA3M30.tYaY9tPayRziGhVCnECIEjytM1ykwyWhTt3Mjae54oc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const API_BASE = `${SUPABASE_URL}/functions/v1/groupshot-api`
