<script lang="ts">
	import { enhance } from '$app/forms';
	import type { BggSearchResult } from '$lib/server/bgg/types';

	/**
	 * The `bgg-game-search-import` widget: type a name, pick a BGG search
	 * result, submit it to `addAction`. Shared by the pool builder and
	 * collection editing (Principle IX — reuse, don't duplicate) so both add
	 * flows go through the same idle/searching/results/empty/error states.
	 */
	let {
		addAction,
		addLabel = 'list'
	}: { addAction: string; addLabel?: string } = $props();

	let query = $state('');
	type SearchState = 'idle' | 'searching' | 'results' | 'empty' | 'error';
	let searchState = $state<SearchState>('idle');
	let results = $state<BggSearchResult[]>([]);

	async function runSearch(event: SubmitEvent) {
		event.preventDefault();
		const q = query.trim();
		if (!q) return;
		searchState = 'searching';
		try {
			const res = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`);
			if (!res.ok) throw new Error(`search failed (${res.status})`);
			results = (await res.json()) as BggSearchResult[];
			searchState = results.length > 0 ? 'results' : 'empty';
		} catch {
			results = [];
			searchState = 'error';
		}
	}
</script>

<p class="text-sm opacity-70">
	Add any game from BoardGameGeek — even one not in a {addLabel} yet.
</p>
<form class="flex items-end gap-2" onsubmit={runSearch}>
	<div class="form-control flex-1">
		<label class="label" for="bggQuery"><span class="label-text">Game name</span></label>
		<input
			id="bggQuery"
			name="bggQuery"
			class="input input-bordered w-full"
			bind:value={query}
			placeholder="e.g. Gloomhaven"
		/>
	</div>
	<button type="submit" class="btn btn-primary" disabled={searchState === 'searching'}>
		{searchState === 'searching' ? 'Searching…' : 'Search'}
	</button>
</form>

{#if searchState === 'searching'}
	<p role="status" class="text-sm opacity-70">Searching BGG…</p>
{:else if searchState === 'error'}
	<p role="alert" class="alert alert-error text-sm">Couldn’t reach BGG. Please try again.</p>
{:else if searchState === 'empty'}
	<p role="status" class="text-sm opacity-70">No games matched that search.</p>
{:else if searchState === 'results'}
	<ul class="flex flex-col divide-y divide-base-300" aria-label="Search results">
		{#each results as result (result.bggId)}
			<li class="flex items-center justify-between gap-3 py-2">
				<span class="font-medium">
					{result.name}
					{#if result.yearPublished}<span class="text-xs opacity-60">({result.yearPublished})</span>{/if}
				</span>
				<form method="POST" action={addAction} use:enhance>
					<input type="hidden" name="bggId" value={result.bggId} />
					<input type="hidden" name="name" value={result.name} />
					{#if result.yearPublished}<input type="hidden" name="yearPublished" value={result.yearPublished} />{/if}
					<button type="submit" class="btn btn-outline btn-xs" aria-label="Add {result.name} to {addLabel}">
						Add
					</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}
