import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import type { Movie } from '$lib/types/poll';

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const supabaseUrl = platform?.env?.PUBLIC_SUPABASE_URL;
	const supabaseKey = platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		return json({ error: 'Supabase not configured' }, { status: 500 });
	}

	const supabase = createClient(supabaseUrl, supabaseKey);

	try {
		const { imdbID, plot, poster } = (await request.json()) as {
			imdbID: string;
			plot?: string;
			poster?: string;
		};

		if (!imdbID) {
			return json({ error: 'imdbID is required' }, { status: 400 });
		}

		if (!plot && !poster) {
			return json({ error: 'plot or poster is required' }, { status: 400 });
		}

		// Fetch current poll
		const { data: poll, error: fetchError } = await supabase
			.from('polls')
			.select('movies')
			.eq('id', params.id)
			.single();

		if (fetchError || !poll) {
			return json({ error: 'Poll not found' }, { status: 404 });
		}

		// Update the movie's plot/poster in the array
		const movies = (poll.movies as Movie[]).map((m) => {
			if (m.imdbID === imdbID) {
				return {
					...m,
					...(plot && { plot }),
					...(poster && { poster })
				};
			}
			return m;
		});

		// Save updated movies
		const { error: updateError } = await supabase
			.from('polls')
			.update({ movies })
			.eq('id', params.id);

		if (updateError) {
			console.error('Failed to update movie plot:', updateError);
			return json({ error: 'Failed to update' }, { status: 500 });
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error updating movie plot:', err);
		return json({ error: 'Invalid request' }, { status: 400 });
	}
};
