# MillionTasks Web Interface

Premium, minimalist web interface for MillionTasks - built with Next.js 14 and the Bauhaus design philosophy.

## Features

- **Read-only Task Dashboard**: View all your tasks created via Telegram
- **Real-time Updates**: Automatic sync using Supabase subscriptions
- **Premium Design**: Minimalist, Apple-inspired UI with warm Stone palette
- **Physics-based Animations**: Responds to AI confidence levels
- **Telegram Magic Link Auth**: Secure authentication from Telegram bot

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom Telegram magic link
- **Hosting**: Vercel

## Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel`
4. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`

## Design System

The interface follows a premium, minimalist design inspired by Bauhaus principles:

- **Colors**: Warm Stone palette (#FAFAF9 primary, no cold grays)
- **Typography**: Inter Variable, Major Third scale (1.25 ratio)
- **Spacing**: 8pt grid, 64px margins on desktop
- **Animations**: Physics-based, responding to AI confidence levels
  - High confidence (90%+): 240ms smooth transition
  - Medium (70-90%): 320ms gentle spring
  - Low (<70%): 400ms exaggerated bounce with purple border

## Architecture

```
/web
├── app/                    # Next.js App Router
│   ├── dashboard/         # Main task dashboard
│   ├── auth/              # Authentication flows
│   └── globals.css        # Design system CSS variables
├── components/            # React components
│   ├── TaskCard.tsx       # Atomic task display unit
│   ├── TaskList.tsx       # Task grouping and display
│   └── Header.tsx         # Navigation header
├── lib/
│   ├── supabase/          # Database clients
│   ├── auth/              # Authentication utilities
│   └── types/             # TypeScript types
└── middleware.ts          # Route protection
```

## Project Status

**Week 1 MVP - COMPLETE** ✓
- [x] Next.js 14 setup
- [x] Design system implementation
- [x] Supabase client configuration
- [x] Magic link authentication
- [x] Core UI components
- [x] Dashboard with real-time updates
- [x] Responsive layouts
- [x] Production build tested

**Next Steps (Week 2)**:
- Task/project sharing system
- Invitation flow
- Permission management
