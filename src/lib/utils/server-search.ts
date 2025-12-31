/**
 * Server-side search using MiniSearch.
 * Uses the same ranking algorithm as the client-side worker.
 */
import MiniSearch, { type SearchResult } from 'minisearch';
import type { IMDbTitle } from '$lib/types/imdb';

// SearchResult with stored fields included
type SearchResultWithFields = SearchResult & {
	t: string;
	y: number;
	r?: number;
	v?: number;
};

// MiniSearch configuration - must match build script and worker exactly
const MINISEARCH_OPTIONS = {
	fields: ['t', 'y'],
	storeFields: ['id', 't', 'y', 'r', 'v'],
	idField: 'id'
};

let miniSearch: MiniSearch<IMDbTitle> | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the search index from the static file.
 * Must be called with the base URL to fetch from.
 */
async function initSearch(baseUrl: string): Promise<void> {
	if (miniSearch) return;

	if (!initPromise) {
		initPromise = (async () => {
			const start = performance.now();
			const response = await fetch(`${baseUrl}/search-index.json`);
			if (!response.ok) {
				throw new Error(`Failed to load search index: ${response.status}`);
			}

			const indexJson = await response.text();
			miniSearch = MiniSearch.loadJSON<IMDbTitle>(indexJson, MINISEARCH_OPTIONS);

			const elapsed = performance.now() - start;
			console.log(`[ServerSearch] Index loaded in ${elapsed.toFixed(0)}ms (${miniSearch.documentCount} docs)`);
		})();
	}

	return initPromise;
}

/**
 * Search for the best match for a title.
 * Uses the same ranking algorithm as the client-side autocomplete.
 */
export async function searchBestMatch(query: string, baseUrl: string): Promise<IMDbTitle | null> {
	if (query.length < 2) return null;

	await initSearch(baseUrl);
	if (!miniSearch) return null;

	const rawResults = miniSearch.search(query, {
		fuzzy: 0.2,
		prefix: (_term, i, terms) => i === terms.length - 1,
		weights: { prefix: 0.8, fuzzy: 0.2 },
		combineWith: 'AND',
		// Same boost logic as worker
		boostDocument: (_id, _term, storedFields) => {
			const votes = (storedFields?.v as number) || 0;
			const rating = (storedFields?.r as number) || 0;
			const logVotes = Math.log10(Math.max(votes, 10));
			const voteBoost = 1 + Math.pow(logVotes - 1, 0.8) * 1.2;
			const ratingBoost = Math.log10(Math.max(rating, 1));
			return voteBoost + ratingBoost;
		}
	});

	if (rawResults.length === 0) return null;

	// Normalize scores by excess terms beyond query length
	const queryTermCount = query.trim().split(/\s+/).length;
	const results = (rawResults as SearchResultWithFields[])
		.map((r) => ({
			...r,
			score: r.score / Math.sqrt(1 + Math.max(0, r.terms.length - queryTermCount))
		}))
		.sort((a, b) => b.score - a.score);

	const best = results[0];
	return {
		id: best.id as string,
		t: best.t,
		y: best.y,
		r: best.r,
		v: best.v
	};
}
