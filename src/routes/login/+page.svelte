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

<main class="flex justify-center">
	<div class="card bg-base-200 w-full max-w-sm shadow-sm">
		<div class="card-body gap-4">
			<h1 class="card-title text-2xl">{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>

			<form class="flex flex-col gap-3" onsubmit={submit}>
				<div class="form-control">
					<label class="label" for="email"><span class="label-text">Email</span></label>
					<input
						id="email"
						type="email"
						autocomplete="email"
						class="input input-bordered w-full"
						bind:value={email}
						required
					/>
				</div>
				<div class="form-control">
					<label class="label" for="password"><span class="label-text">Password</span></label>
					<input
						id="password"
						type="password"
						autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
						class="input input-bordered w-full"
						bind:value={password}
						required
					/>
				</div>

				{#if error}
					<p role="alert" class="alert alert-error text-sm">{error}</p>
				{/if}

				<button type="submit" class="btn btn-primary" disabled={pending}>
					{mode === 'signin' ? 'Sign in' : 'Sign up'}
				</button>
			</form>

			<p class="text-sm">
				{#if mode === 'signin'}
					Need an account?
					<button type="button" class="link" onclick={() => (mode = 'signup')}>Create one</button>
				{:else}
					Already have an account?
					<button type="button" class="link" onclick={() => (mode = 'signin')}>Sign in</button>
				{/if}
			</p>

			<div class="flex flex-col gap-2" aria-label="Sign in with a provider">
				<button type="button" class="btn btn-outline btn-sm" onclick={() => oauth('google')}>
					Continue with Google
				</button>
				<button type="button" class="btn btn-outline btn-sm" onclick={() => oauth('github')}>
					Continue with GitHub
				</button>
			</div>
		</div>
	</div>
</main>
