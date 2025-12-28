import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { OMDbSearchResponse } from '$lib/types/omdb';
import type { Movie } from '$lib/types/poll';

export const POST: RequestHandler = async ({ request, platform }) => {
	const apiKey = platform?.env?.OMDB_API_KEY;

	if (!apiKey) {
		return json({ error: 'OMDB_API_KEY not configured' }, { status: 500 });
	}

	const { titles } = (await request.json()) as { titles: string[] };

	if (!titles || !Array.isArray(titles)) {
		return json({ error: 'titles array required' }, { status: 400 });
	}

	const results: (Movie | null)[] = await Promise.all(
		titles.map(async (title) => {
			const trimmed = title.trim();
			if (!trimmed) return null;

			try {
				const response = await fetch(
					`https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(trimmed)}&type=movie`
				);

				const data: OMDbSearchResponse = await response.json();

				if (data.Response === 'False' || !data.Search?.length) {
					return null;
				}

				const first = data.Search[0];
				return {
					imdbID: first.imdbID,
					title: first.Title,
					year: first.Year,
					poster: first.Poster !== 'N/A' ? first.Poster : null
				};
			} catch {
				return null;
			}
		})
	);

	return json({ results });
};
