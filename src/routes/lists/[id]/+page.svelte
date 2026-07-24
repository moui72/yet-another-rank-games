<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import PairwiseRanker from '$lib/components/PairwiseRanker.svelte';
	import EfficientRanker from '$lib/components/EfficientRanker.svelte';
	import InfoPopover from '$lib/components/InfoPopover.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const exportBase = $derived(resolve('/api/lists/[id]/export', { id: data.list.id }));
	// Optimistic (writable $derived): flips immediately, form action persists
	// it in the background; re-syncs whenever load data changes.
	let showCoverArt = $derived(data.showCoverArt);
</script>

<svelte:head><title>{data.list.name} · ranking · yet-another-rank-games</title></svelte:head>

<main class="flex flex-col gap-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">{data.list.name}</h1>
		<form
			method="POST"
			action="?/toggleCoverArt"
			use:enhance={() => {
				return async ({ update }) => {
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="showCoverArt" value={(!showCoverArt).toString()} />
			<label class="label cursor-pointer gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={showCoverArt}
					onchange={(e) => {
						showCoverArt = e.currentTarget.checked;
						e.currentTarget.closest('form')?.requestSubmit();
					}}
				/>
				<span class="label-text">Show cover art</span>
			</label>
		</form>
	</div>

	{#key data.list.id}
		{#if data.mode === 'efficient'}
			<EfficientRanker listId={data.list.id} games={data.games} log={data.log} {showCoverArt} />
		{:else}
			<PairwiseRanker listId={data.list.id} games={data.games} log={data.log} {showCoverArt} />
		{/if}
	{/key}

	<section class="flex flex-col gap-2" aria-labelledby="export-heading">
		<h2 id="export-heading" class="text-lg font-semibold">
			Export
			<InfoPopover label="About export formats">
				Markdown and CSV are plain-text tables — good for notes or a
				spreadsheet. JSON is the full structured data — good for scripts or
				other tools. GeekList is BBCode you paste into a new GeekList on BGG.
			</InfoPopover>
		</h2>
		<div class="flex flex-wrap gap-2">
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=md" download>Markdown</a>
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=csv" download>CSV</a>
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=json" download>JSON</a>
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=bbcode" download>GeekList</a>
		</div>
		<p class="text-sm opacity-70">GeekList: paste into a new GeekList on BGG.</p>
	</section>
</main>
