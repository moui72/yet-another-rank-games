<script lang="ts">
	import PairwiseRanker from '$lib/components/PairwiseRanker.svelte';
	import ManualRanker from '$lib/components/ManualRanker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.list.name} · ranking · yet-another-rank-games</title></svelte:head>

<main class="flex flex-col gap-6">
	<h1 class="text-2xl font-bold">{data.list.name}</h1>

	{#key data.list.id}
		{#if data.mode === 'manual'}
			<ManualRanker listId={data.list.id} games={data.games} />
		{:else}
			<PairwiseRanker listId={data.list.id} games={data.games} log={data.log} />
		{/if}
	{/key}
</main>
