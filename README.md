# CineCensus

Create movie polls and vote with friends. Search movies, choose a voting method, share a link, and decide what to watch together.

## Features

- **Instant movie search** - Search 100K+ titles locally with IMDb ratings, plus OMDb fallback
- **4 voting methods**:
  - **Approval** - Vote for all movies you'd watch
  - **Single vote** - Pick your one favorite
  - **Ranked choice** - Instant runoff voting
  - **Rating** - 1-5 stars, median wins
- **Bulk paste** - Add multiple movies at once (comma or newline separated)
- **Shareable links** - No accounts needed
- **Dark mode** - System preference or toggle
- **Privacy-first** - Cookie-based voting, no tracking

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration: `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key

### 3. Get OMDb API key

Sign up at [omdbapi.com](https://www.omdbapi.com/apikey.aspx) (free tier: 1000 requests/day)

### 4. Configure environment

Create `.dev.vars` for local development:

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OMDB_API_KEY=your-omdb-key
```

### 5. Run locally

```bash
pnpm dev
```

## Deployment

Deploy to Cloudflare Workers:

```bash
pnpm run build
npx wrangler deploy
```

Set secrets (not in wrangler.toml):

```bash
npx wrangler secret put PUBLIC_SUPABASE_URL
npx wrangler secret put PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put OMDB_API_KEY
```

## Updating Movie Data

The search index uses IMDb's public datasets. To update:

```bash
npx tsx scripts/update-imdb-data.ts
```

This downloads the latest IMDb data, filters to top 100K titles by popularity, and rebuilds the MiniSearch index.

## Tech Stack

- [SvelteKit](https://svelte.dev/) (Svelte 5)
- [shadcn-svelte](https://shadcn-svelte.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [OMDb API](https://www.omdbapi.com/)
- [MiniSearch](https://lucaong.github.io/minisearch/)

## License

MIT
