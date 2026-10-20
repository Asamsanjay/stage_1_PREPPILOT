import { supabase, isSupabaseConfigured } from '../supabaseClient';

/**
 * Reusable function to ensure a profile exists in Supabase 'profiles' table.
 * Supports both Email/Password users and Google OAuth users.
 * 
 * Returns: { profile: object | null, error: object | null }
 */
export const ensureUserProfile = async (user) => {
  if (!user || !user.id) {
    return { profile: null, error: { message: 'Invalid user object provided.' } };
  }

  const userEmail = user.email || '';
  const metaName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    userEmail.split('@')[0] ||
    'User';
  const metaAvatar =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  if (!isSupabaseConfigured()) {
    return {
      profile: null,
      error: { message: 'Supabase credentials missing in .env! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' }
    };
  }

  try {
    // 1. Check if profile row already exists for this user ID
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Database Profile Fetch Error:', fetchError);
      return { profile: null, error: fetchError };
    }

    if (existingProfile) {
      return { profile: existingProfile, error: null };
    }

    // 2. Profile does not exist -> Insert profile row using auth.users.id
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          name: metaName,
          email: userEmail,
          avatar_url: metaAvatar,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('Database Profile Insertion Error:', insertError);
      return { profile: null, error: insertError };
    }

    return { profile: newProfile || { id: user.id, name: metaName, email: userEmail, avatar_url: metaAvatar }, error: null };
  } catch (err) {
    console.error('Exception in ensureUserProfile:', err);
    return { profile: null, error: { message: err.message || 'Database execution exception.' } };
  }
};

