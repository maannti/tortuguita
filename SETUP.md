# Manti Gastos - Expense Tracker Setup Guide

A modern expense tracking application with multi-user organization support, built with Next.js 16, Prisma, and PostgreSQL.

## Features

- **Multi-user Organizations**: Multiple users can collaborate in the same "home" or organization
- **Bill Categories**: Create and manage custom expense categories with colors and icons
- **Bill Management**: Full CRUD for bills with payment dates and optional due dates
- **Dashboard Analytics**:
  - Total spending this month
  - Month-over-month comparison
  - 6-month spending average
  - Category breakdown (pie chart)
  - Monthly trend (bar chart)
- **Authentication**: Email/password and Google OAuth support
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon.tech configured)
- npm or yarn package manager

## Setup Status

✅ **Database**: Connected to Neon PostgreSQL
✅ **Environment**: Variables configured
✅ **Migrations**: Database schema created
✅ **Prisma Client**: Generated and ready

## Environment Configuration

Your `.env` file is already configured with:
- PostgreSQL database connection (Neon.tech)
- NEXTAUTH_SECRET: `XiC5Du7zUfMQVlcFY0fFiMifA6RaNQpZJBkjtVqFyXc=`
- NEXTAUTH_URL: `http://localhost:3000`

### Optional: Google OAuth

If you want to enable Google sign-in, add these to your `.env` file:

```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Database Setup

✅ **Already completed!** All database tables have been created:
- User, Organization, BillType, Bill
- NextAuth.js tables (Account, Session, VerificationToken)
- All indexes and constraints applied

### (Optional) Seed Default Categories

The seed file is ready but currently just shows available default categories. You can customize it to auto-create categories if needed.

```bash
npm run db:seed
```

## Start the Development Server

You're ready to go! Just start the server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## First Time Usage

1. **Sign Up**: Click "Sign up" and create your account
   - Enter your name, email, and password
   - Provide an organization name (e.g., "My Home", "Smith Family")
   - This will create both your user account and organization

2. **Create Categories**: Navigate to the Categories page
   - Add categories like "Groceries", "Utilities", "Rent", etc.
   - Choose colors and icons for easy visualization

3. **Add Bills**: Go to the Bills page
   - Click "Add Bill"
   - Fill in the description, amount, payment date, and category
   - Optionally add a due date for future reminders

4. **View Dashboard**: Check your analytics
   - Total spending this month
   - Comparison with last month
   - Category breakdown chart
   - 6-month spending trend

## Google OAuth Setup (Optional)

If you want to enable Google sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env` file

## Email Configuration (Resend)

Password recovery requires email functionality. This project uses [Resend](https://resend.com) for transactional emails.

### Setup Steps

1. **Create a Resend account** at [resend.com](https://resend.com)
2. **Get your API key** from the Resend dashboard
3. **Add a domain** at [resend.com/domains](https://resend.com/domains):
   - Add your domain (e.g., `info.yourdomain.com`)
   - Add the DNS records Resend provides (DKIM, SPF, MX)
   - Wait for verification (usually a few minutes)
4. **Add to your `.env` file**:
   ```bash
   RESEND_API_KEY="re_xxxxxxxxxxxx"
   RESEND_FROM_EMAIL="noreply@info.yourdomain.com"
   ```

### Testing Without a Domain

If you don't have a custom domain yet, Resend provides a sandbox sender (`onboarding@resend.dev`). However, this can **only send emails to the email address registered with your Resend account**. This is useful for testing but won't work for real users.

## Production Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your production URL)
   - `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (for password recovery emails)
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (if using Google OAuth)
4. Deploy

### Database Migrations in Production

```bash
npx prisma migrate deploy
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL (Neon.tech) with Prisma ORM
- **Authentication**: NextAuth.js v5
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns

## Project Structure

```
├── app/
│   ├── (auth)/              # Login/signup pages
│   ├── (dashboard)/         # Protected pages
│   │   ├── dashboard/       # Main dashboard with KPIs
│   │   ├── bills/           # Bills management
│   │   ├── categories/      # Categories management
│   │   └── settings/        # Organization & profile settings
│   └── api/                 # API routes
├── components/
│   ├── auth/                # Auth forms
│   ├── bills/               # Bill components
│   ├── categories/          # Category components
│   ├── dashboard/           # Dashboard components
│   ├── layout/              # Header, sidebar
│   ├── providers/           # Context providers
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client
│   ├── utils.ts             # Utility functions
│   └── validations/         # Zod schemas
└── prisma/
    ├── schema.prisma        # Database schema
    └── seed.ts              # Seed script
```

## Database Schema

### Key Models

- **User**: User accounts with authentication
- **Organization**: Groups of users sharing expenses
- **BillType**: Expense categories
- **Bill**: Individual expense records

All bills and categories are scoped to organizations, ensuring data isolation between different organizations.

## Common Issues & Troubleshooting

### Database Connection Issues

If you get connection errors:
1. Verify your DATABASE_URL format is correct
2. Check that your database server is running
3. Ensure firewall rules allow connections from your IP
4. For PlanetScale, make sure you're using the correct connection string

### Authentication Errors

If sign-in fails:
1. Make sure NEXTAUTH_SECRET is set in .env
2. Verify NEXTAUTH_URL matches your current URL
3. Clear browser cookies and try again

### Password Recovery Emails Not Sending

If password reset emails aren't being delivered:
1. Verify `RESEND_API_KEY` is set in your `.env` file
2. Check that `RESEND_FROM_EMAIL` uses a verified domain (not `onboarding@resend.dev`)
3. Confirm your domain is verified in the Resend dashboard
4. Check server logs for Resend API errors

### Build Errors

If you get build errors:
1. Delete `.next` folder: `rm -rf .next`
2. Delete `node_modules`: `rm -rf node_modules`
3. Reinstall dependencies: `npm install`
4. Try building again: `npm run build`

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Prisma commands
npx prisma studio          # Open Prisma Studio (database GUI)
npx prisma migrate dev     # Create a new migration
npx prisma migrate deploy  # Apply migrations in production
npx prisma generate        # Generate Prisma Client
npx prisma db push         # Push schema changes (for prototyping)
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the Prisma documentation: https://www.prisma.io/docs
3. Check NextAuth.js docs: https://authjs.dev

## License

Private project - All rights reserved
