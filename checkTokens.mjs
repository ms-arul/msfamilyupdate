import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://clvgaanvuyyvhwrzmguf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdmdhYW52dXl5dmh3cnptZ3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTgxMjksImV4cCI6MjA5MTk3NDEyOX0.npoM_ZaqGNhDAiYgRYKTs5bB6SAtFAon2L3WDShlVYk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching tokens...');
  const { data, error } = await supabase.from('fcm_tokens').select('*');
  console.log('Error:', error);
  console.log('Tokens:', data);

  if (data && data.length > 0) {
    console.log('Deleting all stale tokens...');
    // Delete tokens
    for (const row of data) {
      await supabase.from('fcm_tokens').delete().eq('id', row.id);
    }
    console.log('Deleted old tokens. DB is now empty.');
  } else {
    console.log('No tokens found to delete.');
  }
}

run();
