import { error, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import type { PageServerLoad, Actions } from './$types';
import type { Poll } from '$lib/types/poll';

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

	// Check if user already voted
	const fingerprint = cookies.get('voter_fingerprint');
	let hasVoted = false;

	if (fingerprint) {
		const { data: existingVote } = await supabase
			.from('votes')
			.select('id')
			.eq('poll_id', params.id)
			.eq('voter_fingerprint', fingerprint)
			.single();

		hasVoted = !!existingVote;
	}

	return {
		poll: poll as Poll,
		hasVoted
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

		const voteData = JSON.parse(voteDataStr);

		// Get or create fingerprint
		let fingerprint = cookies.get('voter_fingerprint');

		if (!fingerprint) {
			fingerprint = crypto.randomUUID();
			cookies.set('voter_fingerprint', fingerprint, {
				path: '/',
				httpOnly: true,
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
