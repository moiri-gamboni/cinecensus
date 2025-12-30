<script lang="ts">
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import Trophy from '@lucide/svelte/icons/trophy';
	import type { ApprovalResult, Movie } from '$lib/types/poll';
	import { cn } from '$lib/utils.js';

	interface Props {
		results: ApprovalResult[];
		winner: Movie | null;
		voteCount: number;
	}

	let { results, winner, voteCount }: Props = $props();

	const maxCount = $derived(Math.max(...results.map((r) => r.count), 1));
</script>

<div class="space-y-4">
	{#each results as result, index (result.movie.imdbID)}
		{@const isWinner = winner?.imdbID === result.movie.imdbID}
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

				<div class="relative flex h-12 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
					N/A
					{#if result.movie.poster}
						<img
							src={result.movie.poster}
							alt={result.movie.title}
							class="absolute inset-0 h-full w-full rounded object-cover"
							onerror={(e) => e.currentTarget.remove()}
						/>
					{/if}
				</div>

				<div class="flex min-w-0 flex-1 flex-col gap-2">
					<div class="flex items-center justify-between gap-2">
						<span class="truncate font-medium">{result.movie.title}</span>
						<div class="flex items-center gap-2">
							<Badge variant="secondary">{result.count} votes</Badge>
							<span class="text-sm text-muted-foreground">
								{result.percentage.toFixed(0)}%
							</span>
						</div>
					</div>
					<Progress value={(result.count / maxCount) * 100} class="h-2" />
				</div>
			</div>
		</div>
	{/each}
</div>
