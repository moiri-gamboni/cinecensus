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
	let hoveredMovie = $state<string | null>(null);
	let hoveredStar = $state<number>(0);

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

	function getStarState(imdbID: string, star: number): 'filled' | 'hovered' | 'empty' {
		const currentRating = getRating(imdbID);
		const isHovering = hoveredMovie === imdbID && hoveredStar > 0;

		if (isHovering) {
			// Show hover preview (outline only)
			return star <= hoveredStar ? 'hovered' : 'empty';
		}
		// Show current rating (filled)
		return star <= currentRating ? 'filled' : 'empty';
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
			<div class="flex items-center gap-3 rounded-lg border p-3">
				<MovieInfo {movie}>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="flex gap-0.5"
						onmouseleave={() => {
							hoveredMovie = null;
							hoveredStar = 0;
						}}
					>
						{#each [1, 2, 3, 4, 5] as star}
							{@const state = getStarState(movie.imdbID, star)}
							<button
								type="button"
								class="rounded p-0.5 transition-colors hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
								onclick={() => setRating(movie.imdbID, star)}
								onmouseenter={() => {
									hoveredMovie = movie.imdbID;
									hoveredStar = star;
								}}
								{disabled}
								aria-label="Rate {star} star{star === 1 ? '' : 's'}"
							>
								<Star
									class="size-6 transition-colors {state === 'filled'
										? 'fill-yellow-400 text-yellow-400'
										: state === 'hovered'
											? 'text-yellow-400'
											: 'text-muted-foreground'}"
								/>
							</button>
						{/each}
					</div>
				</MovieInfo>
			</div>
		{/each}
	</div>

	<p class="text-sm text-muted-foreground">
		{ratedCount} of {movies.length} movies rated
	</p>
</div>
