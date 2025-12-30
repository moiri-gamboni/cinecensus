# CineCensus

Movie voting app: create polls, search movies, share links, vote together.

## Commands

```bash
pnpm dev          # Start dev server
pnpm run check    # Type check (run before committing)
pnpm run test     # Run unit tests
pnpm run build    # Build for production
```

## Architecture

- **SvelteKit** (Svelte 5 with runes) deployed to **Cloudflare Workers**
- **Supabase** PostgreSQL for polls/votes storage
- **shadcn-svelte** + Tailwind CSS v4 for UI components
- Movie search: local MiniSearch index (100K IMDb titles) + OMDb API for posters

## Key Files

| Location | Purpose |
|----------|---------|
| `src/routes/+page.svelte` | Poll creation page |
| `src/routes/poll/[id]/` | Voting and results pages |
| `src/routes/api/` | Server endpoints (polls, movies) |
| `src/lib/utils/voting-algorithms.ts` | Vote tallying logic |
| `src/lib/utils/movie-search.ts` | Local search with web worker |
| `src/lib/components/ui/` | shadcn-svelte (don't modify) |

## Patterns

**Server-side Supabase**: Create clients in `+page.server.ts` using `platform.env`:
```typescript
const supabase = createClient(platform.env.PUBLIC_SUPABASE_URL, platform.env.PUBLIC_SUPABASE_ANON_KEY);
```

**Voting methods**: `'approval' | 'single' | 'ranked' | 'rating'` - each has matching components in `voting/` and `results/` directories.

**No user accounts**: Poll ownership via localStorage (`pollOwnership`), vote prevention via HttpOnly cookies (`voter_fingerprint`).

**Utility function**: Use `cn()` from `$lib/utils` for conditional Tailwind classes.

## Environment

Secrets accessed via `platform.env` (Cloudflare Workers). Required:
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- `OMDB_API_KEY`
