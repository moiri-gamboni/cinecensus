import { toImdbId, type IMDbTitle } from '$lib/types/imdb';
import type { Movie } from '$lib/types/poll';
import type { WorkerMessage, WorkerResponse } from '$lib/workers/search.worker';

let worker: Worker | null = null;
let workerReady = false;
let initPromise: Promise<void> | null = null;
let requestId = 0;
const pendingRequests = new Map<number, { resolve: (results: IMDbTitle[]) => void; reject: (err: Error) => void }>();

/**
 * Get or create the search worker.
 */
function getWorker(): Worker {
	if (!worker) {
		worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), { type: 'module' });

		worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
			const { type } = e.data;

			if (type === 'ready') {
				workerReady = true;
				return;
			}

			if (type === 'results') {
				const { results, requestId: rid } = e.data;
				const pending = pendingRequests.get(rid);
				if (pending) {
					pending.resolve(results);
					pendingRequests.delete(rid);
				}
				return;
			}

			if (type === 'error') {
				console.error('[Search] Worker error:', e.data.error);
				// Reject all pending requests
				for (const [rid, pending] of pendingRequests) {
					pending.reject(new Error(e.data.error));
					pendingRequests.delete(rid);
				}
			}
		};

		worker.onerror = (err) => {
			console.error('[Search] Worker error:', err);
		};
	}
	return worker;
}

/**
 * Initialize the worker and load the search index.
 */
async function initWorker(): Promise<void> {
	if (workerReady) return;

	if (!initPromise) {
		initPromise = new Promise<void>((resolve, reject) => {
			const w = getWorker();

			const timeout = setTimeout(() => {
				reject(new Error('Worker initialization timed out'));
			}, 10000);

			const originalOnMessage = w.onmessage;
			w.onmessage = (e: MessageEvent<WorkerResponse>) => {
				if (e.data.type === 'ready') {
					clearTimeout(timeout);
					workerReady = true;
					w.onmessage = originalOnMessage;
					resolve();
				} else if (e.data.type === 'error') {
					clearTimeout(timeout);
					reject(new Error(e.data.error));
				}
				// Also call original handler
				originalOnMessage?.call(w, e);
			};

			w.postMessage({ type: 'init' } satisfies WorkerMessage);
		});
	}

	return initPromise;
}

/**
 * Search local IMDb titles using fuzzy matching.
 * Returns results immediately without posters.
 */
export async function searchLocalTitles(query: string, limit = 20): Promise<IMDbTitle[]> {
	if (query.length < 2) return [];

	const start = performance.now();
	await initWorker();
	const initTime = performance.now() - start;

	return new Promise((resolve, reject) => {
		const rid = ++requestId;
		pendingRequests.set(rid, { resolve, reject });

		const searchStart = performance.now();
		getWorker().postMessage({
			type: 'search',
			query,
			limit,
			requestId: rid
		} satisfies WorkerMessage);

		// Log when results come back
		const originalResolve = resolve;
		pendingRequests.set(rid, {
			resolve: (results) => {
				const searchTime = performance.now() - searchStart;
				console.log(
					`[Search] "${query}" → ${results.length} results (init: ${initTime.toFixed(0)}ms, search: ${searchTime.toFixed(1)}ms)`,
					results.map((t) => `tt${t.id} ${t.t} (${t.y}) ⭐${t.r} 👥${t.v}`)
				);
				originalResolve(results);
			},
			reject
		});
	});
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
 * Check if the search index is loaded.
 */
export function isLoaded(): boolean {
	return workerReady;
}

/**
 * Preload the search index (call on app init if desired).
 */
export async function preload(): Promise<void> {
	await initWorker();
}
