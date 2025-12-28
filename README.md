# CineCensus

Create movie polls and vote with friends. Search movies via OMDb, share a link, and let everyone vote using your preferred voting method.

## Features

- **Movie autocomplete** from OMDb with IMDb links
- **4 voting methods**:
  - Approval voting (vote for multiple)
  - Single vote (pick one)
  - Ranked choice (instant runoff)
  - Rating (1-5 stars, median wins)
- **Bulk paste** movie titles (comma or newline separated)
- **Shareable links** for unlisted polls
- **Dark mode** support
- **No accounts required** - vote via fingerprint

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key

### 3. Get OMDb API key

Sign up at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) (free tier: 1000 requests/day)

### 4. Configure environment

For local development, create `.env`:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OMDB_API_KEY=your-omdb-key
```

For Cloudflare Workers, add to `wrangler.toml`:

```toml
[vars]
PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
PUBLIC_SUPABASE_ANON_KEY = "your-anon-key"
OMDB_API_KEY = "your-omdb-key"
```

### 5. Run locally

```bash
pnpm dev
```

## Deployment

```bash
pnpm run build
npx wrangler deploy
```

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
- [shadcn-svelte](https://shadcn-svelte.com/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Supabase](https://supabase.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [OMDb API](https://www.omdbapi.com/)