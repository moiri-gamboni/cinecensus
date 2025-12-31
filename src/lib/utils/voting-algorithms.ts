import type {
	Movie,
	VotingMethod,
	ApprovalResult,
	SingleResult,
	RankedResult,
	RankedRound,
	RatingResult,
	PollResults
} from '$lib/types/poll';

interface VoteRow {
	vote_data: unknown;
}

export function tallyVotes(
	method: VotingMethod,
	movies: Movie[],
	votes: VoteRow[]
): PollResults {
	switch (method) {
		case 'approval':
			return tallyApproval(movies, votes as { vote_data: string[] }[]);
		case 'single':
			return tallySingle(movies, votes as { vote_data: string }[]);
		case 'ranked':
			return tallyRankedChoice(movies, votes as { vote_data: string[] }[]);
		case 'rating':
			return tallyRating(movies, votes as { vote_data: Record<string, number> }[]);
	}
}

function tallyApproval(
	movies: Movie[],
	votes: { vote_data: string[] }[]
): PollResults & { method: 'approval' } {
	const counts: Record<string, number> = {};
	movies.forEach((m) => (counts[m.imdbID] = 0));

	votes.forEach((v) => {
		v.vote_data.forEach((id) => {
			if (counts[id] !== undefined) counts[id]++;
		});
	});

	const results: ApprovalResult[] = movies
		.map((m) => ({
			movie: m,
			count: counts[m.imdbID],
			percentage: votes.length ? (counts[m.imdbID] / votes.length) * 100 : 0
		}))
		.sort((a, b) => b.count - a.count);

	return {
		method: 'approval',
		results,
		winner: results[0]?.count > 0 ? results[0].movie : null
	};
}

function tallySingle(
	movies: Movie[],
	votes: { vote_data: string }[]
): PollResults & { method: 'single' } {
	const counts: Record<string, number> = {};
	movies.forEach((m) => (counts[m.imdbID] = 0));

	votes.forEach((v) => {
		if (counts[v.vote_data] !== undefined) counts[v.vote_data]++;
	});

	const results: SingleResult[] = movies
		.map((m) => ({
			movie: m,
			count: counts[m.imdbID],
			percentage: votes.length ? (counts[m.imdbID] / votes.length) * 100 : 0
		}))
		.sort((a, b) => b.count - a.count);

	return {
		method: 'single',
		results,
		winner: results[0]?.count > 0 ? results[0].movie : null
	};
}

function tallyRankedChoice(
	movies: Movie[],
	votes: { vote_data: string[] }[]
): PollResults & { method: 'ranked' } {
	const movieMap = new Map(movies.map((m) => [m.imdbID, m]));
	const rounds: RankedRound[] = [];
	let remaining = movies.map((m) => m.imdbID);
	const ballots = votes.map((v) => [...v.vote_data]);

	// Edge case: no votes
	if (ballots.length === 0) {
		return {
			method: 'ranked',
			results: { rounds: [], winner: null },
			winner: null
		};
	}

	while (remaining.length > 1) {
		// Count first-choice votes among remaining candidates
		const counts: Record<string, number> = {};
		remaining.forEach((id) => (counts[id] = 0));

		ballots.forEach((ballot) => {
			const firstChoice = ballot.find((id) => remaining.includes(id));
			if (firstChoice) counts[firstChoice]++;
		});

		const total = ballots.filter((b) => b.some((id) => remaining.includes(id))).length;

		// Check for majority
		const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

		if (sorted[0][1] > total / 2) {
			// Winner found with majority - update remaining to only the winner
			remaining = [sorted[0][0]];
			rounds.push({
				counts: { ...counts },
				eliminated: null,
				remaining: [...remaining]
			});
			break;
		}

		// Find lowest vote count
		const lowestCount = Math.min(...Object.values(counts));

		// Get all candidates with lowest count (for tie handling)
		const lowestCandidates = Object.entries(counts)
			.filter(([, c]) => c === lowestCount)
			.map(([id]) => id);

		// Eliminate the first one found (could be randomized for fairness)
		const toEliminate = lowestCandidates[0];

		rounds.push({
			counts: { ...counts },
			eliminated: toEliminate,
			remaining: [...remaining]
		});

		remaining = remaining.filter((id) => id !== toEliminate);
	}

	// Add final round if we exited due to single remaining candidate
	if (remaining.length === 1 && rounds[rounds.length - 1]?.eliminated !== null) {
		const counts: Record<string, number> = {};
		remaining.forEach((id) => (counts[id] = 0));
		ballots.forEach((ballot) => {
			const firstChoice = ballot.find((id) => remaining.includes(id));
			if (firstChoice) counts[firstChoice]++;
		});
		rounds.push({
			counts,
			eliminated: null,
			remaining
		});
	}

	const winnerId = remaining[0];
	const winner = winnerId ? movieMap.get(winnerId) ?? null : null;

	return {
		method: 'ranked',
		results: { rounds, winner },
		winner
	};
}

function tallyRating(
	movies: Movie[],
	votes: { vote_data: Record<string, number> }[]
): PollResults & { method: 'rating' } {
	const ratings: Record<string, number[]> = {};
	movies.forEach((m) => (ratings[m.imdbID] = []));

	votes.forEach((v) => {
		Object.entries(v.vote_data).forEach(([id, rating]) => {
			if (ratings[id]) ratings[id].push(rating);
		});
	});

	const results: RatingResult[] = movies
		.map((m) => {
			const r = ratings[m.imdbID];
			const sorted = [...r].sort((a, b) => a - b);
			const median = sorted.length
				? sorted.length % 2 === 0
					? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
					: sorted[Math.floor(sorted.length / 2)]
				: 0;
			const mean = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;

			return { movie: m, median, mean, ratings: r };
		})
		.sort((a, b) => b.median - a.median || b.mean - a.mean);

	return {
		method: 'rating',
		results,
		winner: results[0]?.median > 0 ? results[0].movie : null
	};
}
