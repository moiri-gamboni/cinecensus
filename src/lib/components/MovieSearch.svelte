<script lang="ts">
	import { tick } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import Search from '@lucide/svelte/icons/search';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import type { Movie } from '$lib/types/poll';

	interface Props {
		onselect: (movie: Movie) => void;
		placeholder?: string;
		excludeIds?: string[];
	}

	let { onselect, placeholder = 'Search movies...', excludeIds = [] }: Props = $props();

	let open = $state(false);
	let searchQuery = $state('');
	let results = $state<Movie[]>([]);
	let loading = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function searchMovies(query: string) {
		if (query.length < 2) {
			results = [];
			return;
		}

		loading = true;
		try {
			const response = await fetch(`/api/movies?q=${encodeURIComponent(query)}`);
			const data = await response.json();
			results = (data.results ?? []).filter(
				(m: Movie) => !excludeIds.includes(m.imdbID)
			);
		} catch {
			results = [];
		} finally {
			loading = false;
		}
	}

	function handleInput(value: string) {
		searchQuery = value;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => searchMovies(value), 300);
	}

	function handleSelect(movie: Movie) {
		onselect(movie);
		open = false;
		searchQuery = '';
		results = [];
		tick().then(() => triggerRef?.focus());
	}

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => triggerRef?.focus());
	}
</script>

<Popover.Root bind:open onOpenChange={(o) => { if (!o) { searchQuery = ''; results = []; } }}>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				class="w-full justify-between"
			>
				<span class="flex items-center gap-2 text-muted-foreground">
					<Search class="size-4" />
					{placeholder}
				</span>
				<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0" align="start">
		<Command.Root shouldFilter={false}>
			<Command.Input
				placeholder="Type to search..."
				value={searchQuery}
				oninput={(e) => handleInput(e.currentTarget.value)}
				onkeydown={(e) => {
					if (e.key === 'Enter' && results.length > 0) {
						e.preventDefault();
						handleSelect(results[0]);
					}
				}}
			/>
			<Command.List>
				{#if loading}
					<Command.Loading>
						<div class="flex items-center justify-center py-6">
							<Loader2 class="size-5 animate-spin text-muted-foreground" />
						</div>
					</Command.Loading>
				{:else if searchQuery.length >= 2 && results.length === 0}
					<Command.Empty>No movies found.</Command.Empty>
				{:else if results.length > 0}
					<Command.Group>
						{#each results as movie (movie.imdbID)}
							<Command.Item
								value={movie.imdbID}
								onSelect={() => handleSelect(movie)}
								class="flex items-center gap-3 py-2"
							>
								{#if movie.poster}
									<img
										src={movie.poster}
										alt={movie.title}
										class="h-12 w-8 rounded object-cover"
									/>
								{:else}
									<div class="flex h-12 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
										N/A
									</div>
								{/if}
								<div class="flex flex-col">
									<span class="font-medium">{movie.title}</span>
									<span class="text-sm text-muted-foreground">{movie.year}</span>
								</div>
							</Command.Item>
						{/each}
					</Command.Group>
				{:else}
					<div class="py-6 text-center text-sm text-muted-foreground">
						Start typing to search movies
					</div>
				{/if}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
