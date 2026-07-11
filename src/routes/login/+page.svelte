<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import type { Provider } from '@supabase/supabase-js';

	let { data }: { data: PageData } = $props();

	let mode = $state<'signin' | 'signup'>('signin');
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let pending = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		pending = true;
		const { error: err } =
			mode === 'signin'
				? await data.supabase.auth.signInWithPassword({ email, password })
				: await data.supabase.auth.signUp({ email, password });
		pending = false;
		if (err) {
			error = err.message;
		} else {
			await goto(resolve('/'));
		}
	}

	async function oauth(provider: Provider) {
		error = '';
		const { error: err } = await data.supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo: `${location.origin}/auth/callback` }
		});
		if (err) error = err.message;
	}
</script>

<svelte:head>
	<title>Sign in · yet-another-rank-games</title>
</svelte:head>

<main>
	<h1>{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>

	<form onsubmit={submit}>
		<div>
			<label for="email">Email</label>
			<input id="email" type="email" autocomplete="email" bind:value={email} required />
		</div>
		<div>
			<label for="password">Password</label>
			<input
				id="password"
				type="password"
				autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
				bind:value={password}
				required
			/>
		</div>

		{#if error}
			<p role="alert" class="error">{error}</p>
		{/if}

		<button type="submit" disabled={pending}>
			{mode === 'signin' ? 'Sign in' : 'Sign up'}
		</button>
	</form>

	<p>
		{#if mode === 'signin'}
			Need an account?
			<button type="button" onclick={() => (mode = 'signup')}>Create one</button>
		{:else}
			Already have an account?
			<button type="button" onclick={() => (mode = 'signin')}>Sign in</button>
		{/if}
	</p>

	<div aria-label="Sign in with a provider">
		<button type="button" onclick={() => oauth('google')}>Continue with Google</button>
		<button type="button" onclick={() => oauth('github')}>Continue with GitHub</button>
	</div>
</main>
