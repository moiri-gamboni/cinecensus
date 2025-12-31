<svelte:head>
	<title>Privacy Policy - CineCensus</title>
	<meta name="description" content="CineCensus privacy policy - how we handle your data" />
</svelte:head>

<article class="space-y-8">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Privacy Policy</h1>
		<p class="mt-2 text-muted-foreground">Last updated: December 31, 2025</p>
	</header>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Overview</h2>
		<p class="text-muted-foreground">
			CineCensus is designed with privacy in mind. We collect minimal data necessary to provide
			the service and do not track individual users.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Data We Collect</h2>

		<div class="space-y-2">
			<h3 class="font-medium">Poll Data</h3>
			<p class="text-muted-foreground">When you create a poll, we store:</p>
			<ul class="list-disc space-y-1 pl-6 text-muted-foreground">
				<li>Poll title and settings</li>
				<li>Movies added to the poll</li>
				<li>Votes submitted by participants</li>
			</ul>
			<p class="text-muted-foreground">
				Polls are accessible via unique URLs. Anyone with the link can view and vote on the poll.
			</p>
		</div>

		<div class="space-y-2">
			<h3 class="font-medium">Local Storage</h3>
			<p class="text-muted-foreground">We use your browser's local storage to:</p>
			<ul class="list-disc space-y-1 pl-6 text-muted-foreground">
				<li>Remember polls you've created (so you can manage them)</li>
				<li>Store your theme preference (light/dark mode)</li>
			</ul>
			<p class="text-muted-foreground">This data never leaves your device.</p>
		</div>

		<div class="space-y-2">
			<h3 class="font-medium">Cookies</h3>
			<p class="text-muted-foreground">
				We use a single HttpOnly cookie (<code class="rounded bg-muted px-1.5 py-0.5 text-sm">voter_fingerprint</code>) to prevent duplicate voting
				on polls. This cookie contains a random identifier and is not used for tracking.
			</p>
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Analytics</h2>
		<p class="text-muted-foreground">
			We use <a href="https://simpleanalytics.com" target="_blank" rel="noopener noreferrer" class="text-foreground underline underline-offset-4 hover:text-primary">Simple Analytics</a>
			for privacy-friendly website analytics. Simple Analytics:
		</p>
		<ul class="list-disc space-y-1 pl-6 text-muted-foreground">
			<li>Does not use cookies</li>
			<li>Does not collect personal data</li>
			<li>Does not track visitors across websites</li>
			<li>Is GDPR compliant by design</li>
		</ul>
		<p class="text-muted-foreground">
			You can view our public analytics dashboard at
			<a href="https://simpleanalytics.com/cinecensus.moiri.dev" target="_blank" rel="noopener noreferrer" class="text-foreground underline underline-offset-4 hover:text-primary">
				simpleanalytics.com/cinecensus.moiri.dev</a>.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Third-Party Services</h2>
		<p class="text-muted-foreground">We use the following third-party services:</p>
		<ul class="list-disc space-y-1 pl-6 text-muted-foreground">
			<li><strong class="text-foreground">Supabase</strong> - Database hosting for polls and votes</li>
			<li><strong class="text-foreground">OMDb API</strong> - Movie poster images and additional movie data</li>
			<li><strong class="text-foreground">Cloudflare</strong> - Hosting and content delivery</li>
		</ul>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Data Retention</h2>
		<p class="text-muted-foreground">
			Polls are automatically deleted after 30 days of inactivity. Each vote resets this timer.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Your Rights</h2>
		<p class="text-muted-foreground">
			Since we don't collect personal data or require accounts, there's no personal data to
			access, modify, or delete.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-xl font-semibold">Contact</h2>
		<p class="text-muted-foreground">
			For questions or feedback, email me at
			<a href="mailto:cinecensus@moiri.dev" class="text-foreground underline underline-offset-4 hover:text-primary">cinecensus@moiri.dev</a>.
		</p>
	</section>
</article>
