<script lang="ts">
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import ClipboardPaste from '@lucide/svelte/icons/clipboard-paste';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { Movie } from '$lib/types/poll';

	interface Props {
		onresolve: (movies: Movie[]) => void;
		excludeIds?: string[];
	}

	let { onresolve, excludeIds = [] }: Props = $props();

	let open = $state(false);
	let text = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleResolve() {
		const titles = text
			.split(/[\n,]+/)
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		if (titles.length === 0) {
			error = 'Please enter at least one movie title';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/movies/resolve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ titles })
			});

			const data = await response.json();

			if (data.error) {
				error = data.error;
				return;
			}

			const resolved: Movie[] = data.results.filter(
				(m: Movie | null): m is Movie => m !== null && !excludeIds.includes(m.imdbID)
			);

			if (resolved.length === 0) {
				error = 'No movies could be resolved from your input';
				return;
			}

			onresolve(resolved);
			open = false;
			text = '';
		} catch {
			error = 'Failed to resolve movies';
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button variant="outline" {...props}>
				<ClipboardPaste class="mr-2 size-4" />
				Bulk paste
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add multiple movies</Dialog.Title>
			<Dialog.Description>
				Paste movie titles separated by new lines or commas. We'll find the best match for each.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="movies">Movie titles</Label>
				<Textarea
					id="movies"
					placeholder="The Shawshank Redemption
The Godfather
Pulp Fiction"
					rows={6}
					bind:value={text}
					disabled={loading}
				/>
			</div>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={loading}>
				Cancel
			</Button>
			<Button onclick={handleResolve} disabled={loading || !text.trim()}>
				{#if loading}
					<Loader2 class="mr-2 size-4 animate-spin" />
					Resolving...
				{:else}
					Add movies
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
