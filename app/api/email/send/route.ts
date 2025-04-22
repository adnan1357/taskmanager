import { NextRequest, NextResponse } from 'next/server';

// Server-side email sending API
export async function POST(req: NextRequest) {
  try {
    const { email, firstName, code, taskData } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Get API key from server environment
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      console.error('[SERVER] Brevo API key is not defined');
      return NextResponse.json(
        { error: 'Email service configuration error' },
        { status: 500 }
      );
    }

    let subject, htmlContent;

    if (code) {
      // Verification email
      subject = 'Verify your email address';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #8b5cf6; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">TaskMaster</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <h2>Verify your email address</h2>
            <p>Hi ${firstName},</p>
            <p>Thank you for creating an account with TaskMaster. Please enter the verification code below to complete your registration:</p>
            <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; margin: 20px 0; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px;">${code}</span>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't create an account with TaskMaster, please ignore this email.</p>
            <p>Thanks,<br>The TaskMaster Team</p>
          </div>
        </div>
      `;
    } else if (taskData) {
      // Task notification email
      const getEmailSubject = () => {
        switch (taskData.action) {
          case 'created':
            return `New Task: ${taskData.taskTitle}`;
          case 'updated':
            return `Task Updated: ${taskData.taskTitle}`;
          case 'priority_changed':
            return `Task Priority Changed: ${taskData.taskTitle}`;
          case 'status_changed':
            return `Task Status Updated: ${taskData.taskTitle}`;
          default:
            return `Task Notification: ${taskData.taskTitle}`;
        }
      };

      subject = getEmailSubject();
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #8b5cf6; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">TaskMaster</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <h2>${subject}</h2>
            <p>Hi ${firstName},</p>
            <p>A task has been ${taskData.action} in the project "${taskData.projectName}":</p>
            <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${taskData.taskTitle}</h3>
              ${taskData.priority ? `<p><strong>Priority:</strong> ${taskData.priority}</p>` : ''}
              ${taskData.status ? `<p><strong>Status:</strong> ${taskData.status}</p>` : ''}
              ${taskData.assigneeName ? `<p><strong>Assignee:</strong> ${taskData.assigneeName}</p>` : ''}
              ${taskData.dueDate ? `<p><strong>Due Date:</strong> ${taskData.dueDate}</p>` : ''}
              ${taskData.updateText ? `<p><strong>Update:</strong> ${taskData.updateText}</p>` : ''}
            </div>
            <p>You can view the task in TaskMaster.</p>
            <p>Thanks,<br>The TaskMaster Team</p>
          </div>
        </div>
      `;
    } else {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    // Call Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'TaskMaster',
          email: 'test2@adnanhabib.co.uk',
        },
        to: [
          {
            email: email,
            name: firstName,
          },
        ],
        subject,
        htmlContent,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[SERVER] Brevo API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
    
    const responseData = await response.json();
    console.log('[SERVER] Brevo API response:', responseData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SERVER] Error sending email:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 