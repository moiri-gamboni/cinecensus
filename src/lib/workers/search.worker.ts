/**
 * Web Worker for MiniSearch - runs search off the main thread.
 */
import MiniSearch from 'minisearch';
import type { IMDbTitle } from '$lib/types/imdb';

// MiniSearch configuration - must match build script exactly
const MINISEARCH_OPTIONS = {
	fields: ['t'],
	storeFields: ['id', 't', 'y', 'r', 'v'],
	idField: 'id'
};

let miniSearch: MiniSearch<IMDbTitle> | null = null;

export type WorkerMessage =
	| { type: 'init' }
	| { type: 'search'; query: string; limit: number; requestId: number };

export type WorkerResponse =
	| { type: 'ready' }
	| { type: 'results'; results: IMDbTitle[]; requestId: number }
	| { type: 'error'; error: string };

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
		const results = miniSearch.search(query, {
			fuzzy: 0.2,
			prefix: true,
			boost: { t: 2 },
			// Boost popular titles (more votes = higher score)
			boostDocument: (id, term, storedFields) => {
				const votes = (storedFields?.v as number) || 0;
				// Log scale boost: 1M votes = 3x boost, 100K = 2.5x, 10K = 2x, 1K = 1.5x
				return 1 + Math.log10(Math.max(votes, 1)) / 4;
			}
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
