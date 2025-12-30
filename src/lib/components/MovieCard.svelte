<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Star from '@lucide/svelte/icons/star';
	import Users from '@lucide/svelte/icons/users';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { formatVotes } from '$lib/utils/format';
	import { getCachedPoster } from '$lib/utils/poster-fetch';
	import type { Movie } from '$lib/types/poll';

	interface Props {
		movie: Movie;
		onremove?: () => void;
		showRemove?: boolean;
		compact?: boolean;
	}

	let { movie, onremove, showRemove = false, compact = false }: Props = $props();

	// Check cache for poster if not provided (handles selection before poster loads)
	// undefined = not in cache (might be fetching), null = confirmed no poster, string = has poster
	let cacheResult = $state<string | null | undefined>(undefined);

	$effect(() => {
		// If no poster from props, check cache periodically
		if (!movie.poster) {
			const checkCache = () => {
				const cached = getCachedPoster(movie.imdbID);
				cacheResult = cached;
			};
			checkCache(); // Check immediately
			// Re-check after poster fetch likely completes (only if still waiting)
			const timer = setTimeout(checkCache, 1000);
			return () => clearTimeout(timer);
		}
	});

	const poster = $derived(movie.poster ?? (cacheResult || null));
	// Show loader if no poster from props AND cache hasn't confirmed null
	const isLoading = $derived(!movie.poster && cacheResult === undefined);
</script>

<div class="group relative">
	<a
		href="https://www.imdb.com/title/{movie.imdbID}"
		target="_blank"
		rel="noopener noreferrer"
		class={cn(
			'flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50',
			compact && 'p-2',
			showRemove && 'pr-12'
		)}
	>
		<div
			class={cn(
				'relative flex items-center justify-center rounded bg-muted text-xs text-muted-foreground',
				compact ? 'h-10 w-7' : 'h-16 w-11'
			)}
		>
			{#if isLoading}
				<Loader2 class="size-4 animate-spin" />
			{:else}
				N/A
			{/if}
			{#if poster}
				<img
					src={poster}
					alt={movie.title}
					class="absolute inset-0 h-full w-full rounded object-cover"
					onerror={(e) => e.currentTarget.remove()}
				/>
			{/if}
		</div>

		<div class="flex min-w-0 flex-1 flex-col">
			<span class={cn('truncate font-medium', compact && 'text-sm')}>{movie.title}</span>
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
		</div>
	</a>

	{#if showRemove && onremove}
		<Button
			variant="ghost"
			size="icon"
			class="absolute right-2 top-1/2 size-8 -translate-y-1/2 text-white hover:text-white/80"
			onclick={onremove}
		>
			<X class="size-4" />
			<span class="sr-only">Remove</span>
		</Button>
	{/if}
</div>
