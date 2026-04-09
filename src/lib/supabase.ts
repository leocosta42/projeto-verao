import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xoiriouayhnfsvfnwlqd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvaXJpb3VheWhuZnN2Zm53bHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjcyODMsImV4cCI6MjA5MTI0MzI4M30.mDfjSbDUoiCRinboegTygS3n7aAexvxPfyOmSK1UJAA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
