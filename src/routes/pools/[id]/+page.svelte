<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { listStatusLabel, rankingMethodLabel } from '$lib/domain/listView';
	import BggSearchAdd from '$lib/components/BggSearchAdd.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>{data.pool.name} · pool · yet-another-rank-games</title>
</svelte:head>

<main class="flex flex-col gap-6">
	<h1 class="text-2xl font-bold">{data.pool.name}</h1>

	{#if form && 'error' in form && form.error}
		<p role="alert" class="alert alert-error text-sm">{form.error}</p>
	{/if}
	{#if form && 'searchAdded' in form}
		<p role="status" class="alert alert-success text-sm">
			Added {form.added} game{form.added === 1 ? '' : 's'} from search.
		</p>
	{:else if form && 'matched' in form}
		<p role="status" class="alert alert-success text-sm">
			Added {form.added} game{form.added === 1 ? '' : 's'} ({form.matched} matched).
		</p>
	{/if}

	<section class="card bg-base-200 shadow-sm" aria-labelledby="games-heading">
		<div class="card-body gap-3">
			<h2 id="games-heading" class="card-title text-lg">Games in this pool ({data.games.length})</h2>
			<ul class="flex flex-col divide-y divide-base-300">
				{#each data.games as game (game.id)}
					<li class="flex items-center justify-between gap-3 py-2">
						<div>
							<span class="font-medium">{game.name}</span>
							<span class="text-xs opacity-60">
								{#if game.weight}· weight {game.weight.toFixed(1)}{/if}
								{#if game.minPlayers}· {game.minPlayers}–{game.maxPlayers} players{/if}
							</span>
						</div>
						<form method="POST" action="?/removeGame" use:enhance>
							<input type="hidden" name="gameId" value={game.id} />
							<button type="submit" class="btn btn-ghost btn-xs" aria-label="Remove {game.name}">
								Remove
							</button>
						</form>
					</li>
				{:else}
					<li class="py-2 text-sm opacity-70">No games yet — add some by filter below.</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="card bg-base-200 shadow-sm" aria-labelledby="filter-heading">
		<form class="card-body gap-3" method="POST" action="?/addByFilter" use:enhance>
			<h2 id="filter-heading" class="card-title text-lg">Add games by filter</h2>
			<div class="form-control">
				<label class="label" for="collectionId"><span class="label-text">From collection</span></label>
				<select id="collectionId" name="collectionId" class="select select-bordered w-full" required>
					{#each data.collections as collection (collection.id)}
						<option value={collection.id}>{collection.bggUsername}</option>
					{/each}
				</select>
			</div>
			<fieldset class="rounded-box border border-base-300 p-3">
				<legend class="px-1 text-sm font-medium">Filter (optional)</legend>
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="form-control sm:col-span-2">
						<label class="label" for="mechanicsInclude"><span class="label-text">Mechanics include (comma-separated)</span></label>
						<input id="mechanicsInclude" name="mechanicsInclude" class="input input-bordered w-full" />
					</div>
					<div class="form-control">
						<label class="label" for="weightMin"><span class="label-text">Weight min</span></label>
						<input id="weightMin" name="weightMin" type="number" step="0.1" min="1" max="5" class="input input-bordered w-full" />
					</div>
					<div class="form-control">
						<label class="label" for="weightMax"><span class="label-text">Weight max</span></label>
						<input id="weightMax" name="weightMax" type="number" step="0.1" min="1" max="5" class="input input-bordered w-full" />
					</div>
					<div class="form-control">
						<label class="label" for="playerCount"><span class="label-text">Supports player count</span></label>
						<input id="playerCount" name="playerCount" type="number" min="1" class="input input-bordered w-full" />
					</div>
					<div class="form-control">
						<label class="label" for="playingTimeMax"><span class="label-text">Max playing time (min)</span></label>
						<input id="playingTimeMax" name="playingTimeMax" type="number" min="1" class="input input-bordered w-full" />
					</div>
					<div class="form-control sm:col-span-2">
						<label class="label" for="expansions"><span class="label-text">Expansions & promos</span></label>
						<select id="expansions" name="expansions" class="select select-bordered w-full">
							<option value="">Include both</option>
							<option value="exclude">Base games only</option>
							<option value="only">Expansions & promos only</option>
						</select>
					</div>
					<label class="label cursor-pointer justify-start gap-2 sm:col-span-2">
						<input type="checkbox" name="ownedOnly" class="checkbox checkbox-sm" />
						<span class="label-text">Owned games only</span>
					</label>
				</div>
			</fieldset>
			<button type="submit" class="btn btn-primary self-start">Add matching games</button>
		</form>
	</section>

	<section class="card bg-base-200 shadow-sm" aria-labelledby="search-heading">
		<div class="card-body gap-3">
			<h2 id="search-heading" class="card-title text-lg">Search BGG to add a game</h2>
			<BggSearchAdd addAction="?/addFromSearch" addLabel="pool" />
		</div>
	</section>

	<section class="card bg-base-200 shadow-sm" aria-labelledby="lists-heading">
		<div class="card-body gap-3">
			<h2 id="lists-heading" class="card-title text-lg">Lists from this pool</h2>
			<ul class="flex flex-col divide-y divide-base-300">
				{#each data.lists as list (list.id)}
					<li class="flex items-center justify-between gap-3 py-2">
						<a class="link link-hover font-medium" href={resolve('/lists/[id]', { id: list.id })}>{list.name}</a>
						<span class="flex gap-2 text-xs">
							<span class="badge badge-ghost">{rankingMethodLabel(list.rankingMethod)}</span>
							<span class="badge" data-status={list.status}>{listStatusLabel(list.status)}</span>
						</span>
					</li>
				{:else}
					<li class="py-2 text-sm opacity-70">No lists yet — create one below.</li>
				{/each}
			</ul>

			<h3 class="mt-2 font-semibold">Create a list</h3>
			<form class="flex flex-col gap-3" method="POST" action="?/createList" use:enhance>
				<div class="form-control">
					<label class="label" for="name"><span class="label-text">List name</span></label>
					<input id="name" name="name" class="input input-bordered w-full" required />
				</div>
				<div class="form-control">
					<label class="label" for="description"><span class="label-text">Description (optional)</span></label>
					<input id="description" name="description" class="input input-bordered w-full" />
				</div>
				<fieldset class="flex gap-4">
					<legend class="text-sm font-medium">Ranking method</legend>
					<label class="label cursor-pointer gap-2">
						<input type="radio" name="rankingMethod" value="pairwise" class="radio radio-sm" checked />
						<span class="label-text">Pairwise</span>
					</label>
					<label class="label cursor-pointer gap-2">
						<input type="radio" name="rankingMethod" value="manual" class="radio radio-sm" />
						<span class="label-text">Manual</span>
					</label>
				</fieldset>
				<button type="submit" class="btn btn-primary self-start">Create list</button>
			</form>
		</div>
	</section>
</main>
