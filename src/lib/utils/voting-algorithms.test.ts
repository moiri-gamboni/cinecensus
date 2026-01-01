import { describe, it, expect } from 'vitest';
import { tallyVotes } from './voting-algorithms';
import type { Movie } from '$lib/types/poll';

const movies: Movie[] = [
	{ imdbID: 'tt1', title: 'Movie A', year: '2020', poster: null },
	{ imdbID: 'tt2', title: 'Movie B', year: '2021', poster: null },
	{ imdbID: 'tt3', title: 'Movie C', year: '2022', poster: null }
];

// Movies with IMDb ratings for tiebreaker tests
const moviesWithRatings: Movie[] = [
	{ imdbID: 'tt1', title: 'Movie A', year: '2020', poster: null, rating: 7.5 },
	{ imdbID: 'tt2', title: 'Movie B', year: '2021', poster: null, rating: 8.2 },
	{ imdbID: 'tt3', title: 'Movie C', year: '2022', poster: null, rating: 6.0 }
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

	describe('IMDb rating tiebreaker', () => {
		it('breaks approval voting ties by IMDb rating', () => {
			// tt1 and tt2 both get 2 votes, but tt2 has higher IMDb rating (8.2 vs 7.5)
			const votes = [
				{ vote_data: ['tt1', 'tt2'] },
				{ vote_data: ['tt1', 'tt2'] }
			];

			const result = tallyVotes('approval', moviesWithRatings, votes);

			expect(result.method).toBe('approval');
			if (result.method === 'approval') {
				expect(result.results[0].count).toBe(2);
				expect(result.results[1].count).toBe(2);
				// tt2 should be first due to higher IMDb rating
				expect(result.results[0].movie.imdbID).toBe('tt2');
				expect(result.results[1].movie.imdbID).toBe('tt1');
			}
		});

		it('breaks single voting ties by IMDb rating', () => {
			// tt1 and tt2 both get 1 vote each
			const votes = [{ vote_data: 'tt1' }, { vote_data: 'tt2' }];

			const result = tallyVotes('single', moviesWithRatings, votes);

			expect(result.method).toBe('single');
			if (result.method === 'single') {
				// tt2 should be first due to higher IMDb rating (8.2 vs 7.5)
				expect(result.results[0].movie.imdbID).toBe('tt2');
				expect(result.winner?.imdbID).toBe('tt2');
			}
		});

		it('eliminates lowest IMDb rated movie when tied in ranked voting', () => {
			// All three get 1 first-place vote each - tt3 has lowest rating (6.0)
			const votes = [
				{ vote_data: ['tt1', 'tt2', 'tt3'] },
				{ vote_data: ['tt2', 'tt3', 'tt1'] },
				{ vote_data: ['tt3', 'tt1', 'tt2'] }
			];

			const result = tallyVotes('ranked', moviesWithRatings, votes);

			expect(result.method).toBe('ranked');
			if (result.method === 'ranked') {
				// First round should eliminate tt3 (lowest rating among tied)
				expect(result.results.rounds[0].eliminated).toBe('tt3');
			}
		});

		it('breaks rating voting ties by IMDb rating after median and mean', () => {
			// All movies get identical ratings -> same median and mean
			const votes = [
				{ vote_data: { tt1: 4, tt2: 4, tt3: 4 } },
				{ vote_data: { tt1: 4, tt2: 4, tt3: 4 } }
			];

			const result = tallyVotes('rating', moviesWithRatings, votes);

			expect(result.method).toBe('rating');
			if (result.method === 'rating') {
				// All have median=4, mean=4, so IMDb rating breaks tie
				// tt2 (8.2) > tt1 (7.5) > tt3 (6.0)
				expect(result.results[0].movie.imdbID).toBe('tt2');
				expect(result.results[1].movie.imdbID).toBe('tt1');
				expect(result.results[2].movie.imdbID).toBe('tt3');
			}
		});
	});

	describe('invalid vote data handling', () => {
		it('ignores invalid movie IDs in approval votes', () => {
			const votes = [
				{ vote_data: ['tt1', 'tt999'] }, // tt999 doesn't exist
				{ vote_data: ['tt1', 'tt2'] }
			];

			const result = tallyVotes('approval', movies, votes);

			expect(result.method).toBe('approval');
			if (result.method === 'approval') {
				// tt1 should have 2 votes, tt2 should have 1
				expect(result.results.find((r) => r.movie.imdbID === 'tt1')?.count).toBe(2);
				expect(result.results.find((r) => r.movie.imdbID === 'tt2')?.count).toBe(1);
			}
		});

		it('ignores invalid movie IDs in single votes', () => {
			const votes = [
				{ vote_data: 'tt999' }, // invalid
				{ vote_data: 'tt1' }
			];

			const result = tallyVotes('single', movies, votes);

			expect(result.method).toBe('single');
			if (result.method === 'single') {
				expect(result.results.find((r) => r.movie.imdbID === 'tt1')?.count).toBe(1);
				expect(result.winner?.imdbID).toBe('tt1');
			}
		});

		it('ignores invalid movie IDs in rating votes', () => {
			const votes = [
				{ vote_data: { tt1: 5, tt999: 3 } }, // tt999 doesn't exist
				{ vote_data: { tt1: 4, tt2: 3 } }
			];

			const result = tallyVotes('rating', movies, votes);

			expect(result.method).toBe('rating');
			if (result.method === 'rating') {
				// tt1 should have ratings [4, 5]
				const tt1Result = result.results.find((r) => r.movie.imdbID === 'tt1');
				expect(tt1Result?.ratings).toEqual([5, 4]);
			}
		});

		it('handles partial ranked ballots gracefully', () => {
			// Voter only ranked 2 of 3 movies
			const votes = [
				{ vote_data: ['tt1', 'tt2'] }, // missing tt3
				{ vote_data: ['tt2', 'tt1', 'tt3'] }
			];

			const result = tallyVotes('ranked', movies, votes);

			expect(result.method).toBe('ranked');
			if (result.method === 'ranked') {
				// Should still produce a result without crashing
				expect(result.winner).not.toBeNull();
			}
		});
	});

	describe('edge cases', () => {
		it('handles all candidates eliminated simultaneously in ranked voting', () => {
			// Two movies, each gets one first-place vote
			const twoMovies: Movie[] = [
				{ imdbID: 'tt1', title: 'Movie A', year: '2020', poster: null, rating: 7.0 },
				{ imdbID: 'tt2', title: 'Movie B', year: '2021', poster: null, rating: 8.0 }
			];
			const votes = [{ vote_data: ['tt1', 'tt2'] }, { vote_data: ['tt2', 'tt1'] }];

			const result = tallyVotes('ranked', twoMovies, votes);

			expect(result.method).toBe('ranked');
			if (result.method === 'ranked') {
				// With a tie, lower-rated tt1 should be eliminated, tt2 wins
				expect(result.winner?.imdbID).toBe('tt2');
			}
		});

		it('handles movies with no IMDb ratings in tiebreaker', () => {
			// Movies without ratings default to 0
			const votes = [{ vote_data: 'tt1' }, { vote_data: 'tt2' }];

			const result = tallyVotes('single', movies, votes);

			expect(result.method).toBe('single');
			if (result.method === 'single') {
				// Both have 1 vote, no ratings - order is stable but deterministic
				expect(result.results[0].count).toBe(1);
				expect(result.results[1].count).toBe(1);
			}
		});

		it('handles empty approval vote array', () => {
			const votes = [
				{ vote_data: [] }, // empty approval
				{ vote_data: ['tt1'] }
			];

			const result = tallyVotes('approval', movies, votes);

			expect(result.method).toBe('approval');
			if (result.method === 'approval') {
				expect(result.results.find((r) => r.movie.imdbID === 'tt1')?.count).toBe(1);
				expect(result.winner?.imdbID).toBe('tt1');
			}
		});
	});
});
