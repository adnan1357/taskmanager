import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { generateVerificationCode } from '@/lib/email';

// Route to send verification code
export async function POST(req: NextRequest) {
  try {
    const { email, firstName, userId } = await req.json();
    
    if (!email || !firstName || !userId) {
      return NextResponse.json(
        { error: 'Email, firstName, and userId are required' },
        { status: 400 }
      );
    }

    console.log(`Sending verification code to ${email} for user ${userId}`);

    const supabase = createRouteHandlerClient({ cookies });
    
    // Generate a 6-digit verification code
    const code = generateVerificationCode();
    console.log(`Generated code: ${code}`);
    
    // Calculate expiry time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Create data object for insertion
    const verificationData = {
      user_id: userId,
      email,
      code,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      used: false
    };
    
    console.log('Inserting verification data:', JSON.stringify(verificationData));
    
    // Store the verification code in the database
    const { error: dbError } = await supabase
      .from('email_verification_codes')
      .insert(verificationData);
    
    if (dbError) {
      console.error('Error storing verification code:', dbError);
      
      // Log detailed error information
      if (dbError.code) {
        console.error('Error code:', dbError.code);
      }
      if (dbError.message) {
        console.error('Error message:', dbError.message);
      }
      if (dbError.details) {
        console.error('Error details:', dbError.details);
      }
      
      return NextResponse.json(
        { error: 'Failed to create verification code' },
        { status: 500 }
      );
    }
    
    console.log('Verification code stored in database');
    
    // Send the verification email using our server-side API
    const emailResponse = await fetch(new URL('/api/email/send', req.nextUrl.origin).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName,
        code,
      }),
    });
    
    if (!emailResponse.ok) {
      console.error('Failed to send verification email');
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }
    
    console.log('Verification email sent successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in verification endpoint:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// Route to verify the code
export async function PUT(req: NextRequest) {
  try {
    const { email, code, userId } = await req.json();
    
    if (!email || !code || !userId) {
      return NextResponse.json(
        { error: 'Email, code, and userId are required' },
        { status: 400 }
      );
    }
    
    console.log(`Verifying code ${code} for email ${email} and user ${userId}`);
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Find the verification code
    const { data: codes, error: fetchError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching verification code:', fetchError);
      return NextResponse.json(
        { error: 'Failed to verify code' },
        { status: 500 }
      );
    }
    
    if (!codes || codes.length === 0) {
      console.error('Invalid or expired verification code');
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }
    
    console.log('Valid verification code found');
    
    // Mark the code as used
    const { error: updateCodeError } = await supabase
      .from('email_verification_codes')
      .update({ used: true })
      .eq('id', codes[0].id);
      
    if (updateCodeError) {
      console.error('Error marking code as used:', updateCodeError);
    }
    
    // Use the admin client to update the user's metadata and confirm email
    const { data: userData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        user_metadata: { email_verified: true },
        email_confirm: true // This will set email_confirmed_at to the current timestamp
      }
    );
    
    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      );
    }
    
    console.log('User metadata updated, email verified');
    console.log('Updated user metadata:', userData.user.user_metadata);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in verification endpoint:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
} 