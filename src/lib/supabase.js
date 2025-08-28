import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fhqfmtdcxarbnowkgnqr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZocWZtdGRjeGFyYm5vd2tnbnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NTcwNDYsImV4cCI6MjA3MTQzMzA0Nn0.inuDMNeP6RQBfZ_-3Xji_GiNbcJe-ePYBu3Lc8apEnw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)