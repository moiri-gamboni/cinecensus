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
 * Find minimum set of search terms to cover all movies.
 * Uses a greedy set cover algorithm.
 */
export function findOptimalSearchTerms(movies: MovieWithRating[], maxTerms = 3): string[] {
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

	// Greedy: pick word that covers most uncovered movies
	while (uncovered.size > 0 && selectedTerms.length < maxTerms) {
		let bestWord = '';
		let bestCoverage = 0;

		for (const [word, movieIds] of wordToMovies) {
			const coverage = [...movieIds].filter((id) => uncovered.has(id)).length;
			if (coverage > bestCoverage) {
				bestCoverage = coverage;
				bestWord = word;
			}
		}

		if (bestCoverage === 0) break;

		selectedTerms.push(bestWord);
		for (const id of wordToMovies.get(bestWord)!) {
			uncovered.delete(id);
		}
	}

	return selectedTerms;
}

/**
 * Fetch movies from OMDb API.
 */
async function fetchOMDb(query: string): Promise<OMDbSearchResult> {
	try {
		const response = await fetch(`/api/movies?q=${encodeURIComponent(query)}`);
		return await response.json();
	} catch {
		return { results: [], error: 'Failed to fetch' };
	}
}

/**
 * Fetch posters for movies using optimal OMDb searches.
 * Returns updated movies with posters + any new movies from OMDb.
 */
export async function fetchPostersAndMerge(
	localMovies: MovieWithRating[],
	originalQuery: string
): Promise<{
	movies: MovieWithRating[];
	newFromOMDb: MovieWithRating[];
}> {
	// First, apply any cached posters
	const moviesWithCached = localMovies.map((m) => {
		const cached = getCachedPoster(m.imdbID);
		return cached !== undefined ? { ...m, poster: cached } : m;
	});

	// Find movies still needing posters
	const needPosters = moviesWithCached.filter((m) => m.poster === null);
	if (needPosters.length === 0) {
		return { movies: moviesWithCached, newFromOMDb: [] };
	}

	// Find optimal search terms
	const searchTerms = findOptimalSearchTerms(needPosters);

	// Also include original query if not covered
	if (!searchTerms.includes(originalQuery.toLowerCase())) {
		searchTerms.push(originalQuery);
	}

	// Filter out already-queried terms
	const newTerms = searchTerms.filter((term) => !queriedTerms.has(term.toLowerCase()));

	// Fetch from OMDb for each term
	const allOMDbMovies: Movie[] = [];
	const omdbById = new Map<string, Movie>();

	await Promise.all(
		newTerms.map(async (term) => {
			queriedTerms.add(term.toLowerCase());
			const result = await fetchOMDb(term);
			for (const movie of result.results) {
				if (!omdbById.has(movie.imdbID)) {
					omdbById.set(movie.imdbID, movie);
					allOMDbMovies.push(movie);
				}
			}
		})
	);

	// Apply posters to local movies
	const localIds = new Set(moviesWithCached.map((m) => m.imdbID));
	const updatedMovies = moviesWithCached.map((m) => {
		if (m.poster === null) {
			const omdb = omdbById.get(m.imdbID);
			if (omdb?.poster) {
				cachePoster(m.imdbID, omdb.poster);
				return { ...m, poster: omdb.poster };
			}
		}
		return m;
	});

	// Find new movies from OMDb not in local results
	const newFromOMDb: MovieWithRating[] = [];
	for (const omdbMovie of allOMDbMovies) {
		if (!localIds.has(omdbMovie.imdbID)) {
			cachePoster(omdbMovie.imdbID, omdbMovie.poster);
			newFromOMDb.push({
				...omdbMovie,
				rating: undefined // OMDb search doesn't return ratings
			});
		}
	}

	return { movies: updatedMovies, newFromOMDb };
}

/**
 * Reset the query cache (useful for testing or new sessions).
 */
export function resetQueryCache(): void {
	queriedTerms.clear();
}
