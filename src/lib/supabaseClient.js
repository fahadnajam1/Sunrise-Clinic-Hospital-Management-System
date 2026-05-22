import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cthzvnzlzmkigwfzybxn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0aHp2bnpsem1raWd3Znp5YnhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTQ3MjMsImV4cCI6MjA5MTM3MDcyM30.sw-bduLa25MDxtg1zGl-cd8flLIeTPmqnGmcffwlnms';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
