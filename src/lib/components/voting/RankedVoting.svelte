<script lang="ts">
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import MovieFilter from '$lib/components/MovieFilter.svelte';
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

	function moveUp(index: number) {
		if (disabled || index === 0) return;
		const newOrder = [...orderedMovies];
		[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
		onchange(newOrder.map((m) => m.imdbID));
	}

	function moveDown(index: number) {
		if (disabled || index === orderedMovies.length - 1) return;
		const newOrder = [...orderedMovies];
		[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
		onchange(newOrder.map((m) => m.imdbID));
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
					draggedIndex === index && 'opacity-50',
					draggedIndex !== null && draggedIndex !== index && 'ring-2 ring-primary',
					isHighlighted(movie.imdbID) && 'border-primary bg-primary/5'
				)}
				role="listitem"
				ondragover={(e) => e.preventDefault()}
				ondrop={() => handleDrop(index)}
			>
				<button
					type="button"
					class="cursor-grab touch-none text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
					{disabled}
					draggable={!disabled}
					ondragstart={() => handleDragStart(index)}
					ondragend={() => (draggedIndex = null)}
				>
					<GripVertical class="size-5" />
				</button>

				<span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
					{index + 1}
				</span>

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
					<span class="text-sm text-muted-foreground">{movie.year}</span>
				</div>

				<div class="flex flex-col gap-0.5">
					<button
						type="button"
						class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
						onclick={() => moveUp(index)}
						disabled={disabled || index === 0}
						aria-label="Move up"
					>
						<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 15l-6-6-6 6" />
						</svg>
					</button>
					<button
						type="button"
						class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
						onclick={() => moveDown(index)}
						disabled={disabled || index === orderedMovies.length - 1}
						aria-label="Move down"
					>
						<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M6 9l6 6 6-6" />
						</svg>
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>
