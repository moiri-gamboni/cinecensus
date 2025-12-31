<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Vote from '@lucide/svelte/icons/vote';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Check from '@lucide/svelte/icons/check';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { ApprovalVoting, SingleVoting, RankedVoting, RatingVoting } from '$lib/components/voting/index.js';
	import { votedPolls } from '$lib/stores/poll-ownership.svelte.js';
	import { fetchMissingPlots } from '$lib/utils/poster-fetch';
	import type { ApprovalVoteData, SingleVoteData, RankedVoteData, RatingVoteData, Movie } from '$lib/types/poll';

	let { data } = $props();

	// Movies with plots filled in from cache/API
	let movies = $state<Movie[]>(data.poll.movies);

	// Fetch missing plots on mount
	$effect(() => {
		fetchMissingPlots(data.poll.id, data.poll.movies).then((updated) => {
			movies = updated;
		});
	});

	let submitting = $state(false);
	let copied = $state(false);

	// Vote data for each voting method - pre-populated if user has already voted
	// Using untrack since these are intentional one-time initializations
	let approvalVote = $state<ApprovalVoteData>(
		untrack(() => data.poll.voting_method === 'approval' && data.existingVoteData
			? data.existingVoteData as ApprovalVoteData : [])
	);
	let singleVote = $state<SingleVoteData>(
		untrack(() => data.poll.voting_method === 'single' && data.existingVoteData
			? data.existingVoteData as SingleVoteData : '')
	);
	let rankedVote = $state<RankedVoteData>(
		untrack(() => data.poll.voting_method === 'ranked' && data.existingVoteData
			? data.existingVoteData as RankedVoteData : [])
	);
	let ratingVote = $state<RatingVoteData>(
		untrack(() => data.poll.voting_method === 'rating' && data.existingVoteData
			? data.existingVoteData as RatingVoteData : {})
	);

	const currentVoteData = $derived.by(() => {
		switch (data.poll.voting_method) {
			case 'approval':
				return approvalVote;
			case 'single':
				return singleVote;
			case 'ranked':
				return rankedVote;
			case 'rating':
				return ratingVote;
		}
	});

	const isValidVote = $derived.by(() => {
		switch (data.poll.voting_method) {
			case 'approval':
				return approvalVote.length > 0;
			case 'single':
				return singleVote !== '';
			case 'ranked':
				return rankedVote.length === movies.length;
			case 'rating':
				return Object.keys(ratingVote).length === movies.length;
		}
	});

	const methodLabels = {
		approval: 'Approval Voting',
		single: 'Single Vote',
		ranked: 'Ranked Choice',
		rating: 'Rating'
	};

	async function copyLink() {
		await navigator.clipboard.writeText(window.location.href);
		copied = true;
		toast.success('Link copied to clipboard!');
		setTimeout(() => (copied = false), 2000);
	}

	const hasAlreadyVoted = $derived(data.hasVoted || votedPolls.hasVoted(data.poll.id));
</script>

<svelte:head>
	<title>{data.poll.title} - CineCensus</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{data.poll.title}</h1>
			<div class="mt-2 flex items-center gap-2">
				<Badge variant="secondary">{methodLabels[data.poll.voting_method]}</Badge>
				<span class="text-sm text-muted-foreground">
					{movies.length} movies
				</span>
			</div>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" href="/poll/{data.poll.id}/results">
				<BarChart3 class="mr-2 size-4" />
				View results
			</Button>
			<Button variant="outline" onclick={copyLink}>
				{#if copied}
					<Check class="mr-2 size-4" />
					Copied!
				{:else}
					<Share2 class="mr-2 size-4" />
					Share poll
				{/if}
			</Button>
		</div>
	</div>

	{#if hasAlreadyVoted}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
			<p class="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
				<Check class="size-4" />
				You've already voted. You can change your vote below.
			</p>
		</div>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>{hasAlreadyVoted ? 'Change your vote' : 'Cast your vote'}</Card.Title>
			<Card.Description>
				{#if data.poll.voting_method === 'approval'}
					Vote for all movies you'd be happy to watch
				{:else if data.poll.voting_method === 'single'}
					Pick your one favorite
				{:else if data.poll.voting_method === 'ranked'}
					Rank movies from most to least preferred
				{:else}
					Rate each movie from 1 to 5 stars
				{/if}
			</Card.Description>
		</Card.Header>

		<Card.Content>
			{#if data.poll.voting_method === 'approval'}
				<ApprovalVoting
					{movies}
					value={approvalVote}
					onchange={(v) => (approvalVote = v)}
					disabled={submitting}
				/>
			{:else if data.poll.voting_method === 'single'}
				<SingleVoting
					{movies}
					value={singleVote}
					onchange={(v) => (singleVote = v)}
					disabled={submitting}
				/>
			{:else if data.poll.voting_method === 'ranked'}
				<RankedVoting
					{movies}
					value={rankedVote}
					onchange={(v) => (rankedVote = v)}
					disabled={submitting}
				/>
			{:else}
				<RatingVoting
					{movies}
					value={ratingVote}
					onchange={(v) => (ratingVote = v)}
					disabled={submitting}
				/>
			{/if}
		</Card.Content>

		<Card.Footer>
			<form
				method="POST"
				action="?/vote"
				class="w-full"
				use:enhance={() => {
					submitting = true;
					return async ({ result }) => {
						if (result.type === 'redirect') {
							votedPolls.add(data.poll.id);
							await goto(result.location);
						} else if (result.type === 'error') {
							toast.error(result.error?.message || 'Failed to submit vote');
							submitting = false;
						} else {
							submitting = false;
						}
					};
				}}
			>
				<input type="hidden" name="voteData" value={JSON.stringify(currentVoteData)} />
				<Button
					type="submit"
					class="w-full"
					size="lg"
					disabled={submitting || !isValidVote}
				>
					{#if submitting}
						<Loader2 class="mr-2 size-5 animate-spin" />
						{hasAlreadyVoted ? 'Updating...' : 'Submitting...'}
					{:else}
						<Vote class="mr-2 size-5" />
						{hasAlreadyVoted ? 'Update vote' : 'Submit vote'}
					{/if}
				</Button>
			</form>
		</Card.Footer>
	</Card.Root>
</div>
