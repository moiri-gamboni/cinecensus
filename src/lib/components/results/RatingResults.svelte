<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import Trophy from '@lucide/svelte/icons/trophy';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import type { RatingResult, Movie } from '$lib/types/poll';

	interface Props {
		results: RatingResult[];
		winner: Movie | null;
		voteCount: number;
	}

	let { results, winner, voteCount }: Props = $props();
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

				<div class="flex min-w-0 flex-1 flex-col gap-1">
					<span class="truncate font-medium">{result.movie.title}</span>
					<div class="flex items-center gap-3">
						<!-- Star display for median -->
						<div class="flex items-center gap-0.5">
							{#each [1, 2, 3, 4, 5] as star}
								<Star
									class={cn(
										'size-4',
										result.median >= star
											? 'fill-yellow-400 text-yellow-400'
											: result.median >= star - 0.5
												? 'fill-yellow-400/50 text-yellow-400'
												: 'text-muted-foreground/30'
									)}
								/>
							{/each}
						</div>
						<Badge variant="secondary">
							{result.median.toFixed(1)} median
						</Badge>
						<span class="text-sm text-muted-foreground">
							({result.mean.toFixed(2)} avg)
						</span>
					</div>
				</div>

				<div class="text-right text-sm text-muted-foreground">
					{result.ratings.length} rating{result.ratings.length === 1 ? '' : 's'}
				</div>

				<Button
					variant="ghost"
					size="icon"
					class="size-8 shrink-0"
					href="https://www.imdb.com/title/{result.movie.imdbID}"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="View on IMDb"
				>
					<ExternalLink class="size-4" />
				</Button>
			</div>
		</div>
	{/each}
</div>
