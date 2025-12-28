<script lang="ts">
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { VotingMethod } from '$lib/types/poll';

	interface Props {
		value: VotingMethod;
		onchange: (value: VotingMethod) => void;
	}

	let { value, onchange }: Props = $props();

	const methods: { value: VotingMethod; label: string; description: string }[] = [
		{
			value: 'approval',
			label: 'Approval Voting',
			description: 'Vote for as many movies as you like. Most approvals wins.'
		},
		{
			value: 'single',
			label: 'Single Vote',
			description: 'Pick one favorite. Simple majority wins.'
		},
		{
			value: 'ranked',
			label: 'Ranked Choice',
			description: 'Rank movies in order. Votes transfer if your top pick is eliminated.'
		},
		{
			value: 'rating',
			label: 'Rating',
			description: 'Rate each movie 1-5 stars. Highest median rating wins.'
		}
	];
</script>

<RadioGroup.Root
	value={value}
	onValueChange={(v) => onchange(v as VotingMethod)}
	class="grid gap-3 sm:grid-cols-2"
>
	{#each methods as method}
		<Label
			class="flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
		>
			<div class="flex items-center gap-2">
				<RadioGroup.Item value={method.value} />
				<span class="font-medium">{method.label}</span>
			</div>
			<span class="text-sm text-muted-foreground">{method.description}</span>
		</Label>
	{/each}
</RadioGroup.Root>
