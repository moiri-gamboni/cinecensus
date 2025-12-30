<script lang="ts">
	import MovieFilter from '$lib/components/MovieFilter.svelte';
	import MovieInfo from './MovieInfo.svelte';
	import { cn } from '$lib/utils.js';
	import type { Movie, RankedVoteData } from '$lib/types/poll';

	interface Props {
		movies: Movie[];
		value: RankedVoteData;
		onchange: (value: RankedVoteData) => void;
		disabled?: boolean;
	}

	let { movies, value, onchange, disabled = false }: Props = $props();

	let matchingIds = $state<Set<string>>(new Set());
	let filterQuery = $state('');

	function handleFilter(filtered: Movie[], query: string) {
		filterQuery = query;
		matchingIds = new Set(filtered.map((m) => m.imdbID));
	}

	function isHighlighted(imdbID: string): boolean {
		return filterQuery !== '' && matchingIds.has(imdbID);
	}

	// Create ordered list based on current value or default order
	let orderedMovies = $derived.by(() => {
		if (value.length === 0) {
			return [...movies];
		}
		return value
			.map((id) => movies.find((m) => m.imdbID === id))
			.filter((m): m is Movie => m !== undefined);
	});

	let draggedIndex = $state<number | null>(null);

	function handleDragStart(index: number) {
		if (disabled) return;
		draggedIndex = index;
	}

	function handleDrop(targetIndex: number) {
		if (disabled || draggedIndex === null || draggedIndex === targetIndex) {
			draggedIndex = null;
			return;
		}

		const newOrder = [...orderedMovies];
		const [removed] = newOrder.splice(draggedIndex, 1);
		newOrder.splice(targetIndex, 0, removed);

		onchange(newOrder.map((m) => m.imdbID));
		draggedIndex = null;
	}

	// Initialize value if empty
	$effect(() => {
		if (value.length === 0 && movies.length > 0) {
			onchange(movies.map((m) => m.imdbID));
		}
	});
</script>

<div class="space-y-3">
	<p class="text-sm text-muted-foreground">
		Drag to reorder. Your top choice is first. If it's eliminated, your vote goes to your next choice.
	</p>

	{#if movies.length > 5}
		<MovieFilter {movies} onfilter={handleFilter} placeholder="Find a movie to reorder..." />
	{/if}

	<div class="space-y-2">
		{#each orderedMovies as movie, index (movie.imdbID)}
			<div
				class={cn(
					'flex items-center gap-2 rounded-lg border bg-card p-3 transition-all',
					!disabled && 'cursor-grab active:cursor-grabbing',
					draggedIndex === index && 'opacity-50',
					draggedIndex !== null && draggedIndex !== index && 'ring-2 ring-primary',
					isHighlighted(movie.imdbID) && 'border-primary bg-primary/5'
				)}
				role="listitem"
				draggable={!disabled}
				ondragstart={() => handleDragStart(index)}
				ondragend={() => (draggedIndex = null)}
				ondragover={(e) => e.preventDefault()}
				ondrop={() => handleDrop(index)}
			>
				<MovieInfo {movie} />
			</div>
		{/each}
	</div>
</div>
