<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
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

	const flipDurationMs = 200;

	function handleFilter(filtered: Movie[], query: string) {
		filterQuery = query;
		matchingIds = new Set(filtered.map((m) => m.imdbID));
	}

	function isHighlighted(imdbID: string): boolean {
		return filterQuery !== '' && matchingIds.has(imdbID);
	}

	// Items for dnd-zone need an `id` property
	type DndItem = Movie & { id: string };

	// Create ordered list based on current value or default order
	let items = $state<DndItem[]>([]);

	// Sync items when movies or value changes
	$effect(() => {
		const ordered = value.length === 0
			? [...movies]
			: value
				.map((id) => movies.find((m) => m.imdbID === id))
				.filter((m): m is Movie => m !== undefined);

		items = ordered.map((m) => ({ ...m, id: m.imdbID }));
	});

	function handleDndConsider(e: CustomEvent<{ items: DndItem[] }>) {
		items = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<{ items: DndItem[] }>) {
		items = e.detail.items;
		onchange(items.map((m) => m.imdbID));
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

	<div
		class="space-y-2"
		use:dndzone={{ items, flipDurationMs, dragDisabled: disabled, dropTargetStyle: {} }}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each items as movie (movie.id)}
			<div
				class={cn(
					'flex items-center gap-2 rounded-lg border bg-card p-3',
					!disabled && 'cursor-grab active:cursor-grabbing',
					isHighlighted(movie.imdbID) && 'border-primary bg-primary/5'
				)}
				animate:flip={{ duration: flipDurationMs }}
			>
				<GripVertical class="size-5 shrink-0 text-muted-foreground" />
				<MovieInfo {movie} />
			</div>
		{/each}
	</div>
</div>
