<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { listStatusLabel, rankingMethodLabel } from '$lib/domain/listView';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>{data.pool.name} · pool · yet-another-rank-games</title>
</svelte:head>

<main>
	<h1>{data.pool.name}</h1>

	{#if form && 'error' in form && form.error}
		<p role="alert" class="error">{form.error}</p>
	{/if}
	{#if form && 'added' in form}
		<p role="status">Added {form.added} game{form.added === 1 ? '' : 's'} ({form.matched} matched).</p>
	{/if}

	<section aria-labelledby="games-heading">
		<h2 id="games-heading">Games in this pool ({data.games.length})</h2>
		<ul>
			{#each data.games as game (game.id)}
				<li>
					{game.name}
					<form method="POST" action="?/removeGame" use:enhance>
						<input type="hidden" name="gameId" value={game.id} />
						<button type="submit" aria-label="Remove {game.name}">Remove</button>
					</form>
				</li>
			{:else}
				<li>No games yet — add some by filter below.</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="filter-heading">
		<h2 id="filter-heading">Add games by filter</h2>
		<form method="POST" action="?/addByFilter" use:enhance>
			<div>
				<label for="collectionId">From collection</label>
				<select id="collectionId" name="collectionId" required>
					{#each data.collections as collection (collection.id)}
						<option value={collection.id}>{collection.bggUsername}</option>
					{/each}
				</select>
			</div>
			<fieldset>
				<legend>Filter (optional)</legend>
				<div>
					<label for="mechanicsInclude">Mechanics include (comma-separated)</label>
					<input id="mechanicsInclude" name="mechanicsInclude" />
				</div>
				<div>
					<label for="weightMin">Weight min</label>
					<input id="weightMin" name="weightMin" type="number" step="0.1" min="1" max="5" />
				</div>
				<div>
					<label for="weightMax">Weight max</label>
					<input id="weightMax" name="weightMax" type="number" step="0.1" min="1" max="5" />
				</div>
				<div>
					<label for="playerCount">Supports player count</label>
					<input id="playerCount" name="playerCount" type="number" min="1" />
				</div>
				<div>
					<label for="playingTimeMax">Max playing time (min)</label>
					<input id="playingTimeMax" name="playingTimeMax" type="number" min="1" />
				</div>
				<label><input type="checkbox" name="ownedOnly" /> Owned games only</label>
			</fieldset>
			<button type="submit">Add matching games</button>
		</form>
	</section>

	<section aria-labelledby="lists-heading">
		<h2 id="lists-heading">Lists from this pool</h2>
		<ul>
			{#each data.lists as list (list.id)}
				<li>
					<a href={resolve('/lists/[id]', { id: list.id })}>{list.name}</a>
					<span>{rankingMethodLabel(list.rankingMethod)}</span>
					<span data-status={list.status}>{listStatusLabel(list.status)}</span>
				</li>
			{:else}
				<li>No lists yet — create one below.</li>
			{/each}
		</ul>

		<h3>Create a list</h3>
		<form method="POST" action="?/createList" use:enhance>
			<div>
				<label for="name">List name</label>
				<input id="name" name="name" required />
			</div>
			<div>
				<label for="description">Description (optional)</label>
				<input id="description" name="description" />
			</div>
			<fieldset>
				<legend>Ranking method</legend>
				<label><input type="radio" name="rankingMethod" value="pairwise" checked /> Pairwise</label>
				<label><input type="radio" name="rankingMethod" value="manual" /> Manual</label>
			</fieldset>
			<button type="submit">Create list</button>
		</form>
	</section>
</main>
