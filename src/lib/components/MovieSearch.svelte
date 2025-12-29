<script lang="ts">
	import { tick } from 'svelte';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import Search from '@lucide/svelte/icons/search';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Star from '@lucide/svelte/icons/star';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Movie } from '$lib/types/poll';
	import { searchLocalTitles, toMovieWithRating, type MovieWithRating } from '$lib/utils/movie-search';
	import { fetchPostersAndMerge, resetQueryCache } from '$lib/utils/poster-fetch';

	interface Props {
		onselect: (movie: Movie) => void;
		placeholder?: string;
		excludeIds?: string[];
	}

	let { onselect, placeholder = 'Search movies...', excludeIds = [] }: Props = $props();

	let open = $state(false);
	let searchQuery = $state('');
	let results = $state<MovieWithRating[]>([]);
	let indexLoading = $state(false);
	let fetchingPosters = $state(false);
	let error = $state<string | null>(null);
	let triggerRef = $state<HTMLButtonElement>(null!);
	let posterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Immediately search local index (no debounce)
	async function searchLocal(query: string) {
		if (query.length < 2) {
			results = [];
			error = null;
			return;
		}

		indexLoading = true;
		error = null;

		try {
			const titles = await searchLocalTitles(query, 20);
			const movies = titles.map(toMovieWithRating);
			results = movies.filter((m) => !excludeIds.includes(m.imdbID));
		} catch (err) {
			console.error('Local search error:', err);
			// Fallback: the poster fetch will also do OMDb search
			results = [];
		} finally {
			indexLoading = false;
		}

		// Schedule poster fetch (debounced)
		schedulePosterFetch(query);
	}

	function schedulePosterFetch(query: string) {
		if (posterDebounceTimer) clearTimeout(posterDebounceTimer);
		posterDebounceTimer = setTimeout(() => fetchPosters(query), 500);
	}

	async function fetchPosters(query: string) {
		if (query.length < 2) return;

		fetchingPosters = true;

		try {
			const { movies, newFromOMDb } = await fetchPostersAndMerge(results, query);

			// Update existing results with posters
			results = movies;

			// Merge new OMDb results (sorted by rating, but OMDb doesn't provide ratings)
			// Insert at the end since we don't have vote counts to sort by
			if (newFromOMDb.length > 0) {
				const existingIds = new Set(results.map((m) => m.imdbID));
				const filtered = newFromOMDb.filter(
					(m) => !existingIds.has(m.imdbID) && !excludeIds.includes(m.imdbID)
				);
				results = [...results, ...filtered];
			}
		} catch (err) {
			console.error('Poster fetch error:', err);
			// Non-fatal - we still have local results
		} finally {
			fetchingPosters = false;
		}
	}

	function handleInput(value: string) {
		searchQuery = value;
		searchLocal(value);
	}

	function handleSelect(movie: MovieWithRating) {
		// Convert to Movie (without rating) for the callback
		const { rating, votes, ...movieData } = movie;
		onselect(movieData);
		open = false;
		searchQuery = '';
		results = [];
		tick().then(() => triggerRef?.focus());
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			searchQuery = '';
			results = [];
			resetQueryCache();
		}
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				class="w-full justify-between"
			>
				<span class="flex items-center gap-2 text-muted-foreground">
					<Search class="size-4" />
					{placeholder}
				</span>
				<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0" align="start">
		<Command.Root shouldFilter={false}>
			<Command.Input
				placeholder="Type to search..."
				value={searchQuery}
				oninput={(e) => handleInput(e.currentTarget.value)}
				onkeydown={(e) => {
					if (e.key === 'Enter' && results.length > 0) {
						e.preventDefault();
						handleSelect(results[0]);
					}
				}}
			/>
			<Command.List>
				{#if indexLoading}
					<Command.Loading>
						<div class="flex items-center justify-center py-6">
							<Loader2 class="size-5 animate-spin text-muted-foreground" />
						</div>
					</Command.Loading>
				{:else if error}
					<div class="py-6 text-center text-sm text-destructive">
						{error}
					</div>
				{:else if searchQuery.length >= 2 && results.length === 0}
					<Command.Empty>No movies found.</Command.Empty>
				{:else if results.length > 0}
					<Command.Group>
						{#each results as movie (movie.imdbID)}
							<Command.Item
								value={`${movie.title} ${movie.year} ${movie.imdbID}`}
								onSelect={() => handleSelect(movie)}
								class="flex items-center gap-3 py-2"
							>
								{#if movie.poster}
									<img
										src={movie.poster}
										alt={movie.title}
										class="h-12 w-8 rounded object-cover"
									/>
								{:else if fetchingPosters}
									<div class="flex h-12 w-8 items-center justify-center rounded bg-muted">
										<Loader2 class="size-4 animate-spin text-muted-foreground" />
									</div>
								{:else}
									<div class="flex h-12 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
										N/A
									</div>
								{/if}
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
									</div>
								</div>
							</Command.Item>
						{/each}
					</Command.Group>
				{:else}
					<div class="py-6 text-center text-sm text-muted-foreground">
						Start typing to search movies
					</div>
				{/if}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
