import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('--- DB Check ---');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const { data, error } = await supabase.from('malls').select('*');
  if (error) {
    console.error('Error fetching malls:', error.message);
  } else {
    console.log('Malls found:', data.length);
  }
}

check();
