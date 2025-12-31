<script lang="ts">
	import Share2 from '@lucide/svelte/icons/share-2';
	import Check from '@lucide/svelte/icons/check';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Users from '@lucide/svelte/icons/users';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import {
		ApprovalResults,
		SingleResults,
		RankedResults,
		RatingResults
	} from '$lib/components/results/index.js';
	import { fetchMissingPlots } from '$lib/utils/poster-fetch';
	import type { ApprovalResult, SingleResult, RankedResult, RatingResult, Movie } from '$lib/types/poll';

	let { data } = $props();

	let copied = $state(false);

	// Movies with plots filled in from cache/API
	let movies = $state<Movie[]>(data.poll.movies);

	// Fetch missing plots on mount (updates database for future loads)
	$effect(() => {
		fetchMissingPlots(data.poll.id, data.poll.movies).then((updated) => {
			movies = updated;
		});
	});

	const methodLabels = {
		approval: 'Approval Voting',
		single: 'Single Vote',
		ranked: 'Ranked Choice',
		rating: 'Rating'
	};

	async function copyLink() {
		const pollUrl = window.location.href.replace('/results', '');
		await navigator.clipboard.writeText(pollUrl);
		copied = true;
		toast.success('Poll link copied!');
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>Results: {data.poll.title} - CineCensus</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<Button variant="ghost" size="sm" href="/poll/{data.poll.id}" class="-ml-2 mb-2">
				<ArrowLeft class="mr-1 size-4" />
				Change my vote
			</Button>
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{data.poll.title}</h1>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<Badge variant="secondary">{methodLabels[data.poll.voting_method]}</Badge>
				<Badge variant="outline" class="flex items-center gap-1">
					<Users class="size-3" />
					{data.voteCount} vote{data.voteCount === 1 ? '' : 's'}
				</Badge>
			</div>
		</div>

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

	<Card.Root>
		<Card.Header>
			<Card.Title>Results</Card.Title>
			{#if data.voteCount === 0}
				<Card.Description>No votes yet. Share the poll to get votes!</Card.Description>
			{:else}
				<Card.Description>
					{#if data.results.winner}
						Winner: <strong>{data.results.winner.title}</strong>
					{:else}
						No winner determined yet
					{/if}
				</Card.Description>
			{/if}
		</Card.Header>

		<Card.Content>
			{#if data.voteCount === 0}
				<div class="py-8 text-center text-muted-foreground">
					<p>Waiting for votes...</p>
					<p class="mt-2 text-sm">Share the poll link with friends to start voting</p>
				</div>
			{:else if data.results.method === 'approval'}
				<ApprovalResults
					results={data.results.results as ApprovalResult[]}
					winner={data.results.winner}
					voteCount={data.voteCount}
				/>
			{:else if data.results.method === 'single'}
				<SingleResults
					results={data.results.results as SingleResult[]}
					winner={data.results.winner}
					voteCount={data.voteCount}
				/>
			{:else if data.results.method === 'ranked'}
				<RankedResults
					results={data.results.results as RankedResult}
					{movies}
					voteCount={data.voteCount}
				/>
			{:else if data.results.method === 'rating'}
				<RatingResults
					results={data.results.results as RatingResult[]}
					winner={data.results.winner}
					voteCount={data.voteCount}
				/>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if !data.hasVoted}
		<Card.Root>
			<Card.Content class="py-4">
				<div class="flex items-center justify-between">
					<p class="text-sm text-muted-foreground">You haven't voted on this poll yet</p>
					<Button variant="outline" href="/poll/{data.poll.id}">
						Cast your vote
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
