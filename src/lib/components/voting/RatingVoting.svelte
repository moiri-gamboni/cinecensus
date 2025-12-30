<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import MovieFilter from '$lib/components/MovieFilter.svelte';
	import MovieInfo from './MovieInfo.svelte';
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
		The movie with the highest median rating wins.
	</p>

	{#if movies.length > 5}
		<MovieFilter {movies} onfilter={handleFilter} />
	{/if}

	<div class="space-y-3">
		{#each filteredMovies as movie (movie.imdbID)}
			{@const currentRating = getRating(movie.imdbID)}
			<div class="flex items-center gap-3 rounded-lg border p-3">
				<MovieInfo {movie} />

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
