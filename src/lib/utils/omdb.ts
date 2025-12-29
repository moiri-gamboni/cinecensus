import type { OMDbSearchResponse } from '$lib/types/omdb';
import type { Movie } from '$lib/types/poll';

export function parseOMDbResponse(data: OMDbSearchResponse): { results: Movie[]; error?: string } {
	if (data.Response === 'False') {
		if (data.Error === 'Invalid API key!') {
			return { results: [], error: 'Invalid OMDb API key' };
		}
		// "Movie not found" or similar - not an error, just no results
		return { results: [] };
	}

	const results: Movie[] =
		data.Search?.map((m) => ({
			imdbID: m.imdbID,
			title: m.Title,
			year: m.Year,
			poster: m.Poster !== 'N/A' ? m.Poster : null
		})) ?? [];

	return { results };
}
