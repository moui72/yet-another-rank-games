<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { invalidate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	onMount(() => {
		const {
			data: { subscription }
		} = data.supabase.auth.onAuthStateChange((_event, newSession) => {
			// Re-run load functions when the session changes (sign in/out).
			if (newSession?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => subscription.unsubscribe();
	});

	async function signOut() {
		await data.supabase.auth.signOut();
		await goto(resolve('/'));
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<nav aria-label="Primary">
		<a href={resolve('/')}>yet-another-rank-games</a>
		{#if data.user}
			<span>{data.user.email}</span>
			<button type="button" onclick={signOut}>Sign out</button>
		{:else}
			<a href={resolve('/login')}>Sign in</a>
		{/if}
	</nav>
</header>

{@render children()}
