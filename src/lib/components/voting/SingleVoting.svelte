<script lang="ts">
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Star from '@lucide/svelte/icons/star';
	import Users from '@lucide/svelte/icons/users';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import MovieFilter from '$lib/components/MovieFilter.svelte';
	import { formatVotes } from '$lib/utils/format';
	import type { Movie, SingleVoteData } from '$lib/types/poll';

	interface Props {
		movies: Movie[];
		value: SingleVoteData;
		onchange: (value: SingleVoteData) => void;
		disabled?: boolean;
	}

	let { movies, value, onchange, disabled = false }: Props = $props();

	let filteredIds = $state<Set<string> | null>(null);

	const filteredMovies = $derived.by(() => {
		const ids = filteredIds;
		return ids ? movies.filter((m) => ids.has(m.imdbID)) : movies;
	});

	function handleFilter(filtered: Movie[], query: string) {
		filteredIds = query ? new Set(filtered.map((m) => m.imdbID)) : null;
	}
</script>

<div class="space-y-3">
	<p class="text-sm text-muted-foreground">
		Select your one favorite movie.
	</p>

	{#if movies.length > 5}
		<MovieFilter {movies} onfilter={handleFilter} />
	{/if}

	<RadioGroup.Root
		value={value}
		onValueChange={(v) => onchange(v as SingleVoteData)}
		{disabled}
		class="space-y-2"
	>
		{#each filteredMovies as movie (movie.imdbID)}
			<Label
				class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
			>
				<RadioGroup.Item value={movie.imdbID} />
				<div class="relative flex h-12 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
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
				<div class="flex min-w-0 flex-1 flex-col">
					<span class="truncate font-medium">{movie.title}</span>
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<span>{movie.year}</span>
						{#if movie.rating}
							<span class="flex items-center gap-0.5">
								<Star class="size-3 fill-yellow-400 text-yellow-400" />
								{movie.rating}
							</span>
						{/if}
						{#if movie.votes}
							<span class="flex items-center gap-0.5">
								<Users class="size-3" />
								{formatVotes(movie.votes)}
							</span>
						{/if}
					</div>
				</div>
				<a
					href="https://www.imdb.com/title/{movie.imdbID}"
					target="_blank"
					rel="noopener noreferrer"
					class="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
					onclick={(e) => e.stopPropagation()}
					aria-label="View on IMDb"
				>
					<ExternalLink class="size-4" />
				</a>
			</Label>
		{/each}
	</RadioGroup.Root>
</div>
