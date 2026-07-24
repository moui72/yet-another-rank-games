<script lang="ts">
	/**
	 * Inline contextual help (feature `in-app-help-and-info-text`, `ui.md`):
	 * an "ⓘ" trigger that toggles a short static blurb, so explanatory copy
	 * sits on the view where the confusion arises instead of a separate help
	 * page. Two states only — collapsed (trigger) and expanded (blurb shown).
	 * Keyboard-operable (Enter/Space to toggle via the native `<button>`, Esc
	 * to dismiss and return focus to the trigger), `aria-expanded`-wired and
	 * labelled, per constitution Principle VI. No new dependency — DaisyUI/
	 * Tailwind + Svelte 5 runes only.
	 */
	let {
		label = 'More info',
		children
	}: {
		/** Accessible name for the trigger (e.g. "About the pool hierarchy"). */
		label?: string;
		children: import('svelte').Snippet;
	} = $props();

	let open = $state(false);
	let triggerEl: HTMLButtonElement | undefined = $state();

	function toggle() {
		open = !open;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			event.stopPropagation();
			open = false;
			triggerEl?.focus();
		}
	}
</script>

<span class="info-popover relative inline-block">
	<button
		bind:this={triggerEl}
		type="button"
		class="btn btn-ghost btn-xs btn-circle align-middle"
		aria-label={label}
		aria-expanded={open}
		onclick={toggle}
		onkeydown={onKeydown}
	>
		<span aria-hidden="true">ⓘ</span>
	</button>
	{#if open}
		<div
			role="note"
			aria-label={label}
			class="bg-base-100 border-base-300 text-base-content absolute top-full left-0 z-10 mt-1 w-64 rounded-box border p-3 text-sm shadow-lg"
		>
			{@render children()}
		</div>
	{/if}
</span>
