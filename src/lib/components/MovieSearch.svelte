<script lang="ts">
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Star from '@lucide/svelte/icons/star';
	import Users from '@lucide/svelte/icons/users';
	import * as Command from '$lib/components/ui/command/index.js';
	import type { Movie } from '$lib/types/poll';
	import { searchLocalTitles, toMovieWithRating, type MovieWithRating } from '$lib/utils/movie-search';
	import { fetchPostersAndMerge, resetQueryCache, getCachedPoster, getCachedPlot, fetchMovieDetailsById } from '$lib/utils/poster-fetch';
	import { formatVotes } from '$lib/utils/format';

	interface Props {
		onselect: (movie: Movie) => void;
		placeholder?: string;
		excludeIds?: string[];
	}

	let { onselect, placeholder = 'Search movies...', excludeIds = [] }: Props = $props();

	let searchQuery = $state('');
	let results = $state<MovieWithRating[]>([]);
	let indexLoading = $state(false);
	let fetchingPosters = $state(false);
	let error = $state<string | null>(null);
	let posterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	let currentQuery = $state(''); // Track the current query to avoid stale updates
	let hasFetchedAll = $state(false); // Track if we've fetched all 20 posters
	let failedPosters = $state<Set<string>>(new Set()); // Track posters that failed to load

	// Immediately search local index (no debounce)
	async function searchLocal(query: string) {
		currentQuery = query; // Track current query for stale detection
		hasFetchedAll = false; // Reset on new query
		failedPosters = new Set(); // Reset failed posters on new query

		if (query.length < 2) {
			results = [];
			error = null;
			return;
		}

		console.log(`[Search] Input: "${query}"`);
		// Only show loading if we have no results yet
		if (results.length === 0) {
			indexLoading = true;
		}
		error = null;

		try {
			const titles = await searchLocalTitles(query, 20);
			const movies = titles.map(toMovieWithRating);

			// Don't update if query changed during search
			if (query !== currentQuery) {
				console.log(`[Search] Discarding stale local results for "${query}" (current: "${currentQuery}")`);
				return;
			}

			// Apply cached posters immediately (before debounced fetch)
			const moviesWithCached = movies.map((m) => {
				const cached = getCachedPoster(m.imdbID);
				return cached !== undefined ? { ...m, poster: cached } : m;
			});

			results = moviesWithCached.filter((m) => !excludeIds.includes(m.imdbID));
			console.log(`[Search] Showing ${results.length} results (excluded ${movies.length - results.length})`);
		} catch (err) {
			console.error('[Search] Local search error:', err);
			// Fallback: the poster fetch will also do OMDb search
			// Don't clear results - keep showing previous ones
		} finally {
			indexLoading = false;
		}

		// Schedule poster fetch (debounced)
		schedulePosterFetch(query);
	}

	function schedulePosterFetch(query: string) {
		if (posterDebounceTimer) clearTimeout(posterDebounceTimer);
		console.log(`[Search] Scheduling poster fetch in 500ms for "${query}"`);
		fetchingPosters = true; // Show loaders immediately while waiting
		posterDebounceTimer = setTimeout(() => fetchPosters(query), 500);
	}

	async function fetchPosters(query: string, visibleCount = 10) {
		if (query.length < 2) return;

		// Don't fetch if query has changed (user typed something else)
		if (query !== currentQuery) {
			console.log(`[Search] Skipping stale poster fetch for "${query}" (current: "${currentQuery}")`);
			return;
		}

		console.log(`[Search] Starting poster fetch for "${query}" (visible: ${visibleCount})`);
		// fetchingPosters already true from schedulePosterFetch

		try {
			const { movies, newFromOMDb } = await fetchPostersAndMerge(results, query, visibleCount);

			// Don't update if query changed during fetch
			if (query !== currentQuery) {
				console.log(`[Search] Discarding stale poster results for "${query}" (current: "${currentQuery}")`);
				return;
			}

			// Update existing results with posters
			console.log(`[Search] fetchPosters: updating results (${movies.length} movies, searchQuery="${searchQuery}")`);
			results = movies;

			// Merge new OMDb results (sorted by rating, but OMDb doesn't provide ratings)
			// Insert at the end since we don't have vote counts to sort by
			if (newFromOMDb.length > 0) {
				const existingIds = new Set(results.map((m) => m.imdbID));
				const filtered = newFromOMDb.filter(
					(m) => !existingIds.has(m.imdbID) && !excludeIds.includes(m.imdbID)
				);
				if (filtered.length > 0) {
					console.log(`[Search] Adding ${filtered.length} new movies from OMDb`);
					results = [...results, ...filtered];
				}
			}

			// Mark as fully fetched if we fetched all
			if (visibleCount >= 20) {
				hasFetchedAll = true;
			}
		} catch (err) {
			console.error('[Search] Poster fetch error:', err);
			// Non-fatal - we still have local results
		} finally {
			fetchingPosters = false;
			console.log(`[Search] Poster fetch complete, ${results.length} total results, searchQuery="${searchQuery}"`);
			if (searchQuery === '' && results.length > 0) {
				console.warn(`[Search] BUG DETECTED: results populated but searchQuery is empty!`);
			}
		}
	}

	// Fetch remaining posters when user scrolls
	function handleListScroll() {
		if (hasFetchedAll || results.length <= 10) return;

		console.log(`[Search] Scroll detected, fetching remaining posters`);
		hasFetchedAll = true; // Prevent multiple triggers
		fetchingPosters = true;
		fetchPosters(currentQuery, 20);
	}

	function handleInput(value: string) {
		searchQuery = value;
		searchLocal(value);
	}

	async function handleSelect(movie: MovieWithRating) {
		console.log(`[Search] handleSelect START for "${movie.title}" (currentQuery="${currentQuery}", timer=${!!posterDebounceTimer})`);

		// Cancel any pending poster fetch and mark query as stale to prevent race conditions
		if (posterDebounceTimer) {
			clearTimeout(posterDebounceTimer);
			posterDebounceTimer = null;
			console.log(`[Search] handleSelect: cancelled pending poster timer`);
		}
		currentQuery = ''; // Prevents any in-flight fetches from updating results

		// Fetch movie details (poster + plot) if not already cached
		const cachedPoster = getCachedPoster(movie.imdbID);
		const cachedPlot = getCachedPlot(movie.imdbID);

		let enrichedMovie = { ...movie };

		if (cachedPoster !== undefined && cachedPlot !== undefined) {
			// Both cached, use cached values
			enrichedMovie.poster = cachedPoster;
			enrichedMovie.plot = cachedPlot ?? undefined;
			console.log(`[Search] handleSelect: using cached data`);
		} else {
			// Fetch details (this caches both poster and plot)
			console.log(`[Search] handleSelect: fetching details (await starts)`);
			const details = await fetchMovieDetailsById(movie.imdbID);
			console.log(`[Search] handleSelect: fetching details (await ends, currentQuery="${currentQuery}")`);
			enrichedMovie.poster = details.poster;
			enrichedMovie.plot = details.plot ?? undefined;
		}

		// Keep rating and votes for display in MovieCard
		console.log(`[Search] handleSelect: calling onselect, clearing state`);
		onselect(enrichedMovie);
		searchQuery = '';
		results = [];
		resetQueryCache();
		console.log(`[Search] handleSelect END (results.length=${results.length})`);
	}
</script>

<Command.Root shouldFilter={false} class="rounded-lg border">
	<Command.Input
		placeholder={placeholder}
		bind:value={searchQuery}
		oninput={(e) => handleInput(e.currentTarget.value)}
	/>
	<Command.List class="empty:hidden" onscroll={handleListScroll}>
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
						<div class="relative flex h-12 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
							<!-- Fallback: loader while fetching or image loading, N/A if no poster -->
							{#if (movie.poster && !failedPosters.has(movie.imdbID)) || fetchingPosters}
								<Loader2 class="size-4 animate-spin" />
							{:else}
								N/A
							{/if}

							<!-- Image overlays on top, tracks failures -->
							{#if movie.poster}
								<img
									src={movie.poster}
									alt={movie.title}
									class="absolute inset-0 h-full w-full rounded object-cover"
									onerror={(e) => {
										failedPosters = new Set([...failedPosters, movie.imdbID]);
										e.currentTarget.remove();
									}}
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
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Root>
