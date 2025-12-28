import { describe, it, expect } from 'vitest';
import { tallyVotes } from './voting-algorithms';
import type { Movie } from '$lib/types/poll';

const movies: Movie[] = [
	{ imdbID: 'tt1', title: 'Movie A', year: '2020', poster: null },
	{ imdbID: 'tt2', title: 'Movie B', year: '2021', poster: null },
	{ imdbID: 'tt3', title: 'Movie C', year: '2022', poster: null }
];

describe('tallyVotes', () => {
	describe('approval voting', () => {
		it('counts approvals correctly', () => {
			const votes = [
				{ vote_data: ['tt1', 'tt2'] },
				{ vote_data: ['tt1', 'tt3'] },
				{ vote_data: ['tt1'] }
			];

			const result = tallyVotes('approval', movies, votes);

			expect(result.method).toBe('approval');
			if (result.method === 'approval') {
				expect(result.results[0].movie.imdbID).toBe('tt1');
				expect(result.results[0].count).toBe(3);
				expect(result.winner?.imdbID).toBe('tt1');
			}
		});

		it('returns null winner with no votes', () => {
			const result = tallyVotes('approval', movies, []);

			expect(result.method).toBe('approval');
			expect(result.winner).toBeNull();
		});
	});

	describe('single vote', () => {
		it('counts single votes correctly', () => {
			const votes = [
				{ vote_data: 'tt1' },
				{ vote_data: 'tt2' },
				{ vote_data: 'tt1' }
			];

			const result = tallyVotes('single', movies, votes);

			expect(result.method).toBe('single');
			if (result.method === 'single') {
				expect(result.results[0].movie.imdbID).toBe('tt1');
				expect(result.results[0].count).toBe(2);
				expect(result.results[0].percentage).toBeCloseTo(66.67, 0);
				expect(result.winner?.imdbID).toBe('tt1');
			}
		});
	});

	describe('ranked choice voting', () => {
		it('wins on first round with majority', () => {
			const votes = [
				{ vote_data: ['tt1', 'tt2', 'tt3'] },
				{ vote_data: ['tt1', 'tt3', 'tt2'] },
				{ vote_data: ['tt2', 'tt1', 'tt3'] }
			];

			const result = tallyVotes('ranked', movies, votes);

			expect(result.method).toBe('ranked');
			if (result.method === 'ranked') {
				expect(result.winner?.imdbID).toBe('tt1');
			}
		});

		it('eliminates lowest and transfers votes', () => {
			const votes = [
				{ vote_data: ['tt1', 'tt2', 'tt3'] },
				{ vote_data: ['tt2', 'tt1', 'tt3'] },
				{ vote_data: ['tt3', 'tt1', 'tt2'] },
				{ vote_data: ['tt3', 'tt2', 'tt1'] }
			];

			const result = tallyVotes('ranked', movies, votes);

			expect(result.method).toBe('ranked');
			if (result.method === 'ranked') {
				// First round: tt1=1, tt2=1, tt3=2
				// tt1 or tt2 eliminated (tt1 first alphabetically)
				// Second round: remaining candidates
				expect(result.results.rounds.length).toBeGreaterThan(0);
				expect(result.winner).not.toBeNull();
			}
		});

		it('returns null winner with no votes', () => {
			const result = tallyVotes('ranked', movies, []);

			expect(result.method).toBe('ranked');
			expect(result.winner).toBeNull();
		});
	});

	describe('rating voting', () => {
		it('calculates median correctly', () => {
			const votes = [
				{ vote_data: { tt1: 5, tt2: 3, tt3: 2 } },
				{ vote_data: { tt1: 4, tt2: 4, tt3: 3 } },
				{ vote_data: { tt1: 5, tt2: 2, tt3: 1 } }
			];

			const result = tallyVotes('rating', movies, votes);

			expect(result.method).toBe('rating');
			if (result.method === 'rating') {
				// tt1: [4, 5, 5] -> median = 5
				// tt2: [2, 3, 4] -> median = 3
				// tt3: [1, 2, 3] -> median = 2
				expect(result.results[0].movie.imdbID).toBe('tt1');
				expect(result.results[0].median).toBe(5);
				expect(result.winner?.imdbID).toBe('tt1');
			}
		});

		it('uses mean as tiebreaker', () => {
			const votes = [
				{ vote_data: { tt1: 4, tt2: 4 } },
				{ vote_data: { tt1: 4, tt2: 5 } },
				{ vote_data: { tt1: 5, tt2: 3 } }
			];

			const result = tallyVotes('rating', movies, votes);

			expect(result.method).toBe('rating');
			if (result.method === 'rating') {
				// Both have median 4, but means differ
				// tt1: [4, 4, 5] -> mean = 4.33
				// tt2: [3, 4, 5] -> mean = 4.0
				const tt1Result = result.results.find((r) => r.movie.imdbID === 'tt1');
				const tt2Result = result.results.find((r) => r.movie.imdbID === 'tt2');
				expect(tt1Result?.mean).toBeGreaterThan(tt2Result?.mean ?? 0);
			}
		});

		it('calculates even-length median correctly', () => {
			const votes = [
				{ vote_data: { tt1: 3 } },
				{ vote_data: { tt1: 5 } }
			];

			const result = tallyVotes('rating', movies, votes);

			expect(result.method).toBe('rating');
			if (result.method === 'rating') {
				// [3, 5] -> median = (3 + 5) / 2 = 4
				const tt1Result = result.results.find((r) => r.movie.imdbID === 'tt1');
				expect(tt1Result?.median).toBe(4);
			}
		});
	});
});
