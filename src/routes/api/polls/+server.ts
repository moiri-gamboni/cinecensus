import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import type { Movie, VotingMethod } from '$lib/types/poll';

export const POST: RequestHandler = async ({ request, platform }) => {
	const supabaseUrl = platform?.env?.PUBLIC_SUPABASE_URL;
	const supabaseKey = platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		return json({ error: 'Supabase not configured' }, { status: 500 });
	}

	const supabase = createClient(supabaseUrl, supabaseKey);

	try {
		const body = await request.json();
		const { title, voting_method, movies } = body as {
			title: string;
			voting_method: VotingMethod;
			movies: Movie[];
		};

		if (!title?.trim()) {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		if (!movies || movies.length < 2) {
			return json({ error: 'At least 2 movies required' }, { status: 400 });
		}

		const validMethods: VotingMethod[] = ['approval', 'single', 'ranked', 'rating'];
		if (!validMethods.includes(voting_method)) {
			return json({ error: 'Invalid voting method' }, { status: 400 });
		}

		const { data, error } = await supabase
			.from('polls')
			.insert({
				title: title.trim(),
				voting_method,
				movies
			})
			.select('id')
			.single();

		if (error) {
			console.error('Supabase error:', error);
			return json({ error: 'Failed to create poll' }, { status: 500 });
		}

		return json({ id: data.id });
	} catch (err) {
		console.error('Error creating poll:', err);
		return json({ error: 'Invalid request' }, { status: 400 });
	}
};
