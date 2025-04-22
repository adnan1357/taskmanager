import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface TaskEmailData {
  taskTitle: string;
  projectName: string;
  action: 'created' | 'updated' | 'priority_changed' | 'status_changed';
  priority?: string;
  status?: string;
  updateText?: string;
  assigneeName?: string;
  dueDate?: string;
}

export async function sendTaskEmailNotification(
  recipientEmail: string,
  recipientName: string,
  taskData: TaskEmailData
) {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: recipientEmail,
        firstName: recipientName,
        taskData: {
          ...taskData,
          action: taskData.action,
          taskTitle: taskData.taskTitle,
          projectName: taskData.projectName,
          priority: taskData.priority,
          status: taskData.status,
          updateText: taskData.updateText,
          assigneeName: taskData.assigneeName,
          dueDate: taskData.dueDate
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error sending task email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending task email:', error);
    return false;
  }
}

// Function to generate a random 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Function to send verification email using Brevo API directly
export async function sendVerificationEmail(email: string, firstName: string, code: string): Promise<boolean> {
  try {
    console.log(`Preparing to send email to ${email} for ${firstName} with code ${code}`);
    
    // We'll let the server handle the API key, just pass the required data
    const response = await fetch('/api/email/send', {
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
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Email sending error:', error);
      return false;
    }
    
    console.log('Email request sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
} 