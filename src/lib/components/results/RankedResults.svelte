<script lang="ts">
	import Trophy from '@lucide/svelte/icons/trophy';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { cn } from '$lib/utils.js';
	import type { RankedResult, Movie } from '$lib/types/poll';

	interface Props {
		results: RankedResult;
		movies: Movie[];
		voteCount: number;
	}

	let { results, movies, voteCount }: Props = $props();

	let expandedRounds = $state<Set<number>>(new Set());

	function toggleRound(index: number) {
		const newSet = new Set(expandedRounds);
		if (newSet.has(index)) {
			newSet.delete(index);
		} else {
			newSet.add(index);
		}
		expandedRounds = newSet;
	}

	function getMovie(id: string): Movie | undefined {
		return movies.find((m) => m.imdbID === id);
	}
</script>

<div class="space-y-6">
	<!-- Winner display -->
	{#if results.winner}
		<div class="rounded-lg border border-primary bg-primary/5 p-6 text-center">
			<Trophy class="mx-auto size-8 text-yellow-500" />
			<h3 class="mt-2 text-lg font-semibold">Winner</h3>
			<div class="mt-3 flex items-center justify-center gap-3">
				<div class="relative flex h-20 w-14 items-center justify-center rounded bg-muted text-xs text-muted-foreground shadow-lg">
					N/A
					{#if results.winner.poster}
						<img
							src={results.winner.poster}
							alt={results.winner.title}
							class="absolute inset-0 h-full w-full rounded object-cover"
							onerror={(e) => e.currentTarget.remove()}
						/>
					{/if}
				</div>
				<div class="text-left">
					<p class="text-xl font-bold">{results.winner.title}</p>
					<p class="text-muted-foreground">{results.winner.year}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Elimination rounds -->
	<div class="space-y-3">
		<h3 class="font-semibold">Elimination Rounds</h3>

		{#each results.rounds as round, index (index)}
			{@const eliminated = round.eliminated ? getMovie(round.eliminated) : null}
			{@const isExpanded = expandedRounds.has(index)}
			{@const isFinal = round.eliminated === null}
			{@const maxVotes = Math.max(...Object.values(round.counts), 1)}

			<Card.Root>
				<button
					type="button"
					class="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50"
					onclick={() => toggleRound(index)}
				>
					<div class="flex items-center gap-3">
						<Badge variant={isFinal ? 'default' : 'secondary'}>
							Round {index + 1}
						</Badge>
						{#if eliminated}
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<XCircle class="size-4 text-destructive" />
								<span>{eliminated.title} eliminated</span>
							</div>
						{:else if isFinal}
							<span class="text-sm text-muted-foreground">Final round</span>
						{/if}
					</div>
					<ChevronDown
						class={cn(
							'size-5 text-muted-foreground transition-transform',
							isExpanded && 'rotate-180'
						)}
					/>
				</button>

				{#if isExpanded}
					<Card.Content class="space-y-2 border-t pt-4">
						{#each Object.entries(round.counts).sort((a, b) => b[1] - a[1]) as [id, count]}
							{@const movie = getMovie(id)}
							{@const isEliminated = id === round.eliminated}
							{#if movie}
								<div
									class={cn(
										'flex items-center gap-3 rounded p-2',
										isEliminated && 'bg-destructive/10 opacity-60'
									)}
								>
									<div class="relative flex h-10 w-7 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
									N/A
									{#if movie.poster}
										<img
											src={movie.poster}
											alt={movie.title}
											class="absolute inset-0 h-full w-full rounded object-cover"
											onerror={(e) => e.currentTarget.remove()}
										/>
									{/if}
								</div>
									<div class="flex min-w-0 flex-1 flex-col gap-1">
										<div class="flex items-center justify-between">
											<span class="truncate text-sm font-medium">{movie.title}</span>
											<span class="text-sm text-muted-foreground">{count} votes</span>
										</div>
										<Progress value={(count / maxVotes) * 100} class="h-1.5" />
									</div>
									{#if isEliminated}
										<XCircle class="size-4 shrink-0 text-destructive" />
									{/if}
								</div>
							{/if}
						{/each}
					</Card.Content>
				{/if}
			</Card.Root>
		{/each}
	</div>
</div>
