<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>{data.collection.bggUsername}'s collection · yet-another-rank-games</title>
</svelte:head>

<main>
	<h1>{data.collection.bggUsername}'s collection</h1>

	<section>
		<h2>Lists</h2>
		<ul>
			{#each data.lists as list (list.id)}
				<li>{list.name} — {list.rankingMethod}</li>
			{:else}
				<li>No lists yet — create one below.</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>Create a list</h2>
		<form method="POST" action="?/create" use:enhance>
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

			{#if form?.error}
				<p role="alert" class="error">{form.error}</p>
			{/if}

			<button type="submit">Create list</button>
		</form>
	</section>
</main>
