import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirect');
  
  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (session?.user) {
      // Create or update user record in public.users
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (userError) {
        console.error('Error creating/updating user record:', userError);
      }
    }
  }

  // URL to redirect to after sign in process completes
  // If redirectTo is present, use it, otherwise go to dashboard
  if (redirectTo) {
    // Make sure the redirect URL is properly decoded and is a safe path
    try {
      const decodedRedirect = decodeURIComponent(redirectTo);
      // Only allow redirects to relative paths (starting with /) to prevent security issues
      // And strip any potential query string manipulations
      if (decodedRedirect.startsWith('/')) {
        const cleanPath = decodedRedirect.split('?')[0];
        const searchParams = new URLSearchParams(decodedRedirect.split('?')[1] || '');
        const safeRedirectUrl = new URL(cleanPath, requestUrl.origin);
        
        // Add searchParams back in a controlled manner
        searchParams.forEach((value, key) => {
          safeRedirectUrl.searchParams.append(key, value);
        });
        
        return NextResponse.redirect(safeRedirectUrl);
      }
    } catch (e) {
      console.error('Error processing redirect URL:', e);
    }
  }
  
  // Default redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url));
} 