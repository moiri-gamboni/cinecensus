import type { Movie } from '$lib/types/poll';
import type { MovieWithRating } from './movie-search';

const POSTER_CACHE_KEY = 'cinecensus_posters';
const PLOT_CACHE_KEY = 'cinecensus_plots';
const POSTER_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// Stop words to skip when extracting search terms
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'to', 'for', 'is', 'on', 'at']);

interface PosterCache {
	[imdbID: string]: {
		poster: string | null;
		timestamp: number;
	};
}

interface PlotCache {
	[imdbID: string]: {
		plot: string | null;
		timestamp: number;
	};
}

interface OMDbSearchResult {
	results: Movie[];
	error?: string;
}

// Track which queries we've already made this session
const queriedTerms = new Set<string>();

// Track in-flight poster fetches to avoid duplicate requests
// Maps IMDb ID to a promise that resolves when the fetch attempt completes
const inFlightFetches = new Map<string, Promise<void>>();

/**
 * Get cached poster for an IMDb ID.
 */
export function getCachedPoster(imdbID: string): string | null | undefined {
	if (typeof localStorage === 'undefined') return undefined;

	try {
		const cache: PosterCache = JSON.parse(localStorage.getItem(POSTER_CACHE_KEY) || '{}');
		const entry = cache[imdbID];
		if (entry && Date.now() - entry.timestamp < POSTER_CACHE_TTL) {
			return entry.poster;
		}
	} catch {
		// Ignore cache errors
	}
	return undefined;
}

/**
 * Cache a poster for an IMDb ID.
 */
export function cachePoster(imdbID: string, poster: string | null): void {
	if (typeof localStorage === 'undefined') return;

	try {
		const cache: PosterCache = JSON.parse(localStorage.getItem(POSTER_CACHE_KEY) || '{}');
		cache[imdbID] = { poster, timestamp: Date.now() };
		localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(cache));
	} catch {
		// Ignore cache errors
	}
}

/**
 * Get cached plot for an IMDb ID.
 */
export function getCachedPlot(imdbID: string): string | null | undefined {
	if (typeof localStorage === 'undefined') return undefined;

	try {
		const cache: PlotCache = JSON.parse(localStorage.getItem(PLOT_CACHE_KEY) || '{}');
		const entry = cache[imdbID];
		if (entry && Date.now() - entry.timestamp < POSTER_CACHE_TTL) {
			return entry.plot;
		}
	} catch {
		// Ignore cache errors
	}
	return undefined;
}

/**
 * Cache a plot for an IMDb ID.
 */
export function cachePlot(imdbID: string, plot: string | null): void {
	if (typeof localStorage === 'undefined') return;

	try {
		const cache: PlotCache = JSON.parse(localStorage.getItem(PLOT_CACHE_KEY) || '{}');
		cache[imdbID] = { plot, timestamp: Date.now() };
		localStorage.setItem(PLOT_CACHE_KEY, JSON.stringify(cache));
	} catch {
		// Ignore cache errors
	}
}

/**
 * Extract significant words from a title for grouping.
 */
function extractWords(title: string): string[] {
	return title
		.toLowerCase()
		.split(/[\s:,\-–—]+/)
		.filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

/**
 * Find minimum set of search terms to cover all movies.
 * Uses a greedy set cover algorithm.
 */
export function findOptimalSearchTerms(movies: MovieWithRating[]): string[] {
	if (movies.length === 0) return [];

	// Build word -> movies index
	const wordToMovies = new Map<string, Set<string>>();
	for (const movie of movies) {
		const words = extractWords(movie.title);
		for (const word of words) {
			if (!wordToMovies.has(word)) {
				wordToMovies.set(word, new Set());
			}
			wordToMovies.get(word)!.add(movie.imdbID);
		}
	}

	const uncovered = new Set(movies.map((m) => m.imdbID));
	const selectedTerms: string[] = [];

	// Greedy: pick word that covers most uncovered movies until all covered
	while (uncovered.size > 0) {
		let bestWord = '';
		let bestCoverage = 0;

		for (const [word, movieIds] of wordToMovies) {
			const coverage = [...movieIds].filter((id) => uncovered.has(id)).length;
			if (coverage > bestCoverage) {
				bestCoverage = coverage;
				bestWord = word;
			}
		}

		if (bestCoverage === 0) break; // No more words can cover remaining movies

		selectedTerms.push(bestWord);
		for (const id of wordToMovies.get(bestWord)!) {
			uncovered.delete(id);
		}
	}

	console.log(
		`[Poster] Optimal terms for ${movies.length} movies: [${selectedTerms.join(', ')}] (${uncovered.size} uncovered)`
	);

	return selectedTerms;
}

/**
 * Fetch movies from OMDb API.
 */
async function fetchOMDb(query: string): Promise<OMDbSearchResult> {
	console.log(`[OMDb] Fetching "${query}"...`);
	const start = performance.now();
	try {
		const response = await fetch(`/api/movies?q=${encodeURIComponent(query)}`);
		const result = await response.json();
		const time = performance.now() - start;
		console.log(
			`[OMDb] "${query}" → ${result.results?.length ?? 0} results (${time.toFixed(0)}ms)${result.error ? ` ERROR: ${result.error}` : ''}`,
			result.results?.map((m: Movie) => `${m.imdbID} ${m.title} (${m.year}) ${m.poster ? '🖼️' : '❌'}`)
		);
		return result;
	} catch (err) {
		console.error(`[OMDb] "${query}" failed:`, err);
		return { results: [], error: 'Failed to fetch' };
	}
}

/**
 * Fetch posters for movies using optimal OMDb searches.
 * Returns updated movies with posters.
 */
export async function fetchPostersAndMerge(
	localMovies: MovieWithRating[],
	visibleCount = 10
): Promise<MovieWithRating[]> {
	console.log(
		`[Poster] Starting fetch for ${localMovies.length} local movies (visible: ${visibleCount})`,
		localMovies.slice(0, visibleCount).map((m) => `${m.imdbID} ${m.title} (${m.year})`)
	);

	// First, apply any cached posters to ALL movies
	const moviesWithCached = localMovies.map((m) => {
		const cached = getCachedPoster(m.imdbID);
		return cached !== undefined ? { ...m, poster: cached } : m;
	});

	const cachedCount = moviesWithCached.filter((m) => m.poster !== null).length;
	const cachedIds = moviesWithCached.filter((m) => m.poster !== null).map((m) => m.imdbID);
	console.log(`[Poster] ${cachedCount}/${localMovies.length} posters from cache`, cachedIds);

	// Only fetch posters for first N visible movies
	const visibleMovies = moviesWithCached.slice(0, visibleCount);
	const needPosters = visibleMovies.filter((m) => m.poster === null);

	if (needPosters.length === 0) {
		console.log('[Poster] All visible posters cached, skipping OMDb');
		return moviesWithCached;
	}

	// Find optimal search terms for visible movies needing posters
	const searchTerms = findOptimalSearchTerms(needPosters);

	// Filter out already-queried terms
	const newTerms = searchTerms.filter((term) => !queriedTerms.has(term.toLowerCase()));
	const skippedTerms = searchTerms.filter((term) => queriedTerms.has(term.toLowerCase()));

	if (skippedTerms.length > 0) {
		console.log(`[Poster] Skipping already-queried terms: [${skippedTerms.join(', ')}]`);
	}

	if (newTerms.length === 0) {
		console.log('[Poster] No new terms to query');
		return moviesWithCached;
	}

	console.log(`[Poster] Fetching ${newTerms.length} OMDb queries: [${newTerms.join(', ')}]`);

	// Register in-flight fetches for all IDs we're trying to get posters for
	// This prevents MovieCard from making duplicate requests
	const idsBeingFetched = needPosters.map((m) => m.imdbID);
	const resolvers: (() => void)[] = [];
	for (const id of idsBeingFetched) {
		if (!inFlightFetches.has(id)) {
			let resolve: () => void;
			const promise = new Promise<void>((r) => {
				resolve = r;
			});
			inFlightFetches.set(id, promise);
			resolvers.push(resolve!);
		}
	}

	// Fetch from OMDb for each term
	const omdbById = new Map<string, Movie>();

	await Promise.all(
		newTerms.map(async (term) => {
			queriedTerms.add(term.toLowerCase());
			const result = await fetchOMDb(term);
			for (const movie of result.results) {
				// Cache ALL posters from OMDb
				if (movie.poster) {
					cachePoster(movie.imdbID, movie.poster);
				}
				if (!omdbById.has(movie.imdbID)) {
					omdbById.set(movie.imdbID, movie);
				}
			}
		})
	);

	// Apply posters to local movies
	const postersApplied: string[] = [];
	const postersMissing: string[] = [];
	const postersNotFound: string[] = [];
	const updatedMovies = moviesWithCached.map((m) => {
		if (m.poster === null) {
			const omdb = omdbById.get(m.imdbID);
			if (omdb?.poster) {
				cachePoster(m.imdbID, omdb.poster);
				postersApplied.push(`${m.imdbID} ${m.title}`);
				return { ...m, poster: omdb.poster };
			} else if (omdb) {
				// Movie found in OMDb but has no poster - cache this fact
				cachePoster(m.imdbID, null);
				postersNotFound.push(`${m.imdbID} ${m.title}`);
			} else {
				// Movie not in OMDb search results at all
				postersMissing.push(`${m.imdbID} ${m.title}`);
			}
		}
		return m;
	});

	console.log(`[Poster] Applied ${postersApplied.length} posters:`, postersApplied);
	if (postersNotFound.length > 0) {
		console.log(
			`[Poster] ${postersNotFound.length} posters confirmed unavailable (cached as null):`,
			postersNotFound
		);
	}
	if (postersMissing.length > 0) {
		console.log(
			`[Poster] ${postersMissing.length} movies not in OMDb search results (will retry next search):`,
			postersMissing
		);
	}

	// Resolve in-flight promises and clean up
	for (const resolve of resolvers) {
		resolve();
	}
	for (const id of idsBeingFetched) {
		inFlightFetches.delete(id);
	}

	return updatedMovies;
}

/**
 * Reset the query cache (useful for testing or new sessions).
 */
export function resetQueryCache(): void {
	queriedTerms.clear();
}

/**
 * Fetch poster for a single movie by IMDb ID.
 * Waits for any in-flight autocomplete fetches before doing its own lookup.
 */
export async function fetchPosterById(imdbID: string): Promise<string | null> {
	// Check cache first
	let cached = getCachedPoster(imdbID);
	if (cached !== undefined) {
		console.log(`[Poster] ${imdbID} already cached: ${cached ? '🖼️' : '❌'}`);
		return cached;
	}

	// If autocomplete is already fetching this ID, wait for it
	const inFlight = inFlightFetches.get(imdbID);
	if (inFlight) {
		console.log(`[Poster] ${imdbID} already being fetched by autocomplete, waiting...`);
		await inFlight;
		// Check cache again - autocomplete may have found it
		cached = getCachedPoster(imdbID);
		if (cached !== undefined) {
			console.log(`[Poster] ${imdbID} now cached from autocomplete: ${cached ? '🖼️' : '❌'}`);
			return cached;
		}
		// Autocomplete didn't find it - fall through to ID lookup
		console.log(`[Poster] ${imdbID} not found by autocomplete, doing ID lookup`);
	}

	// Fetch by ID (fallback when autocomplete search didn't find it)
	console.log(`[Poster] Fetching poster by ID: ${imdbID}`);
	try {
		const response = await fetch(`/api/movies/resolve?i=${encodeURIComponent(imdbID)}`);
		const result = await response.json();

		if (result.movie?.poster) {
			cachePoster(imdbID, result.movie.poster);
			console.log(`[Poster] ${imdbID} fetched: 🖼️`);
			return result.movie.poster;
		} else {
			cachePoster(imdbID, null);
			console.log(`[Poster] ${imdbID} has no poster`);
			return null;
		}
	} catch (err) {
		console.error(`[Poster] Failed to fetch ${imdbID}:`, err);
		return null;
	}
}

/**
 * Fetch movie details (poster and plot) for a single movie by IMDb ID.
 * Used when selecting a movie to get all details.
 */
export async function fetchMovieDetailsById(
	imdbID: string
): Promise<{ poster: string | null; plot: string | null }> {
	// Check caches first
	const cachedPoster = getCachedPoster(imdbID);
	const cachedPlot = getCachedPlot(imdbID);

	if (cachedPoster !== undefined && cachedPlot !== undefined) {
		console.log(`[Details] ${imdbID} fully cached`);
		return { poster: cachedPoster, plot: cachedPlot };
	}

	console.log(`[Details] Fetching details by ID: ${imdbID}`);
	try {
		const response = await fetch(`/api/movies/resolve?i=${encodeURIComponent(imdbID)}`);
		const result = await response.json();

		const poster = result.movie?.poster ?? null;
		const plot = result.movie?.plot ?? null;

		cachePoster(imdbID, poster);
		cachePlot(imdbID, plot);

		console.log(`[Details] ${imdbID} fetched: poster=${poster ? '🖼️' : '❌'}, plot=${plot ? '📝' : '❌'}`);
		return { poster, plot };
	} catch (err) {
		console.error(`[Details] Failed to fetch ${imdbID}:`, err);
		return { poster: null, plot: null };
	}
}

/**
 * Fetch and update missing plots for movies in a poll.
 * Checks localStorage first, then fetches from OMDb if needed.
 * Updates both localStorage and the database.
 * Returns updated movies array.
 */
export async function fetchMissingPlots(
	pollId: string,
	movies: Movie[]
): Promise<Movie[]> {
	const moviesNeedingPlots = movies.filter((m) => !m.plot);

	if (moviesNeedingPlots.length === 0) {
		return movies;
	}

	console.log(`[Plots] ${moviesNeedingPlots.length} movies need plots`);

	const updatedMovies = [...movies];

	await Promise.all(
		moviesNeedingPlots.map(async (movie) => {
			// Check localStorage first
			const cachedPlot = getCachedPlot(movie.imdbID);

			let plot: string | null = null;
			let poster: string | null = null;

			if (cachedPlot !== undefined) {
				console.log(`[Plots] ${movie.imdbID} plot from cache`);
				plot = cachedPlot;
			} else {
				// Fetch from OMDb
				const details = await fetchMovieDetailsById(movie.imdbID);
				plot = details.plot;
				poster = details.poster;
			}

			if (plot) {
				// Update local array
				const idx = updatedMovies.findIndex((m) => m.imdbID === movie.imdbID);
				if (idx !== -1) {
					updatedMovies[idx] = { ...updatedMovies[idx], plot };
					if (poster && !updatedMovies[idx].poster) {
						updatedMovies[idx].poster = poster;
					}
				}

				// Update database
				try {
					await fetch(`/api/polls/${pollId}/movie-plot`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							imdbID: movie.imdbID,
							plot,
							...(poster && !movie.poster && { poster })
						})
					});
					console.log(`[Plots] ${movie.imdbID} updated in database`);
				} catch (err) {
					console.error(`[Plots] Failed to update ${movie.imdbID} in database:`, err);
				}
			}
		})
	);

	return updatedMovies;
}
