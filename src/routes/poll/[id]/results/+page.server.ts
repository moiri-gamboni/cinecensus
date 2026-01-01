import { error, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { PageServerLoad } from './$types';
import type { Poll } from '$lib/types/poll';
import { tallyVotes } from '$lib/utils/voting-algorithms';

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

	// Check if user has voted
	const fingerprint = cookies.get('voter_fingerprint');
	let hasVoted = false;

	if (fingerprint) {
		const { data: vote } = await supabase
			.from('votes')
			.select('id')
			.eq('poll_id', params.id)
			.eq('voter_fingerprint', fingerprint)
			.single();

		hasVoted = !!vote;
	}

	// Require voting before seeing results (optional - can be removed)
	// if (!hasVoted) {
	// 	throw redirect(303, `/poll/${params.id}`);
	// }

	// Get all votes
	const { data: votes, error: votesError } = await supabase
		.from('votes')
		.select('vote_data')
		.eq('poll_id', params.id);

	if (votesError) {
		console.error('Failed to fetch votes:', votesError);
		throw error(500, 'Failed to load poll results');
	}

	const typedPoll = poll as Poll;
	const results = tallyVotes(typedPoll.voting_method, typedPoll.movies, votes || []);

	return {
		poll: typedPoll,
		results,
		voteCount: votes?.length || 0,
		hasVoted
	};
};
