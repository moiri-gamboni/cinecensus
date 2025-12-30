/**
 * Web Worker for MiniSearch - runs search off the main thread.
 */
import MiniSearch, { type SearchResult } from 'minisearch';
import type { IMDbTitle } from '$lib/types/imdb';
import type { WorkerMessage, WorkerResponse } from './search.types';

// SearchResult with stored fields included
type SearchResultWithFields = SearchResult & {
	t: string;
	y: number;
	r?: number;
	v?: number;
};

// MiniSearch configuration - must match build script exactly
const MINISEARCH_OPTIONS = {
	fields: ['t', 'y'], // Search title and year
	storeFields: ['id', 't', 'y', 'r', 'v'],
	idField: 'id'
};

let miniSearch: MiniSearch<IMDbTitle> | null = null;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
	const { type } = e.data;

	if (type === 'init') {
		try {
			const start = performance.now();
			const response = await fetch('/search-index.json');
			if (!response.ok) throw new Error('Failed to load search index');

			const indexJson = await response.text();
			miniSearch = MiniSearch.loadJSON<IMDbTitle>(indexJson, MINISEARCH_OPTIONS);

			const elapsed = performance.now() - start;
			console.log(`[Worker] Index loaded in ${elapsed.toFixed(0)}ms (${miniSearch.documentCount} docs)`);

			self.postMessage({ type: 'ready' } satisfies WorkerResponse);
		} catch (err) {
			self.postMessage({
				type: 'error',
				error: err instanceof Error ? err.message : 'Failed to initialize search'
			} satisfies WorkerResponse);
		}
		return;
	}

	if (type === 'search') {
		const { query, limit, requestId } = e.data;

		if (!miniSearch) {
			self.postMessage({
				type: 'error',
				error: 'Search index not initialized'
			} satisfies WorkerResponse);
			return;
		}

		const start = performance.now();
		const rawResults = miniSearch.search(query, {
			fuzzy: 0.2,
			// Only prefix-match the last term (user is still typing it)
			prefix: (_term, i, terms) => i === terms.length - 1,
			// Exact=1.0, prefix=0.8, fuzzy=0.2 (fuzzy matches contribute less)
			weights: { prefix: 0.8, fuzzy: 0.2 },
			combineWith: 'AND',
			// Boost popular and highly-rated titles
			boostDocument: (_id, _term, storedFields) => {
				const votes = (storedFields?.v as number) || 0;
				const rating = (storedFields?.r as number) || 0;
				// Vote boost (logarithmic): 10=1x, 100=2.2x, 1K=3.1x, 10K=3.9x, 100K=4.6x, 1M=5.3x
				const logVotes = Math.log10(Math.max(votes, 10));
				const voteBoost = 1 + Math.pow(logVotes - 1, 0.8) * 1.2;
				// Rating boost (logarithmic): max ~1 at rating 10
				const ratingBoost = Math.log10(Math.max(rating, 1));
				return voteBoost + ratingBoost;
			}
		});

		// Normalize scores by excess terms beyond query length
		const queryTermCount = query.trim().split(/\s+/).length;
		const results = (rawResults as SearchResultWithFields[])
			.map((r) => ({
				...r,
				score: r.score / Math.sqrt(1 + Math.max(0, r.terms.length - queryTermCount))
			}))
			.sort((a, b) => b.score - a.score);

		// Log top results with scoring details
		console.log(`[Worker] Scoring for "${query}":`);
		results.slice(0, 20).forEach((r, i) => {
			const votes = (r.v as number) || 0;
			const rating = (r.r as number) || 0;
			const logVotes = Math.log10(Math.max(votes, 10));
			const voteBoost = 1 + Math.pow(logVotes - 1, 0.8) * 1.2;
			const ratingBoost = Math.log10(Math.max(rating, 1));
			const totalBoost = voteBoost + ratingBoost;
			console.log(
				`  ${i + 1}. "${r.t}" | score=${r.score.toFixed(2)} | votes=${votes} | rating=${rating} | boost=${totalBoost.toFixed(2)} | terms=[${r.terms.join(', ')}]`
			);
		});

		// Extract stored fields (MiniSearch returns SearchResult, we need IMDbTitle)
		const items = results.slice(0, limit).map((r) => ({
			id: r.id as string,
			t: r.t as string,
			y: r.y as number,
			r: r.r as number | undefined,
			v: r.v as number | undefined
		}));

		const elapsed = performance.now() - start;
		console.log(`[Worker] "${query}" → ${items.length} results in ${elapsed.toFixed(2)}ms`);

		self.postMessage({
			type: 'results',
			results: items,
			requestId
		} satisfies WorkerResponse);
	}
};
