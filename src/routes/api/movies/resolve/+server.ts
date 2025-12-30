import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { OMDbSearchResponse } from '$lib/types/omdb';
import type { Movie } from '$lib/types/poll';

export const POST: RequestHandler = async ({ request, platform }) => {
	const apiKey = platform?.env?.OMDB_API_KEY;

	if (!apiKey) {
		console.error('[Resolve] OMDB_API_KEY not configured');
		return json({ error: 'OMDB_API_KEY not configured' }, { status: 500 });
	}

	const { titles } = (await request.json()) as { titles: string[] };

	if (!titles || !Array.isArray(titles)) {
		console.error('[Resolve] Invalid request: titles array required');
		return json({ error: 'titles array required' }, { status: 400 });
	}

	console.log(`[Resolve] Resolving ${titles.length} titles:`, titles);
	const start = performance.now();

	const results: (Movie | null)[] = await Promise.all(
		titles.map(async (title) => {
			const trimmed = title.trim();
			if (!trimmed) {
				console.log(`[Resolve] Skipping empty title`);
				return null;
			}

			try {
				const response = await fetch(
					`https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(trimmed)}&type=movie`
				);

				const data: OMDbSearchResponse = await response.json();

				if (data.Response === 'False' || !data.Search?.length) {
					console.log(`[Resolve] "${trimmed}" → no results`);
					return null;
				}

				const first = data.Search[0];
				const hasPoster = first.Poster !== 'N/A';
				console.log(
					`[Resolve] "${trimmed}" → ${first.imdbID} "${first.Title}" (${first.Year}) ${hasPoster ? '🖼️' : '❌'}`
				);
				return {
					imdbID: first.imdbID,
					title: first.Title,
					year: first.Year,
					poster: hasPoster ? first.Poster : null
				};
			} catch (err) {
				console.error(`[Resolve] "${trimmed}" failed:`, err);
				return null;
			}
		})
	);

	const elapsed = performance.now() - start;
	const found = results.filter(Boolean).length;
	console.log(`[Resolve] Completed: ${found}/${titles.length} resolved in ${elapsed.toFixed(0)}ms`);

	return json({ results });
};
