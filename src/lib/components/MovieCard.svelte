<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import type { Movie } from '$lib/types/poll';

	interface Props {
		movie: Movie;
		onremove?: () => void;
		showRemove?: boolean;
		compact?: boolean;
	}

	let { movie, onremove, showRemove = false, compact = false }: Props = $props();
</script>

<div
	class={cn(
		'group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50',
		compact && 'p-2'
	)}
>
	{#if movie.poster}
		<img
			src={movie.poster}
			alt={movie.title}
			class={cn('rounded object-cover', compact ? 'h-10 w-7' : 'h-16 w-11')}
		/>
	{:else}
		<div
			class={cn(
				'flex items-center justify-center rounded bg-muted text-xs text-muted-foreground',
				compact ? 'h-10 w-7' : 'h-16 w-11'
			)}
		>
			N/A
		</div>
	{/if}

	<div class="flex min-w-0 flex-1 flex-col">
		<span class={cn('truncate font-medium', compact && 'text-sm')}>{movie.title}</span>
		<span class="text-sm text-muted-foreground">{movie.year}</span>
	</div>

	<div class="flex items-center gap-1">
		<Button
			variant="ghost"
			size="icon"
			class="size-8 opacity-0 transition-opacity group-hover:opacity-100"
			href="https://www.imdb.com/title/{movie.imdbID}"
			target="_blank"
			rel="noopener noreferrer"
		>
			<ExternalLink class="size-4" />
			<span class="sr-only">View on IMDb</span>
		</Button>

		{#if showRemove && onremove}
			<Button
				variant="ghost"
				size="icon"
				class="size-8 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
				onclick={onremove}
			>
				<X class="size-4" />
				<span class="sr-only">Remove</span>
			</Button>
		{/if}
	</div>
</div>
