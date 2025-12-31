<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import ModeToggle from '$lib/components/ModeToggle.svelte';
	import Film from '@lucide/svelte/icons/film';
	import Bug from '@lucide/svelte/icons/bug';
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

	<!-- Open Graph -->
	<meta property="og:title" content="CineCensus - Movie Voting" />
	<meta property="og:description" content="Create polls, add movies, share with friends, vote together" />
	<meta property="og:image" content="https://cinecensus.moiri.dev/og-image.jpg" />
	<meta property="og:url" content="https://cinecensus.moiri.dev" />
	<meta property="og:type" content="website" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="CineCensus - Movie Voting" />
	<meta name="twitter:description" content="Create polls, add movies, share with friends, vote together" />
	<meta name="twitter:image" content="https://cinecensus.moiri.dev/og-image.jpg" />

	<!-- Canonical -->
	<link rel="canonical" href="https://cinecensus.moiri.dev" />

	<!-- Structured Data -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "WebApplication",
		"name": "CineCensus",
		"description": "Create and share movie polls with friends",
		"url": "https://cinecensus.moiri.dev",
		"applicationCategory": "Entertainment",
		"operatingSystem": "Any"
	})}</script>`}
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
		<p class="mb-2">Create movie polls and vote with friends</p>
		<div class="flex items-center justify-center gap-4">
			<a
				href="https://github.com/moiri-gamboni/cinecensus/issues/new/choose"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1 hover:text-foreground transition-colors"
			>
				<Bug class="size-4" />
				Report a bug
			</a>
			<span class="text-border">•</span>
			<span class="flex items-center gap-1">
				Developed by
				<a
					href="https://www.linkedin.com/in/moiri-gamboni/"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 hover:text-foreground transition-colors"
				>
					Moïri Gamboni
					<svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
						<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
					</svg>
				</a>
			</span>
		</div>
	</footer>
</div>

</Tooltip.Provider>
