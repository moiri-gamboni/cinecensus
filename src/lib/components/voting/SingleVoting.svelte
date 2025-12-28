<script lang="ts">
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { Movie, SingleVoteData } from '$lib/types/poll';

	interface Props {
		movies: Movie[];
		value: SingleVoteData;
		onchange: (value: SingleVoteData) => void;
		disabled?: boolean;
	}

	let { movies, value, onchange, disabled = false }: Props = $props();
</script>

<div class="space-y-3">
	<p class="text-sm text-muted-foreground">
		Select your one favorite movie.
	</p>

	<RadioGroup.Root
		value={value}
		onValueChange={(v) => onchange(v as SingleVoteData)}
		{disabled}
		class="space-y-2"
	>
		{#each movies as movie (movie.imdbID)}
			<Label
				class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
			>
				<RadioGroup.Item value={movie.imdbID} />
				{#if movie.poster}
					<img src={movie.poster} alt={movie.title} class="h-12 w-8 rounded object-cover" />
				{:else}
					<div class="flex h-12 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
						N/A
					</div>
				{/if}
				<div class="flex flex-col">
					<span class="font-medium">{movie.title}</span>
					<span class="text-sm text-muted-foreground">{movie.year}</span>
				</div>
			</Label>
		{/each}
	</RadioGroup.Root>
</div>
