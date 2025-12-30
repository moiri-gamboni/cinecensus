import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { OMDbSearchResponse } from '$lib/types/omdb';
import { parseOMDbResponse } from '$lib/utils/omdb';

export const GET: RequestHandler = async ({ url, platform }) => {
	const query = url.searchParams.get('q');

	if (!query || query.length < 2) {
		return json({ results: [] });
	}

	const apiKey = platform?.env?.OMDB_API_KEY;

	if (!apiKey) {
		console.error('OMDB_API_KEY not found in platform.env');
		return json({ error: 'OMDB_API_KEY not configured' }, { status: 500 });
	}

	try {
		// OMDb only supports single type filter, so we fetch all and filter in parseOMDbResponse
		const omdbUrl = `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query)}`;
		const response = await fetch(omdbUrl);
		const data: OMDbSearchResponse = await response.json();

		const parsed = parseOMDbResponse(data);

		if (parsed.error) {
			console.error('OMDb API error:', parsed.error);
			return json({ error: parsed.error }, { status: 500 });
		}

		return json({ results: parsed.results });
	} catch (error) {
		console.error('OMDb API fetch error:', error);
		return json({ error: 'Failed to search movies' }, { status: 500 });
	}
};
