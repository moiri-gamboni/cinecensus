import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { OMDbSearchResponse } from '$lib/types/omdb';
import type { Movie } from '$lib/types/poll';

export const GET: RequestHandler = async ({ url, platform }) => {
	const query = url.searchParams.get('q');

	if (!query || query.length < 2) {
		return json({ results: [] });
	}

	const apiKey = platform?.env?.OMDB_API_KEY;

	if (!apiKey) {
		return json({ error: 'OMDB_API_KEY not configured' }, { status: 500 });
	}

	try {
		const response = await fetch(
			`https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query)}&type=movie`
		);

		const data: OMDbSearchResponse = await response.json();

		if (data.Response === 'False') {
			return json({ results: [] });
		}

		const results: Movie[] =
			data.Search?.map((m) => ({
				imdbID: m.imdbID,
				title: m.Title,
				year: m.Year,
				poster: m.Poster !== 'N/A' ? m.Poster : null
			})) ?? [];

		return json({ results });
	} catch (error) {
		console.error('OMDb API error:', error);
		return json({ error: 'Failed to search movies' }, { status: 500 });
	}
};
