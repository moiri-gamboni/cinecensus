<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Movie } from '$lib/types/poll';

	interface Props {
		movies: Movie[];
		onfilter: (filtered: Movie[], query: string) => void;
		placeholder?: string;
	}

	let { movies, onfilter, placeholder = 'Filter movies...' }: Props = $props();

	let query = $state('');

	function filterMovies(q: string) {
		query = q;
		if (!q.trim()) {
			onfilter(movies, '');
			return;
		}
		const lower = q.toLowerCase();
		const filtered = movies.filter(
			(m) => m.title.toLowerCase().includes(lower) || m.year.includes(q)
		);
		onfilter(filtered, q);
	}

	function clear() {
		query = '';
		onfilter(movies, '');
	}
</script>

<div class="relative">
	<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
	<Input
		type="text"
		{placeholder}
		value={query}
		oninput={(e) => filterMovies(e.currentTarget.value)}
		class="pl-9 pr-9"
	/>
	{#if query}
		<Button
			variant="ghost"
			size="sm"
			class="absolute right-1 top-1/2 size-7 -translate-y-1/2 p-0"
			onclick={clear}
		>
			<X class="size-4" />
		</Button>
	{/if}
</div>
