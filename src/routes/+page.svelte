<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Plus from '@lucide/svelte/icons/plus';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import MovieSearch from '$lib/components/MovieSearch.svelte';
	import MovieCard from '$lib/components/MovieCard.svelte';
	import BulkPasteDialog from '$lib/components/BulkPasteDialog.svelte';
	import VotingMethodSelect from '$lib/components/VotingMethodSelect.svelte';
	import { pollOwnership } from '$lib/stores/poll-ownership.svelte.js';
	import type { Movie, VotingMethod } from '$lib/types/poll';

	let title = $state('');
	let votingMethod = $state<VotingMethod>('approval');
	let movies = $state<Movie[]>([]);
	let submitting = $state(false);

	const excludeIds = $derived(movies.map((m) => m.imdbID));

	function addMovie(movie: Movie) {
		if (!movies.some((m) => m.imdbID === movie.imdbID)) {
			movies = [...movies, movie];
		}
	}

	function removeMovie(imdbID: string) {
		movies = movies.filter((m) => m.imdbID !== imdbID);
	}

	function addBulkMovies(newMovies: Movie[]) {
		const unique = newMovies.filter((m) => !movies.some((existing) => existing.imdbID === m.imdbID));
		movies = [...movies, ...unique];
		toast.success(`Added ${unique.length} movie${unique.length === 1 ? '' : 's'}`);
	}

	async function handleSubmit() {
		if (!title.trim()) {
			toast.error('Please enter a poll title');
			return;
		}

		if (movies.length < 2) {
			toast.error('Please add at least 2 movies');
			return;
		}

		submitting = true;

		try {
			const response = await fetch('/api/polls', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					voting_method: votingMethod,
					movies
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to create poll');
			}

			// Track ownership in localStorage
			pollOwnership.add(data.id);

			toast.success('Poll created!');
			goto(`/poll/${data.id}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create poll');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="space-y-8">
	<div class="text-center">
		<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Create a Movie Poll</h1>
		<p class="mt-2 text-muted-foreground">
			Add movies, choose a voting method, and share the link with friends
		</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Poll Details</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-6">
			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Poll title</Label>
				<Input
					id="title"
					placeholder="Movie night picks"
					bind:value={title}
					maxlength={100}
				/>
			</div>

			<!-- Voting Method -->
			<div class="space-y-2">
				<Label>Voting method</Label>
				<VotingMethodSelect value={votingMethod} onchange={(v) => (votingMethod = v)} />
			</div>

			<!-- Movies -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<Label>Movies ({movies.length})</Label>
					<BulkPasteDialog onresolve={addBulkMovies} excludeIds={excludeIds} />
				</div>

				<MovieSearch
					onselect={addMovie}
					excludeIds={excludeIds}
					placeholder="Search and add movies..."
				/>

				{#if movies.length > 0}
					<div class="space-y-2">
						{#each movies as movie (movie.imdbID)}
							<MovieCard
								{movie}
								showRemove
								onremove={() => removeMovie(movie.imdbID)}
							/>
						{/each}
					</div>
				{:else}
					<div class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
						<p>No movies added yet</p>
						<p class="text-sm">Search above or bulk paste to add movies</p>
					</div>
				{/if}
			</div>
		</Card.Content>

		<Card.Footer>
			<Button
				class="w-full"
				size="lg"
				disabled={submitting || !title.trim() || movies.length < 2}
				onclick={handleSubmit}
			>
				{#if submitting}
					<Loader2 class="mr-2 size-5 animate-spin" />
					Creating...
				{:else}
					<Plus class="mr-2 size-5" />
					Create Poll
				{/if}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
