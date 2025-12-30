<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import Users from '@lucide/svelte/icons/users';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import MovieFilter from '$lib/components/MovieFilter.svelte';
	import { formatVotes } from '$lib/utils/format';
	import type { Movie, RatingVoteData } from '$lib/types/poll';

	interface Props {
		movies: Movie[];
		value: RatingVoteData;
		onchange: (value: RatingVoteData) => void;
		disabled?: boolean;
	}

	let { movies, value, onchange, disabled = false }: Props = $props();

	let filteredIds = $state<Set<string> | null>(null);

	const filteredMovies = $derived.by(() => {
		const ids = filteredIds;
		return ids ? movies.filter((m) => ids.has(m.imdbID)) : movies;
	});

	function setRating(imdbID: string, rating: number) {
		if (disabled) return;
		onchange({ ...value, [imdbID]: rating });
	}

	function getRating(imdbID: string): number {
		return value[imdbID] ?? 0;
	}

	const ratedCount = $derived(Object.values(value).filter((r) => r > 0).length);

	function handleFilter(filtered: Movie[], query: string) {
		filteredIds = query ? new Set(filtered.map((m) => m.imdbID)) : null;
	}
</script>

<div class="space-y-3">
	<p class="text-sm text-muted-foreground">
		Rate each movie from 1 to 5 stars. The movie with the highest median rating wins.
	</p>

	{#if movies.length > 5}
		<MovieFilter {movies} onfilter={handleFilter} />
	{/if}

	<div class="space-y-3">
		{#each filteredMovies as movie (movie.imdbID)}
			{@const currentRating = getRating(movie.imdbID)}
			<div class="flex items-center gap-3 rounded-lg border p-3">
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
				</div>

				<a
					href="https://www.imdb.com/title/{movie.imdbID}"
					target="_blank"
					rel="noopener noreferrer"
					class="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
					aria-label="View on IMDb"
				>
					<ExternalLink class="size-4" />
				</a>

				<div class="flex gap-0.5">
					{#each [1, 2, 3, 4, 5] as star}
						<button
							type="button"
							class="rounded p-0.5 transition-colors hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
							onclick={() => setRating(movie.imdbID, star)}
							{disabled}
							aria-label="Rate {star} star{star === 1 ? '' : 's'}"
						>
							<Star
								class="size-6 transition-colors {currentRating >= star
									? 'fill-yellow-400 text-yellow-400'
									: 'text-muted-foreground hover:text-yellow-400'}"
							/>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<p class="text-sm text-muted-foreground">
		{ratedCount} of {movies.length} movies rated
	</p>
</div>
