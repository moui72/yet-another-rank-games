<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { spineColor } from '$lib/spine';

	type Item = { id: number; name: string };
	let { listId, games }: { listId: string; games: Item[] } = $props();

	// This component is keyed by list id in the parent, so it remounts (fresh
	// state) per list; capturing the initial `games` here is intentional.
	// svelte-ignore state_referenced_locally
	let items = $state<Item[]>(games.map((g) => ({ id: g.id, name: g.name })));
	const reorderUrl = $derived(`/api/lists/${listId}/reorder`);
	const flipMs = 150;

	let persistChain: Promise<unknown> = Promise.resolve();

	function consider(e: CustomEvent<DndEvent<Item>>) {
		items = e.detail.items;
	}
	function finalize(e: CustomEvent<DndEvent<Item>>) {
		items = e.detail.items;
		const gameIds = items.map((i) => i.id);
		persistChain = persistChain
			.then(() =>
				fetch(reorderUrl, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ gameIds })
				})
			)
			.catch(() => {});
	}
</script>

<section class="flex flex-col gap-3" aria-labelledby="order-heading">
	<div>
		<h2 id="order-heading" class="text-lg font-semibold">Drag to order</h2>
		<p class="text-sm opacity-70">
			Drag games into your preferred order — or focus one and use the keyboard (Space to lift,
			arrows to move, Space to drop). Your order saves automatically.
		</p>
	</div>

	{#if items.length}
		<ul
			class="flex flex-col gap-1.5"
			use:dndzone={{ items, flipDurationMs: flipMs }}
			onconsider={consider}
			onfinalize={finalize}
		>
			{#each items as item, i (item.id)}
				<li
					animate:flip={{ duration: flipMs }}
					class="spine cursor-grab active:cursor-grabbing"
					style="background:{spineColor(i)}"
				>
					<span class="spine-rank">{String(i + 1).padStart(2, '0')}</span>
					<span class="truncate">{item.name}</span>
					<span class="ml-auto opacity-70" aria-hidden="true">⠿</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="alert">Add at least one game to this list's pool to order it.</p>
	{/if}
</section>
