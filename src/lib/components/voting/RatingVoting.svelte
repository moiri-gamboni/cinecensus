<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import type { Movie, RatingVoteData } from '$lib/types/poll';

	interface Props {
		movies: Movie[];
		value: RatingVoteData;
		onchange: (value: RatingVoteData) => void;
		disabled?: boolean;
	}

	let { movies, value, onchange, disabled = false }: Props = $props();

	function setRating(imdbID: string, rating: number) {
		if (disabled) return;
		onchange({ ...value, [imdbID]: rating });
	}

	function getRating(imdbID: string): number {
		return value[imdbID] ?? 0;
	}

	const ratedCount = $derived(Object.values(value).filter((r) => r > 0).length);
</script>

<div class="space-y-3">
	<p class="text-sm text-muted-foreground">
		Rate each movie from 1 to 5 stars. The movie with the highest median rating wins.
	</p>

	<div class="space-y-3">
		{#each movies as movie (movie.imdbID)}
			{@const currentRating = getRating(movie.imdbID)}
			<div class="flex items-center gap-3 rounded-lg border p-3">
				{#if movie.poster}
					<img src={movie.poster} alt={movie.title} class="h-12 w-8 rounded object-cover" />
				{:else}
					<div class="flex h-12 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
						N/A
					</div>
				{/if}

				<div class="flex min-w-0 flex-1 flex-col">
					<span class="truncate font-medium">{movie.title}</span>
					<span class="text-sm text-muted-foreground">{movie.year}</span>
				</div>

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
