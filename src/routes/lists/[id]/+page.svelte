<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import PairwiseRanker from '$lib/components/PairwiseRanker.svelte';
	import EfficientRanker from '$lib/components/EfficientRanker.svelte';
	import InfoPopover from '$lib/components/InfoPopover.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const exportBase = $derived(resolve('/api/lists/[id]/export', { id: data.list.id }));
	// Optimistic (writable $derived): flips immediately, form action persists
	// it in the background; re-syncs whenever load data changes.
	let showCoverArt = $derived(data.showCoverArt);

	// public-list-sharing: reflects the UI's own displayed state, which is
	// allowed to diverge from the (non-revocable) DB truth once a link has
	// been handed out — see ui.md.
	let isShared = $derived(data.isShared);
	let shareToken = $derived(data.shareToken);
	const sharePath = $derived(shareToken ? resolve('/share/[token]', { token: shareToken }) : null);
	const shareUrl = $derived(
		sharePath && typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : sharePath
	);
	let copyStatus = $state<'idle' | 'copied' | 'error'>('idle');

	// F001: navigator.clipboard.writeText can reject (denied permission,
	// insecure context, etc.) — surface that to the user via the existing
	// copy-status affordance instead of silently no-op'ing.
	async function copyShareLink() {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			copyStatus = 'copied';
		} catch {
			copyStatus = 'error';
		}
		setTimeout(() => (copyStatus = 'idle'), 2000);
	}
</script>

<svelte:head><title>{data.list.name} · ranking · yet-another-rank-games</title></svelte:head>

<main class="flex flex-col gap-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">{data.list.name}</h1>
		<form
			method="POST"
			action="?/toggleCoverArt"
			use:enhance={() => {
				return async ({ update }) => {
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="showCoverArt" value={(!showCoverArt).toString()} />
			<label class="label cursor-pointer gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={showCoverArt}
					onchange={(e) => {
						showCoverArt = e.currentTarget.checked;
						e.currentTarget.closest('form')?.requestSubmit();
					}}
				/>
				<span class="label-text">Show cover art</span>
			</label>
		</form>
	</div>

	{#key data.list.id}
		{#if data.mode === 'efficient'}
			<EfficientRanker listId={data.list.id} games={data.games} log={data.log} {showCoverArt} />
		{:else}
			<PairwiseRanker listId={data.list.id} games={data.games} log={data.log} {showCoverArt} />
		{/if}
	{/key}

	<section class="flex flex-col gap-2" aria-labelledby="export-heading">
		<h2 id="export-heading" class="text-lg font-semibold">
			Export
			<InfoPopover label="About export formats">
				Markdown and CSV are plain-text tables — good for notes or a
				spreadsheet. JSON is the full structured data — good for scripts or
				other tools. GeekList is BBCode you paste into a new GeekList on BGG.
			</InfoPopover>
		</h2>
		<div class="flex flex-wrap gap-2">
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=md" download>Markdown</a>
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=csv" download>CSV</a>
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=json" download>JSON</a>
			<a class="btn btn-outline btn-sm" href="{exportBase}?format=bbcode" download>GeekList</a>
		</div>
		<p class="text-sm opacity-70">GeekList: paste into a new GeekList on BGG.</p>
	</section>

	<section class="flex flex-col gap-2" aria-labelledby="share-heading">
		<h2 id="share-heading" class="text-lg font-semibold">
			Share
			<InfoPopover label="About sharing">
				Sharing is private by default. Once you turn it on, anyone with the
				link can view a read-only copy of this ranking — no login required —
				and it always reflects the list's current live order. Turning
				sharing back off stops new visibility, but a link already handed out
				keeps working.
			</InfoPopover>
		</h2>
		<form
			method="POST"
			action="?/toggleShare"
			use:enhance={() => {
				return async ({ update, result }) => {
					await update({ reset: false });
					if (result.type === 'success' && result.data) {
						isShared = result.data.isShared as boolean;
						shareToken = result.data.shareToken as string | null;
					}
				};
			}}
		>
			<input type="hidden" name="isShared" value={(!isShared).toString()} />
			<label class="label cursor-pointer gap-2">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={isShared}
					aria-describedby="share-heading"
					onchange={(e) => {
						isShared = e.currentTarget.checked;
						e.currentTarget.closest('form')?.requestSubmit();
					}}
				/>
				<span class="label-text">Share a read-only link</span>
			</label>
		</form>
		{#if shareUrl}
			<div class="flex flex-wrap items-center gap-2">
				<input
					class="input input-bordered input-sm w-full max-w-md"
					type="text"
					readonly
					aria-label="Share link"
					value={shareUrl}
				/>
				<button type="button" class="btn btn-sm" onclick={copyShareLink}>
					{#if copyStatus === 'copied'}
						Copied!
					{:else if copyStatus === 'error'}
						Copy failed
					{:else}
						Copy link
					{/if}
				</button>
				{#if copyStatus === 'error'}
					<span class="text-error text-sm">Failed to copy share link</span>
				{/if}
				<span class="sr-only" role="status" aria-live="polite">
					{#if copyStatus === 'copied'}
						Share link copied to clipboard
					{:else if copyStatus === 'error'}
						Failed to copy share link
					{/if}
				</span>
			</div>
			{#if !isShared}
				<p class="text-sm opacity-70">
					Sharing is off, but this link keeps working for anyone who already has it.
				</p>
			{/if}
		{/if}
	</section>
</main>
