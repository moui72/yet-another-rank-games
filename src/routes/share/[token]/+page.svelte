<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.listName} · shared ranking · yet-another-rank-games</title></svelte:head>

<main class="mx-auto flex max-w-2xl flex-col gap-4 p-4">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">{data.listName}</h1>
		<p class="text-sm opacity-70">
			A read-only, live view of this ranking — it always reflects the current order.
		</p>
	</div>

	{#if data.entries.length === 0}
		<p class="text-sm opacity-70">No games ranked yet.</p>
	{:else}
		<ol class="flex flex-col gap-1" aria-label="Ranked games">
			{#each data.entries as entry (entry.rank)}
				<li class="border-base-300 flex items-center justify-between gap-2 border-b py-2">
					<span><span class="font-semibold">{entry.rank}.</span> {entry.name}</span>
					{#if entry.score !== null}
						<span class="text-sm opacity-60">{entry.score.toFixed(2)}</span>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</main>
