import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { OMDbDetailResponse } from '$lib/types/omdb';
import type { Movie } from '$lib/types/poll';
import { searchBestMatch } from '$lib/utils/server-search';
import { toImdbId } from '$lib/types/imdb';

// GET: Fetch single movie by IMDb ID
export const GET: RequestHandler = async ({ url, platform }) => {
	const apiKey = platform?.env?.OMDB_API_KEY;

	if (!apiKey) {
		console.error('[Resolve] OMDB_API_KEY not configured');
		return json({ error: 'OMDB_API_KEY not configured' }, { status: 500 });
	}

	const imdbID = url.searchParams.get('i');
	if (!imdbID) {
		return json({ error: 'i parameter required' }, { status: 400 });
	}

	console.log(`[Resolve] Fetching by ID: ${imdbID}`);

	try {
		const response = await fetch(`https://www.omdbapi.com/?apikey=${apiKey}&i=${imdbID}`);
		const data: OMDbDetailResponse = await response.json();

		if (data.Response === 'False') {
			console.log(`[Resolve] ${imdbID} → not found`);
			return json({ movie: null });
		}

		const hasPoster = data.Poster !== 'N/A';
		console.log(`[Resolve] ${imdbID} → "${data.Title}" (${data.Year}) ${hasPoster ? '🖼️' : '❌'}`);

		const hasPlot = data.Plot && data.Plot !== 'N/A';
		return json({
			movie: {
				imdbID: data.imdbID,
				title: data.Title,
				year: data.Year,
				poster: hasPoster ? data.Poster : null,
				plot: hasPlot ? data.Plot : undefined
			}
		});
	} catch (err) {
		console.error(`[Resolve] ${imdbID} failed:`, err);
		return json({ error: 'Failed to fetch' }, { status: 500 });
	}
};

// POST: Resolve multiple titles to movies using local search index
export const POST: RequestHandler = async ({ request, url }) => {
	const { titles } = (await request.json()) as { titles: string[] };

	if (!titles || !Array.isArray(titles)) {
		console.error('[Resolve] Invalid request: titles array required');
		return json({ error: 'titles array required' }, { status: 400 });
	}

	console.log(`[Resolve] Resolving ${titles.length} titles:`, titles);
	const start = performance.now();

	// Use origin for fetching the search index
	const baseUrl = url.origin;

	const results: (Movie | null)[] = await Promise.all(
		titles.map(async (title) => {
			const trimmed = title.trim();
			if (!trimmed) {
				console.log(`[Resolve] Skipping empty title`);
				return null;
			}

			try {
				// Use local search with same ranking as autocomplete
				const match = await searchBestMatch(trimmed, baseUrl);

				if (!match) {
					console.log(`[Resolve] "${trimmed}" → no results`);
					return null;
				}

				const imdbID = toImdbId(match.id);
				console.log(
					`[Resolve] "${trimmed}" → ${imdbID} "${match.t}" (${match.y}) ⭐${match.r ?? 0} 👥${match.v ?? 0}`
				);

				return {
					imdbID,
					title: match.t,
					year: String(match.y),
					poster: null // Poster fetched separately via MovieCard
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
