import type { Movie } from '$lib/types/poll';
import type { MovieWithRating } from './movie-search';

const POSTER_CACHE_KEY = 'cinecensus_posters';
const POSTER_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// Stop words to skip when extracting search terms
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'to', 'for', 'is', 'on', 'at']);

interface PosterCache {
	[imdbID: string]: {
		poster: string | null;
		timestamp: number;
	};
}

interface OMDbSearchResult {
	results: Movie[];
	error?: string;
}

// Track which queries we've already made this session
const queriedTerms = new Set<string>();

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
 * Extract significant words from a title for grouping.
 */
function extractWords(title: string): string[] {
	return title
		.toLowerCase()
		.split(/[\s:,\-–—]+/)
		.filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

/**
 * Check if a query is meaningful (not just stop words).
 */
function isValidSearchQuery(query: string): boolean {
	const words = extractWords(query);
	return words.length > 0;
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
 * Returns updated movies with posters + any new movies from OMDb.
 */
export async function fetchPostersAndMerge(
	localMovies: MovieWithRating[],
	originalQuery: string,
	visibleCount = 10
): Promise<{
	movies: MovieWithRating[];
	newFromOMDb: MovieWithRating[];
}> {
	console.log(
		`[Poster] Starting fetch for ${localMovies.length} local movies (visible: ${visibleCount}), query="${originalQuery}"`,
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
		return { movies: moviesWithCached, newFromOMDb: [] };
	}

	// Find optimal search terms for visible movies needing posters
	const searchTerms = findOptimalSearchTerms(needPosters);

	// Also include original query if it's valid (not just stop words) and not already covered
	if (isValidSearchQuery(originalQuery) && !searchTerms.includes(originalQuery.toLowerCase())) {
		searchTerms.push(originalQuery.toLowerCase());
	}

	// Filter out already-queried terms
	const newTerms = searchTerms.filter((term) => !queriedTerms.has(term.toLowerCase()));
	const skippedTerms = searchTerms.filter((term) => queriedTerms.has(term.toLowerCase()));

	if (skippedTerms.length > 0) {
		console.log(`[Poster] Skipping already-queried terms: [${skippedTerms.join(', ')}]`);
	}

	if (newTerms.length === 0) {
		console.log('[Poster] No new terms to query');
		return { movies: moviesWithCached, newFromOMDb: [] };
	}

	console.log(`[Poster] Fetching ${newTerms.length} OMDb queries: [${newTerms.join(', ')}]`);

	// Fetch from OMDb for each term
	const omdbById = new Map<string, Movie>();
	const originalQueryResults: Movie[] = []; // Only results from original query (for freshness)
	const originalQueryLower = originalQuery.toLowerCase();

	await Promise.all(
		newTerms.map(async (term) => {
			queriedTerms.add(term.toLowerCase());
			const result = await fetchOMDb(term);
			for (const movie of result.results) {
				// Cache ALL posters from OMDb (even from poster-fetch queries)
				if (movie.poster) {
					cachePoster(movie.imdbID, movie.poster);
				}

				if (!omdbById.has(movie.imdbID)) {
					omdbById.set(movie.imdbID, movie);
					// Only track results from original query for "new from OMDb"
					if (term === originalQueryLower) {
						originalQueryResults.push(movie);
					}
				}
			}
		})
	);

	// Apply posters to local movies
	const localIds = new Set(moviesWithCached.map((m) => m.imdbID));
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

	// Find new movies from OMDb not in local results (only from original query for relevance)
	const newFromOMDb: MovieWithRating[] = [];
	for (const omdbMovie of originalQueryResults) {
		if (!localIds.has(omdbMovie.imdbID)) {
			cachePoster(omdbMovie.imdbID, omdbMovie.poster);
			newFromOMDb.push({
				...omdbMovie,
				rating: undefined // OMDb search doesn't return ratings
			});
		}
	}

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
	if (newFromOMDb.length > 0) {
		console.log(
			`[Poster] New from OMDb (${newFromOMDb.length}):`,
			newFromOMDb.map((m) => `${m.imdbID} ${m.title} (${m.year})`)
		);
	}

	return { movies: updatedMovies, newFromOMDb };
}

/**
 * Reset the query cache (useful for testing or new sessions).
 */
export function resetQueryCache(): void {
	queriedTerms.clear();
}

/**
 * Fetch poster for a single movie by IMDb ID.
 * Used when selecting a movie that hasn't had its poster fetched yet.
 */
export async function fetchPosterById(imdbID: string): Promise<string | null> {
	// Check cache first
	const cached = getCachedPoster(imdbID);
	if (cached !== undefined) {
		console.log(`[Poster] ${imdbID} already cached: ${cached ? '🖼️' : '❌'}`);
		return cached;
	}

	console.log(`[Poster] Fetching poster by ID: ${imdbID}`);
	try {
		const response = await fetch(`/api/movies/resolve?i=${encodeURIComponent(imdbID)}`);
		const result = await response.json();

		if (result.movie?.poster) {
			cachePoster(imdbID, result.movie.poster);
			console.log(`[Poster] ${imdbID} fetched: 🖼️`);
			return result.movie.poster;
		} else {
			// Cache as null so we don't retry
			cachePoster(imdbID, null);
			console.log(`[Poster] ${imdbID} has no poster`);
			return null;
		}
	} catch (err) {
		console.error(`[Poster] Failed to fetch ${imdbID}:`, err);
		return null;
	}
}
