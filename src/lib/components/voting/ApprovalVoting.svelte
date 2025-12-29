<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import MovieFilter from '$lib/components/MovieFilter.svelte';
	import type { Movie, ApprovalVoteData } from '$lib/types/poll';

	interface Props {
		movies: Movie[];
		value: ApprovalVoteData;
		onchange: (value: ApprovalVoteData) => void;
		disabled?: boolean;
	}

	let { movies, value, onchange, disabled = false }: Props = $props();

	let filteredIds = $state<Set<string> | null>(null);

	const filteredMovies = $derived.by(() => {
		const ids = filteredIds;
		return ids ? movies.filter((m) => ids.has(m.imdbID)) : movies;
	});

	function toggle(imdbID: string) {
		if (value.includes(imdbID)) {
			onchange(value.filter((id) => id !== imdbID));
		} else {
			onchange([...value, imdbID]);
		}
	}

	function handleFilter(filtered: Movie[], query: string) {
		filteredIds = query ? new Set(filtered.map((m) => m.imdbID)) : null;
	}
</script>

<div class="space-y-3">
	<p class="text-sm text-muted-foreground">
		Select all movies you approve of. You can vote for as many as you like.
	</p>

	{#if movies.length > 5}
		<MovieFilter {movies} onfilter={handleFilter} />
	{/if}

	<div class="space-y-2">
		{#each filteredMovies as movie (movie.imdbID)}
			<Label
				class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
			>
				<Checkbox
					checked={value.includes(movie.imdbID)}
					onCheckedChange={() => toggle(movie.imdbID)}
					{disabled}
				/>
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
	</div>

	<p class="text-sm text-muted-foreground">
		{value.length} movie{value.length === 1 ? '' : 's'} selected
	</p>
</div>
