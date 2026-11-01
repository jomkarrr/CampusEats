import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing env var: EXPO_PUBLIC_SUPABASE_URL\n' +
    'Copy .env.example → .env.local and fill in your Supabase project URL.'
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    'Missing env var: EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
    'Copy .env.example → .env.local and fill in your Supabase anon key.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // AsyncStorage is provided by @supabase/supabase-js via React Native polyfills
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
