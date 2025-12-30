<script lang="ts">
	import Trophy from '@lucide/svelte/icons/trophy';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { cn } from '$lib/utils.js';
	import type { RankedResult, Movie } from '$lib/types/poll';

	interface Props {
		results: RankedResult;
		movies: Movie[];
		voteCount: number;
	}

	let { results, movies, voteCount }: Props = $props();

	let roundsOpen = $state(false);

	function getMovie(id: string): Movie | undefined {
		return movies.find((m) => m.imdbID === id);
	}

	// Build final standings: winner first, then eliminated in reverse order
	const standings = $derived.by(() => {
		const list: { movie: Movie; eliminatedInRound: number | null }[] = [];

		// Add winner first
		if (results.winner) {
			list.push({ movie: results.winner, eliminatedInRound: null });
		}

		// Add eliminated movies in reverse order (last eliminated = 2nd place)
		for (let i = results.rounds.length - 1; i >= 0; i--) {
			const round = results.rounds[i];
			if (round.eliminated) {
				const movie = getMovie(round.eliminated);
				if (movie) {
					list.push({ movie, eliminatedInRound: i + 1 });
				}
			}
		}

		return list;
	});

	// Get final round vote counts for display
	const finalRound = $derived(results.rounds[results.rounds.length - 1]);
	const maxFinalVotes = $derived(Math.max(...Object.values(finalRound?.counts ?? {}), 1));
</script>

<div class="space-y-4">
	{#each standings as { movie, eliminatedInRound }, index (movie.imdbID)}
		{@const isWinner = index === 0 && results.winner?.imdbID === movie.imdbID}
		{@const finalVotes = finalRound?.counts[movie.imdbID]}
		<div
			class={cn(
				'rounded-lg border p-4 transition-colors',
				isWinner && 'border-primary bg-primary/5'
			)}
		>
			<div class="flex items-center gap-3">
				{#if isWinner}
					<Trophy class="size-5 shrink-0 text-yellow-500" />
				{:else}
					<span class="flex size-5 shrink-0 items-center justify-center text-sm font-medium text-muted-foreground">
						{index + 1}
					</span>
				{/if}

				<div class="relative flex h-12 w-8 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
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

				<div class="flex min-w-0 flex-1 flex-col gap-2">
					<div class="flex items-center justify-between gap-2">
						<span class="truncate font-medium">{movie.title}</span>
						<div class="flex items-center gap-2">
							{#if isWinner}
								<Badge variant="default">Winner</Badge>
							{:else if eliminatedInRound !== null}
								<Badge variant="secondary">Round {eliminatedInRound}</Badge>
							{/if}
						</div>
					</div>
					{#if finalVotes !== undefined}
						<Progress value={(finalVotes / maxFinalVotes) * 100} class="h-2" />
					{/if}
				</div>
			</div>
		</div>
	{/each}

	<!-- Collapsible elimination rounds detail -->
	{#if results.rounds.length > 1}
		<button
			type="button"
			class="flex w-full items-center justify-between rounded-lg border p-3 text-sm text-muted-foreground hover:bg-accent/50"
			onclick={() => (roundsOpen = !roundsOpen)}
		>
			<span>View elimination rounds</span>
			<ChevronDown class={cn('size-4 transition-transform', roundsOpen && 'rotate-180')} />
		</button>

		{#if roundsOpen}
			<div class="space-y-3">
				{#each results.rounds as round, index (index)}
					{@const eliminated = round.eliminated ? getMovie(round.eliminated) : null}
					{@const maxVotes = Math.max(...Object.values(round.counts), 1)}

					<div class="rounded-lg border bg-muted/30 p-3">
						<div class="mb-2 flex items-center gap-2">
							<Badge variant="outline">Round {index + 1}</Badge>
							{#if eliminated}
								<span class="flex items-center gap-1 text-sm text-muted-foreground">
									<XCircle class="size-3 text-destructive" />
									{eliminated.title} eliminated
								</span>
							{:else}
								<span class="text-sm text-muted-foreground">Final</span>
							{/if}
						</div>
						<div class="space-y-1.5">
							{#each Object.entries(round.counts).sort((a, b) => b[1] - a[1]) as [id, count]}
								{@const movie = getMovie(id)}
								{@const isEliminated = id === round.eliminated}
								{#if movie}
									<div class={cn('flex items-center gap-2 text-sm', isEliminated && 'opacity-50')}>
										<span class="w-20 truncate">{movie.title}</span>
										<Progress value={(count / maxVotes) * 100} class="h-1.5 flex-1" />
										<span class="w-12 text-right text-muted-foreground">{count}</span>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
