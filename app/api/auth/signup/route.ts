import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await req.json();
    
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, password, firstName, and lastName are required' },
        { status: 400 }
      );
    }

    console.log(`Creating user with email ${email} without email confirmation`);

    // Use the admin API to create a user without email confirmation
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Do not confirm email yet - we'll do this after verification
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        email_verified: false, // Set this to false for our app logic - requires verification
      },
    });
    
    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }
    
    if (!userData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }
    
    console.log('User created successfully:', userData.user.id);
    
    // Create the user record in the public.users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userData.user.id,
        full_name: `${firstName} ${lastName}`,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (userError) {
      // Log the error but don't fail the request if it's a duplicate key
      if (userError.code === '23505') { // unique_violation error code
        console.log('User record already exists in public.users');
      } else {
        console.error('Error creating user record:', userError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }
    }
    
    // Send verification code via Brevo
    try {
      const verificationResponse = await fetch(new URL('/api/auth/verify', req.nextUrl.origin).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          firstName,
          userId: userData.user.id,
        }),
      });
      
      if (!verificationResponse.ok) {
        console.error('Failed to send verification code');
        // Continue anyway, we'll let the user request it later
      } else {
        console.log('Verification code sent successfully');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      // Continue anyway, as the user is created
    }
    
    // Don't automatically sign in, just return the user data
    return NextResponse.json({
      user: userData.user,
      requiresVerification: true,
      message: 'Account created successfully. Please check your email for verification code.'
    });
    
  } catch (error) {
    console.error('Error in signup endpoint:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
} 