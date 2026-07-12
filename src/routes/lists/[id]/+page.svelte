<script lang="ts">
	import { resolve } from '$app/paths';
	import PairwiseRanker from '$lib/components/PairwiseRanker.svelte';
	import ManualRanker from '$lib/components/ManualRanker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const exportBase = $derived(resolve('/api/lists/[id]/export', { id: data.list.id }));
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

	<section class="flex flex-col gap-2" aria-labelledby="export-heading">
		<h2 id="export-heading" class="text-lg font-semibold">Export</h2>
		<div class="flex flex-wrap gap-2">
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=md" download>Markdown</a>
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=csv" download>CSV</a>
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=json" download>JSON</a>
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=bbcode" download>GeekList</a>
		</div>
		<p class="text-sm opacity-70">GeekList: paste into a new GeekList on BGG.</p>
	</section>
</main>
