<script lang="ts">
	/**
	 * YARG brand mark: a messy stack of colored game boxes with "RG"
	 * superimposed — the app's collection, stacked and ranked. Variants scale the
	 * lockup up: `mark` alone, `yarg` adds the wordmark, `full` adds the name.
	 */
	let {
		variant = 'mark',
		size = 40,
		title = 'YARG'
	}: { variant?: 'mark' | 'yarg' | 'full'; size?: number; title?: string } = $props();
</script>

<span class="inline-flex items-center gap-3 align-middle" style="--mk:{size}px">
	<!-- Three offset boxes (each a darker "depth" lip + a bright face) with a
	     haloed RG on top. Decorative brights live here, not on interactive text. -->
	<svg
		width={size}
		height={size}
		viewBox="0 0 100 100"
		role="img"
		aria-label={variant === 'mark' ? title : undefined}
		aria-hidden={variant !== 'mark'}
		style="flex:none;overflow:visible"
	>
		<g transform="rotate(-4 50 75)">
			<rect x="14" y="69" width="72" height="18" rx="4.5" fill="#e08600" />
			<rect x="14" y="66" width="72" height="18" rx="4.5" fill="#ff9f1c" />
		</g>
		<g transform="rotate(5 44 55)">
			<rect x="12" y="49" width="64" height="18" rx="4.5" fill="#2b54d0" />
			<rect x="12" y="46" width="64" height="18" rx="4.5" fill="#3d6ef5" />
		</g>
		<g transform="rotate(-6 54 35)">
			<rect x="20" y="29" width="68" height="18" rx="4.5" fill="#c42a95" />
			<rect x="20" y="26" width="68" height="18" rx="4.5" fill="#e23fb0" />
		</g>
		<text
			x="50"
			y="53"
			text-anchor="middle"
			fill="#1b1830"
			stroke="#fff"
			stroke-width="6"
			paint-order="stroke"
			style="font-family:var(--font-display);font-weight:800;font-size:52px;letter-spacing:-3px"
			>RG</text
		>
	</svg>

	{#if variant === 'yarg'}
		<span
			class="font-display font-extrabold leading-none tracking-tight"
			style="font-size:calc(var(--mk) * 0.92)">YARG</span
		>
	{:else if variant === 'full'}
		<span class="flex flex-col leading-none">
			<span class="font-display font-extrabold tracking-tight" style="font-size:calc(var(--mk) * 0.5)"
				>Yet Another Rank Games</span
			>
			<span class="font-mono opacity-60" style="font-size:calc(var(--mk) * 0.2);margin-top:0.35em"
				>pairwise rankings for your shelf</span
			>
		</span>
	{/if}
</span>
