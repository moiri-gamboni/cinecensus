import { describe, it, expect } from 'vitest';
import { parseOMDbResponse } from '$lib/utils/omdb';
import type { OMDbSearchResponse } from '$lib/types/omdb';

describe('parseOMDbResponse', () => {
	it('parses successful response with movies', () => {
		const response: OMDbSearchResponse = {
			Response: 'True',
			Search: [
				{
					Title: 'The Matrix',
					Year: '1999',
					imdbID: 'tt0133093',
					Type: 'movie',
					Poster: 'https://example.com/matrix.jpg'
				},
				{
					Title: 'The Matrix Reloaded',
					Year: '2003',
					imdbID: 'tt0234215',
					Type: 'movie',
					Poster: 'N/A'
				}
			],
			totalResults: '2'
		};

		const result = parseOMDbResponse(response);

		expect(result.error).toBeUndefined();
		expect(result.results).toHaveLength(2);
		expect(result.results[0]).toEqual({
			imdbID: 'tt0133093',
			title: 'The Matrix',
			year: '1999',
			poster: 'https://example.com/matrix.jpg'
		});
		expect(result.results[1]).toEqual({
			imdbID: 'tt0234215',
			title: 'The Matrix Reloaded',
			year: '2003',
			poster: null // N/A should become null
		});
	});

	it('returns empty results for "Movie not found" response', () => {
		const response: OMDbSearchResponse = {
			Response: 'False',
			Error: 'Movie not found!'
		};

		const result = parseOMDbResponse(response);

		expect(result.error).toBeUndefined();
		expect(result.results).toEqual([]);
	});

	it('returns error for invalid API key', () => {
		const response: OMDbSearchResponse = {
			Response: 'False',
			Error: 'Invalid API key!'
		};

		const result = parseOMDbResponse(response);

		expect(result.error).toBe('Invalid OMDb API key');
		expect(result.results).toEqual([]);
	});

	it('handles response with no Search array', () => {
		const response: OMDbSearchResponse = {
			Response: 'True'
		};

		const result = parseOMDbResponse(response);

		expect(result.error).toBeUndefined();
		expect(result.results).toEqual([]);
	});

	it('handles empty Search array', () => {
		const response: OMDbSearchResponse = {
			Response: 'True',
			Search: [],
			totalResults: '0'
		};

		const result = parseOMDbResponse(response);

		expect(result.error).toBeUndefined();
		expect(result.results).toEqual([]);
	});
});
