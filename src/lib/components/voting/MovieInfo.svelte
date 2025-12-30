<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import Users from '@lucide/svelte/icons/users';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { Button } from '$lib/components/ui/button/index.js';
	import { formatVotes } from '$lib/utils/format';
	import type { Movie } from '$lib/types/poll';

	interface Props {
		movie: Movie;
	}

	let { movie }: Props = $props();
</script>

<div class="relative flex h-12 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
	N/A
	{#if movie.poster}
		<img
			src={movie.poster}
			alt={movie.title}
			class="absolute inset-0 h-full w-full rounded object-cover"
			onerror={(e) => e.currentTarget.remove()}
		/>
	{/if}
</div>

<div class="flex min-w-0 flex-1 flex-col">
	<span class="truncate font-medium">{movie.title}</span>
	<div class="flex items-center gap-2 text-sm text-muted-foreground">
		<span>{movie.year}</span>
		{#if movie.rating}
			<span class="flex items-center gap-0.5">
				<Star class="size-3 fill-yellow-400 text-yellow-400" />
				{movie.rating}
			</span>
		{/if}
		{#if movie.votes}
			<span class="flex items-center gap-0.5">
				<Users class="size-3" />
				{formatVotes(movie.votes)}
			</span>
		{/if}
	</div>
	{#if movie.plot}
		<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{movie.plot}</p>
	{/if}
</div>

<Button
	variant="ghost"
	size="icon"
	class="size-8 shrink-0"
	href="https://www.imdb.com/title/{movie.imdbID}"
	target="_blank"
	rel="noopener noreferrer"
	onclick={(e) => e.stopPropagation()}
	aria-label="View on IMDb"
>
	<ExternalLink class="size-4" />
</Button>
