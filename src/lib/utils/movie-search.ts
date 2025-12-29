import Fuse, { type IFuseOptions } from 'fuse.js';
import { toImdbId, type IMDbTitle } from '$lib/types/imdb';
import type { Movie } from '$lib/types/poll';

let titlesPromise: Promise<IMDbTitle[]> | null = null;
let fuseInstance: Fuse<IMDbTitle> | null = null;

const FUSE_OPTIONS: IFuseOptions<IMDbTitle> = {
	keys: ['t'], // Search primaryTitle
	threshold: 0.15, // Fuzzy tolerance (0=exact, 1=match anything)
	distance: 100, // Character distance for fuzzy match
	minMatchCharLength: 2,
	includeScore: true
};

/**
 * Lazy-load the IMDb titles dataset.
 */
async function loadTitles(): Promise<IMDbTitle[]> {
	if (!titlesPromise) {
		titlesPromise = fetch('/imdb-titles.json')
			.then((res) => {
				if (!res.ok) throw new Error('Failed to load titles');
				return res.json();
			})
			.catch((err) => {
				titlesPromise = null; // Allow retry on failure
				throw err;
			});
	}
	return titlesPromise;
}

/**
 * Get or create the Fuse.js instance.
 */
async function getFuse(): Promise<Fuse<IMDbTitle>> {
	if (!fuseInstance) {
		const titles = await loadTitles();
		fuseInstance = new Fuse(titles, FUSE_OPTIONS);
	}
	return fuseInstance;
}

/**
 * Search local IMDb titles using fuzzy matching.
 * Returns results immediately without posters.
 */
export async function searchLocalTitles(query: string, limit = 20): Promise<IMDbTitle[]> {
	if (query.length < 2) return [];

	const start = performance.now();
	const fuse = await getFuse();
	const indexTime = performance.now() - start;

	const searchStart = performance.now();
	const results = fuse.search(query, { limit });
	const searchTime = performance.now() - searchStart;

	const items = results.map((r) => r.item);
	console.log(
		`[Fuse] "${query}" → ${results.length} results (index: ${indexTime.toFixed(0)}ms, search: ${searchTime.toFixed(1)}ms)`,
		items.map((t) => `tt${t.id} ${t.t} (${t.y}) [${t.ty}] ⭐${t.r}`)
	);

	return items;
}

/**
 * Convert an IMDbTitle to a Movie object.
 * Poster is null initially - will be fetched separately.
 */
export function toMovie(title: IMDbTitle): Movie {
	return {
		imdbID: toImdbId(title.id),
		title: title.t,
		year: String(title.y),
		poster: null
	};
}

/**
 * Extended Movie with rating info for display.
 */
export interface MovieWithRating extends Movie {
	rating?: number;
	votes?: number;
}

/**
 * Convert an IMDbTitle to a MovieWithRating object.
 */
export function toMovieWithRating(title: IMDbTitle): MovieWithRating {
	return {
		imdbID: toImdbId(title.id),
		title: title.t,
		year: String(title.y),
		poster: null,
		rating: title.r
	};
}

/**
 * Check if the titles dataset is loaded.
 */
export function isLoaded(): boolean {
	return fuseInstance !== null;
}

/**
 * Preload the titles dataset (call on app init if desired).
 */
export async function preload(): Promise<void> {
	await getFuse();
}
