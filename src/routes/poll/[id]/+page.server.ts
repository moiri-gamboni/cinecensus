import { dev } from '$app/environment';
import { error, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { PageServerLoad, Actions } from './$types';
import type { Poll, VotingMethod } from '$lib/types/poll';

/**
 * Validate vote data against poll configuration.
 * Returns an error message if invalid, null if valid.
 */
function validateVoteData(
	voteData: unknown,
	votingMethod: VotingMethod,
	validMovieIds: Set<string>
): string | null {
	switch (votingMethod) {
		case 'approval': {
			if (!Array.isArray(voteData)) {
				return 'Approval vote must be an array';
			}
			if (voteData.length === 0) {
				return 'Must approve at least one movie';
			}
			for (const id of voteData) {
				if (typeof id !== 'string' || !validMovieIds.has(id)) {
					return 'Invalid movie ID in vote';
				}
			}
			return null;
		}
		case 'single': {
			if (typeof voteData !== 'string') {
				return 'Single vote must be a string';
			}
			if (!validMovieIds.has(voteData)) {
				return 'Invalid movie ID';
			}
			return null;
		}
		case 'ranked': {
			if (!Array.isArray(voteData)) {
				return 'Ranked vote must be an array';
			}
			if (voteData.length !== validMovieIds.size) {
				return 'Must rank all movies';
			}
			const seen = new Set<string>();
			for (const id of voteData) {
				if (typeof id !== 'string' || !validMovieIds.has(id)) {
					return 'Invalid movie ID in ranking';
				}
				if (seen.has(id)) {
					return 'Duplicate movie in ranking';
				}
				seen.add(id);
			}
			return null;
		}
		case 'rating': {
			if (typeof voteData !== 'object' || voteData === null || Array.isArray(voteData)) {
				return 'Rating vote must be an object';
			}
			const ratings = voteData as Record<string, unknown>;
			if (Object.keys(ratings).length !== validMovieIds.size) {
				return 'Must rate all movies';
			}
			for (const [id, rating] of Object.entries(ratings)) {
				if (!validMovieIds.has(id)) {
					return 'Invalid movie ID in ratings';
				}
				if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
					return 'Ratings must be integers from 1 to 5';
				}
			}
			return null;
		}
	}
}

export const load: PageServerLoad = async ({ params, cookies, platform }) => {
	const supabaseUrl = platform?.env?.PUBLIC_SUPABASE_URL;
	const supabaseKey = platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		throw error(500, 'Supabase not configured');
	}

	const supabase = createClient(supabaseUrl, supabaseKey);

	const { data: poll, error: pollError } = await supabase
		.from('polls')
		.select('*')
		.eq('id', params.id)
		.single();

	if (pollError || !poll) {
		throw error(404, 'Poll not found');
	}

	// Check if user already voted and get their vote data
	const fingerprint = cookies.get('voter_fingerprint');
	let hasVoted = false;
	let existingVoteData = null;

	if (fingerprint) {
		const { data: existingVote } = await supabase
			.from('votes')
			.select('id, vote_data')
			.eq('poll_id', params.id)
			.eq('voter_fingerprint', fingerprint)
			.single();

		hasVoted = !!existingVote;
		existingVoteData = existingVote?.vote_data ?? null;
	}

	return {
		poll: poll as Poll,
		hasVoted,
		existingVoteData
	};
};

export const actions: Actions = {
	vote: async ({ request, params, cookies, platform }) => {
		const supabaseUrl = platform?.env?.PUBLIC_SUPABASE_URL;
		const supabaseKey = platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

		if (!supabaseUrl || !supabaseKey) {
			throw error(500, 'Supabase not configured');
		}

		const supabase = createClient(supabaseUrl, supabaseKey);

		const formData = await request.formData();
		const voteDataStr = formData.get('voteData');

		if (!voteDataStr || typeof voteDataStr !== 'string') {
			throw error(400, 'Vote data required');
		}

		let voteData: unknown;
		try {
			voteData = JSON.parse(voteDataStr);
		} catch {
			throw error(400, 'Invalid vote data format');
		}

		// Fetch poll to validate vote against
		const { data: poll, error: pollError } = await supabase
			.from('polls')
			.select('voting_method, movies')
			.eq('id', params.id)
			.single();

		if (pollError || !poll) {
			throw error(404, 'Poll not found');
		}

		const typedPoll = poll as Pick<Poll, 'voting_method' | 'movies'>;
		const validMovieIds = new Set(typedPoll.movies.map((m) => m.imdbID));

		const validationError = validateVoteData(voteData, typedPoll.voting_method, validMovieIds);
		if (validationError) {
			throw error(400, validationError);
		}

		// Get or create fingerprint
		let fingerprint = cookies.get('voter_fingerprint');

		if (!fingerprint) {
			fingerprint = crypto.randomUUID();
			cookies.set('voter_fingerprint', fingerprint, {
				path: '/',
				httpOnly: true,
				secure: !dev,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 365 // 1 year
			});
		}

		const { error: voteError } = await supabase.from('votes').upsert(
			{
				poll_id: params.id,
				voter_fingerprint: fingerprint,
				vote_data: voteData
			},
			{ onConflict: 'poll_id,voter_fingerprint' }
		);

		if (voteError) {
			console.error('Vote error:', voteError);
			throw error(500, 'Failed to submit vote');
		}

		throw redirect(303, `/poll/${params.id}/results`);
	}
};
