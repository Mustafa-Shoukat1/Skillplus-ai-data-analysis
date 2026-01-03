# SkillsPulse Frontend

This is the Next.js frontend for the SkillsPulse AI-Powered Data Analysis Platform.

## Quick Start

```bash
# Install dependencies
pnpm install  # or npm install

# Configure environment
cp .env.example .env.local

# Run development server
pnpm dev  # or npm run dev
```

## Features

- **Admin Dashboard**: Upload files, generate AI analyses, manage users
- **Viewer Dashboard**: View public analyses and visualizations
- **Authentication**: Role-based access control (Admin/Viewer)
- **Interactive Charts**: ECharts-powered visualizations

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Radix UI Components
- Recharts

## Project Structure

```
frontend/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── ui/          # Shadcn UI components
│   └── ...          # Feature components
├── lib/             # Utilities and API client
├── hooks/           # Custom React hooks
└── public/          # Static assets
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:8000/api) |
