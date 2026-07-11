<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.collection.bggUsername}'s collection · yet-another-rank-games</title>
</svelte:head>

<main>
	<h1>{data.collection.bggUsername}'s collection</h1>
	<p>{data.gameCount} game{data.gameCount === 1 ? '' : 's'} imported.</p>
	<p>
		Build a <a href={resolve('/pools')}>pool</a> from your games, then create ranked
		lists from it.
	</p>
</main>
