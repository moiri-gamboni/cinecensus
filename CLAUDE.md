# CineCensus

Movie voting app where users create polls, add movies via OMDb search, and share links with friends to vote.

## Stack

- **Framework**: SvelteKit (Svelte 5) with TypeScript
- **UI**: shadcn-svelte + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Cloudflare Workers
- **Movie API**: OMDb (proxied via `/api/movies`)

## Project Structure

```
src/
├── lib/
│   ├── components/ui/       # shadcn-svelte components (don't modify)
│   ├── components/voting/   # Voting method UIs (approval, single, ranked, rating)
│   ├── components/results/  # Results display per voting method
│   ├── types/               # TypeScript types (poll.ts, omdb.ts)
│   └── utils/voting-algorithms.ts  # Tallying logic for all 4 methods
├── routes/
│   ├── api/movies/          # OMDb proxy endpoints
│   ├── api/polls/           # Poll creation
│   └── poll/[id]/           # Voting and results pages
└── supabase/migrations/     # Database schema
```

## Commands

```bash
pnpm dev          # Start dev server
pnpm run check    # Type check
pnpm run test     # Run unit tests
pnpm run build    # Build for production
```

## Environment

Secrets are accessed via `platform.env` on Cloudflare Workers. See `.env.example` for required variables:
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- `OMDB_API_KEY`

## Key Patterns

- Server-side Supabase clients in `+page.server.ts` (not browser client)
- Voter fingerprinting via HttpOnly cookies for double-vote prevention
- Poll ownership tracked in localStorage (no accounts)
- Use `cn()` from `$lib/utils` for conditional Tailwind classes
