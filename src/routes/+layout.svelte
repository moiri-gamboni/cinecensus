<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import ModeToggle from '$lib/components/ModeToggle.svelte';
	import Film from '@lucide/svelte/icons/film';
	import { preload } from '$lib/utils/movie-search';

	let { children } = $props();

	// Preload search index when browser is idle
	onMount(() => {
		requestIdleCallback(() => preload(), { timeout: 3000 });
	});
</script>

<svelte:head>
	<title>CineCensus - Movie Voting</title>
	<meta name="description" content="Create and share movie polls with friends" />
</svelte:head>

<ModeWatcher />
<Toaster richColors />
<Tooltip.Provider>

<div class="min-h-screen bg-background text-foreground">
	<header class="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
			<a href="/" class="flex items-center gap-2 transition-opacity hover:opacity-80">
				<Film class="size-6 text-primary" />
				<span class="text-xl font-bold tracking-tight">CineCensus</span>
			</a>
			<ModeToggle />
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
		<p>Create movie polls and vote with friends</p>
	</footer>
</div>

</Tooltip.Provider>
