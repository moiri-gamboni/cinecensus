import type { IMDbTitle } from '$lib/types/imdb';

export type WorkerMessage =
	| { type: 'init' }
	| { type: 'search'; query: string; limit: number; requestId: number };

export type WorkerResponse =
	| { type: 'ready' }
	| { type: 'results'; results: IMDbTitle[]; requestId: number }
	| { type: 'error'; error: string };
