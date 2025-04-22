# TaskMaster

TaskMaster is a modern task management application built with Next.js, Supabase, and Tailwind CSS. It allows users to create, organize, and track their tasks with a beautiful and intuitive interface.

## Features

- User authentication (email/password and Google OAuth)
- Task creation, editing, and deletion
- Task categorization and filtering
- Responsive design for all devices
- Real-time updates with Supabase
- Email notifications via Brevo (formerly Sendinblue)
- AI-powered task suggestions and insights via Google Gemini

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account
- A Google Cloud Platform account (for OAuth and Gemini)
- A Brevo account (for email notifications)

## Getting Started

### 1. Clone the repository, ignore if opening through zip file

```bash
git clone https://github.com/yourusername/taskmanager.git
cd taskmanager
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

And then navigate to http://localhost:3000/ in your browser

For examiners, I have included the api keys in .env.local, but the below is where you would retrieve them

### 3. Set up Supabase

1. Create a new project on [Supabase](https://supabase.com/)
2. Navigate to your project dashboard
3. Go to Project Settings > API to find your API keys

### 4. Set up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "OAuth client ID"
5. Configure the OAuth consent screen:
   - Add your app name, user support email, and developer contact information
   - Add the necessary scopes (email, profile)
6. Create OAuth client ID:
   - Application type: Web application
   - Name: TaskMaster
   - Authorized JavaScript origins: `http://localhost:3000` (for development)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://your-production-domain.com/auth/callback` (for production)
7. Copy the Client ID and Client Secret

### 5. Set up Google Gemini AI

1. In your Google Cloud Console project, navigate to "APIs & Services" > "Library"
2. Search for "Gemini API" and enable it
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "API Key"
5. Copy the generated API key
6. (Optional) Restrict the API key to only the Gemini API for security

### 6. Set up Brevo (formerly Sendinblue)

1. Create an account on [Brevo](https://www.brevo.com/)
2. Navigate to the API Keys section in your account
3. Generate a new API key
4. Create an email template for verification emails and task notifications
5. Note down your API key and template IDs

### 7. Configure environment variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Brevo (Sendinblue)
BREVO_SMTP_SERVER=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your_brevo_username
BREVO_SMTP_API_KEY=your_brevp_api_key
```

### 8. Configure Supabase for Google OAuth

1. In your Supabase dashboard, go to Authentication > Providers
2. Find Google in the list and enable it
3. Enter your Google Client ID and Client Secret
4. Save the changes

### 9. Set up the database schema

1. In your Supabase dashboard, go to SQL Editor
2. Create the necessary tables for your application:

````

### 10. Run the development server

```bash
npm run dev
# or
yarn dev
````

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deployment

### Environment Variables

| Variable                              | Description                              |
| ------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | Your Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | Your Supabase anonymous key (public)     |
| `SUPABASE_SERVICE_ROLE_KEY`           | Your Supabase service role key (private) |
| `GOOGLE_CLIENT_ID`                    | Your Google OAuth client ID              |
| `GOOGLE_CLIENT_SECRET`                | Your Google OAuth client secret          |
| `GEMINI_API_KEY`                      | Your Google Gemini API key               |
| `BREVO_API_KEY`                       | Your Brevo API key                       |
| `BREVO_VERIFICATION_TEMPLATE_ID`      | ID of your verification email template   |
| `BREVO_TASK_NOTIFICATION_TEMPLATE_ID` | ID of your task notification template    |

## Project Structure

```
taskmanager/
├── app/                  # Next.js app directory
│   ├── (auth)/           # Authentication routes
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard routes
│   └── ...
├── components/           # Reusable components
├── lib/                  # Utility functions and libraries
│   ├── supabase.ts       # Supabase client configuration
│   ├── brevo.ts          # Brevo email service configuration
│   ├── gemini.ts         # Gemini AI service configuration
│   └── ...
├── public/               # Static assets
└── ...
```

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- [React](https://reactjs.org/) - UI library
- [Brevo](https://www.brevo.com/) - Email service provider
- [Google Gemini](https://ai.google.dev/) - AI-powered task suggestions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Supabase](https://supabase.com/) for the backend infrastructure
- [Next.js](https://nextjs.org/) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for the styling
- [Brevo](https://www.brevo.com/) for email services
- [Google Gemini](https://ai.google.dev/) for AI capabilities
