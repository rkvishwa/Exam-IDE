<script lang="ts">
	import { 
		ShieldAlert, 
		Activity, 
		Users, 
		Code2, 
		ChevronRight, 
		Eye, 
		Lock,
		FileBox,
		Download,
		Terminal,
		Link2,
		Copy,
		Check,
		Zap,
		ArrowRight,
		Monitor,
		Sparkles,
		Settings
	} from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';

	type ClientOS = 'windows' | 'mac' | 'other';

	let mounted = $state(false);
	
	// Spotlight effect state
	let mouseX = $state(0);
	let mouseY = $state(0);
	let isHovering = $state(false);
	let clientOS = $state<ClientOS>('other');
	let linkCopied = $state(false);
	let sectionRef: HTMLElement;
	const macDownloadLink = 'https://github.com/rkvishwa/Sonar-Code-Editor/releases/latest';

	function copyMacLink() {
		navigator.clipboard.writeText(macDownloadLink).then(() => {
			linkCopied = true;
			setTimeout(() => { linkCopied = false; }, 2000);
		});
	}

	function handleMouseMove(e: MouseEvent) {
		if (!sectionRef) return;
		const rect = sectionRef.getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;
	}

	function handleMouseEnter() { isHovering = true; }
	function handleMouseLeave() { isHovering = false; }

	onMount(() => {
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('windows')) {
			clientOS = 'windows';
		} else if (ua.includes('macintosh') || ua.includes('mac os x')) {
			clientOS = 'mac';
		} else {
			clientOS = 'other';
		}

		mounted = true;
	});
</script>

<svelte:head>
	<title>Sonar IDE | Supervised Coding & Exam Environment</title>
	<meta name="description" content="A real-time collaborative code editor built for supervised teams, featuring advanced activity monitoring and strict local environments." />
</svelte:head>

<!-- Hero Section -->
<section class="relative flex flex-col items-start justify-center px-4 sm:px-8 lg:px-[10%] pt-20 sm:pt-24 xl:pt-32 pb-32 sm:pb-40 overflow-hidden min-h-screen">

<!-- Radial fade mask for top/sides -->
<div class="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_top,transparent_16%,rgba(247,251,255,0.96)_78%)] dark:bg-[radial-gradient(circle_at_top,transparent_16%,rgba(7,16,24,0.94)_78%)]"></div>

<!-- Hero Two-Column Layout -->
<div class="relative z-10 w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-start text-left">

<!-- Left Column Component -->
<div class="flex flex-col items-start w-full lg:w-1/2" class:animate-hero-in={mounted}>



<!-- Logo mark -->
<div class="mb-6 hero-stagger-2">
<div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 flex items-center justify-center shadow-xl shadow-blue-500/20 dark:shadow-blue-400/20">
<img src="/favicon.png" alt="Sonar Icon" class="w-10 h-10 sm:w-12 sm:h-12 brightness-0 invert" />
</div>
</div>

<!-- Heading -->
<h1 class="text-[clamp(3rem,6vw,5rem)] font-bold tracking-tight leading-[1.1] text-zinc-900 dark:text-white mb-5 hero-stagger-3">
The IDE built for<br/>
<span class="relative inline-flex items-end whitespace-nowrap">
<span class="relative text-transparent bg-clip-text bg-gradient-to-r from-cyan-700 via-sky-600 to-blue-700 dark:from-cyan-200 dark:via-sky-300 dark:to-blue-300 animate-gradient bg-[length:220%_auto]">supervision</span><span class="relative animate-pulse text-cyan-500 dark:text-cyan-300 inline-block -ml-1">_</span>
</span>
</h1>

<!-- Subtitle -->
<p class="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-[520px] mb-10 leading-relaxed hero-stagger-4">
Real-time collaboration, exam monitoring, and secure coding - powered by Monaco and Electron.
</p>

<!-- CTA buttons -->
<div class="flex flex-col items-start justify-start gap-4 hero-stagger-5 w-full">
{#if clientOS === 'mac'}
<div class="w-full sm:max-w-md flex flex-col gap-3">
	<div class="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-1.5 backdrop-blur-md flex items-center shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-white/20">
		<div class="flex items-center flex-1 min-w-0 pl-3">
			<Terminal size={14} class="text-zinc-400 mr-2 shrink-0" />
			<input
				id="mac-download-link"
				type="text"
				value={macDownloadLink}
				readonly
				onclick={(event) => (event.currentTarget as HTMLInputElement).select()}
				class="bg-transparent text-sm font-mono text-zinc-700 dark:text-zinc-300 w-full outline-none truncate cursor-copy selection:bg-cyan-500/20"
			/>
		</div>
		<button
			onclick={copyMacLink}
			aria-label="Copy link"
			class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all
				{linkCopied
					? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
					: 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400'}"
		>
			{#if linkCopied}
				<Check size={14} />
			{:else}
				<Copy size={14} />
			{/if}
		</button>
	</div>
	<p class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 pl-1">Paste this link in your terminal to install.</p>
	<p class="text-xs text-zinc-600 dark:text-zinc-400 pl-1 mt-1">Already installed an older version? <a href="/download" class="text-cyan-600 dark:text-cyan-400 hover:underline font-medium">Get updates &rarr;</a></p>
</div>
{:else}
<div class="w-full sm:w-auto">
<a href="/download" class="shake-btn group w-full sm:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-lg shadow-lg shadow-zinc-900/10 dark:shadow-white/10 flex items-center justify-center gap-2 text-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
<Download size={15} />
<span>Download for Windows</span>
</a>
<p class="mt-3 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Allow permission in your browser to download the file.</p>
<p class="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Already installed an older version? <a href="/download" class="text-cyan-600 dark:text-cyan-400 hover:underline font-medium">Get updates &rarr;</a></p>
</div>
{/if}
<a href="/docs" class="shake-btn group w-full sm:w-auto px-6 py-2.5 bg-white/70 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.1] backdrop-blur-md text-zinc-700 dark:text-zinc-300 font-medium rounded-lg flex items-center justify-center gap-2 border border-zinc-200/80 dark:border-white/[0.08] text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-sm">
<span>Read Docs</span>
<ArrowRight size={14} class="opacity-50 group-hover:translate-x-0.5 transition-transform" />
</a>
</div>
</div>

<!-- Right Column -->
    <div class="hidden lg:block w-1/2 relative h-[500px] overflow-hidden rounded-xl" style="mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);">
      <!-- Dark mode images -->
      <div class="absolute inset-0 flex-col gap-4 h-full w-full hidden dark:flex">
          <!-- Row 1 -->
          <div class="flex-1 flex flex-row gap-4 animate-marquee-right-fast w-max">
              <img src="/gallery/1.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/2.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/1.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/2.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/1.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/2.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <!-- Duplicated for seamless loop -->
              <img src="/gallery/1.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/2.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/1.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/2.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/1.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/2.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
          </div>
          <!-- Row 2 (staggered) -->
          <div class="flex-1 flex flex-row gap-4 animate-marquee-right-slow w-max ml-[-200px]">
              <img src="/gallery/3.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/4.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/3.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/4.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/3.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/4.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <!-- Duplicated for seamless loop -->
              <img src="/gallery/3.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/4.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/3.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/4.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/3.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/4.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
          </div>
      </div>
      <!-- Light mode images -->
      <div class="absolute inset-0 flex-col gap-4 h-full w-full flex dark:hidden">
          <!-- Row 1 -->
          <div class="flex-1 flex flex-row gap-4 animate-marquee-right-fast w-max">
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/6.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/6.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/6.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <!-- Duplicated for seamless loop -->
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/6.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/6.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/6.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
          </div>
          <!-- Row 2 (staggered) -->
          <div class="flex-1 flex flex-row gap-4 animate-marquee-right-slow w-max ml-[-200px]">
              <img src="/gallery/7.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/7.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/7.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <!-- Duplicated for seamless loop -->
              <img src="/gallery/7.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/7.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/7.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/5.jpg" class="h-[230px] w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
          </div>
      </div>
      </div>
  </div>

  <!-- Dashboard Preview -->
	<div 
		bind:this={sectionRef}
		onmousemove={handleMouseMove}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		class="self-center mt-20 sm:mt-28 max-w-4xl w-full relative z-10 group" 
		class:animate-float-in={mounted}
	>
		<!-- Magnetic ambient glow (Spotlight aura) -->
		<div class="absolute -inset-10 transition-opacity duration-300 pointer-events-none blur-3xl rounded-3xl"
			style="background: radial-gradient(400px circle at {mouseX}px {mouseY}px, rgba(56, 189, 248, 0.15), transparent 60%); opacity: {isHovering ? 1 : 0};"
		></div>

		<!-- Magnetic glowing border effect -->
		<div class="absolute -inset-[1px] rounded-2xl transition-opacity duration-300 pointer-events-none"
			style="background: radial-gradient(800px circle at {mouseX}px {mouseY}px, rgba(56, 189, 248, 0.5), transparent 40%); opacity: {isHovering ? 1 : 0};"
		></div>

		<!-- Static subtle background border fallback -->
		<div class="absolute -inset-[1px] bg-gradient-to-br from-zinc-200/50 to-zinc-100/10 dark:from-white/10 dark:to-transparent rounded-2xl opacity-80 blur-[1px] group-hover:opacity-30 transition-opacity duration-500"></div>
		
		<div class="relative bg-white dark:bg-[#0a0a0c] rounded-xl border border-zinc-200/50 dark:border-white/[0.05] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden backdrop-blur-xl">
			<!-- Window chrome -->
			<div class="h-12 bg-white/50 dark:bg-[#121214]/50 border-b border-zinc-100 dark:border-white/[0.04] flex items-center justify-between px-5 backdrop-blur-md">
				<div class="flex gap-2">
					<div class="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700/80"></div>
					<div class="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700/80"></div>
					<div class="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700/80"></div>
				</div>
				<div class="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono tracking-widest flex items-center gap-2 uppercase">
					<Activity size={12} class="text-blue-500" />
					<span>Sonar — Admin Dashboard</span>
				</div>
				<div class="w-14"></div>
			</div>
			<!-- Body -->
			<div class="h-[340px] sm:h-[400px] flex bg-white/80 dark:bg-[#0a0a0c]/80">
				<!-- Sidebar -->
				<div class="w-56 border-r border-zinc-100 dark:border-white/[0.04] p-4 space-y-1.5 hidden sm:block">
					<div class="flex items-center gap-3 text-[14px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 rounded-lg transition-colors cursor-pointer">
						<Activity size={16} /> <span>Admin Panel</span>
					</div>
					<div class="flex items-center gap-3 text-[14px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.02] px-3 py-2.5 rounded-lg transition-colors cursor-pointer">
						<Users size={16} /> <span>Collaboration</span>
					</div>
					<div class="flex items-center gap-3 text-[14px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.02] px-3 py-2.5 rounded-lg transition-colors cursor-pointer">
						<FileBox size={16} /> <span>Workspace</span>
					</div>
					<div class="flex items-center gap-3 text-[14px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.02] px-3 py-2.5 rounded-lg transition-colors cursor-pointer">
						<Monitor size={16} /> <span>Preview</span>
					</div>
					<div class="flex items-center gap-3 text-[14px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.02] px-3 py-2.5 rounded-lg transition-colors cursor-pointer">
						<Settings size={16} /> <span>Settings</span>
					</div>
				</div>
				<!-- Feed -->
				<div class="flex-1 p-6 sm:p-8 font-mono text-[13px] text-left overflow-hidden bg-white dark:bg-[#0a0a0c]">
					<div class="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100 dark:border-white/[0.04]">
						<div class="text-zinc-900 dark:text-zinc-100 font-bold tracking-tight font-sans text-base">Activity Feed</div>
						<div class="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md text-[11px] font-medium border border-emerald-100 dark:border-emerald-500/20 font-sans shadow-sm shadow-emerald-500/5">
							<span class="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse relative">
								<span class="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50"></span>
							</span>
							Recording
						</div>
					</div>
					<div class="space-y-4 text-zinc-600 dark:text-zinc-400/90 tracking-tight leading-relaxed">
						<div class="flex gap-4 items-center animate-feed-line" style="animation-delay:0.2s">
							<span class="text-zinc-400 dark:text-zinc-500/80 shrink-0">[10:42:01]</span> 
							<span class="text-zinc-800 dark:text-zinc-200 font-medium">user_2</span> 
							<span class="truncate">joined session <span class="text-blue-600 dark:text-blue-400 font-medium">'exam_A1'</span></span>
						</div>
						<div class="flex gap-4 items-center animate-feed-line" style="animation-delay:0.4s">
							<span class="text-zinc-400 dark:text-zinc-500/80 shrink-0">[10:42:15]</span> 
							<span class="text-zinc-800 dark:text-zinc-200 font-medium">user_2</span> 
							<span class="truncate">typing in <span class="text-blue-600 dark:text-blue-400 font-medium">src/main.ts</span></span>
						</div>
						<div class="flex gap-4 items-center text-amber-700 dark:text-amber-400 bg-[#fffbeb] dark:bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-500/20 -mx-3 animate-feed-line" style="animation-delay:0.6s">
							<span class="text-amber-500 dark:text-amber-500/70 shrink-0">[10:43:05]</span> 
							<span class="font-medium text-amber-800 dark:text-amber-300">user_4</span> 
							<span class="truncate">⚠ window defocus (3s)</span>
						</div>
						<div class="flex gap-4 items-center text-rose-700 dark:text-rose-400 bg-[#fff1f2] dark:bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-500/20 -mx-3 animate-feed-line" style="animation-delay:0.8s">
							<span class="text-rose-400 dark:text-rose-500/70 shrink-0">[10:44:12]</span> 
							<span class="font-medium text-rose-800 dark:text-rose-300">user_1</span> 
							<span class="truncate">🚨 unauthorized paste</span>
						</div>
						<div class="flex gap-4 items-center text-zinc-400 dark:text-zinc-500/80 animate-feed-line mt-6" style="animation-delay:1s">
							<span class="shrink-0">[10:45:00]</span> 
							<span class="truncate">Exporting log to PDF…</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Stats strip -->
<section class="relative py-12 border-y border-zinc-100 dark:border-white/[0.04] bg-zinc-50/50 dark:bg-white/[0.015]">
	<div class="container mx-auto px-6">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
			<div>
				<div class="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-1">100%</div>
				<div class="text-sm text-zinc-500 dark:text-zinc-400">Offline capable</div>
			</div>
			<div>
				<div class="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-1">Yjs</div>
				<div class="text-sm text-zinc-500 dark:text-zinc-400">CRDT sync engine</div>
			</div>
			<div>
				<div class="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-1">MIT</div>
				<div class="text-sm text-zinc-500 dark:text-zinc-400">Open source</div>
			</div>
			<div>
				<div class="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white mb-1">&lt;50ms</div>
				<div class="text-sm text-zinc-500 dark:text-zinc-400">Collab latency</div>
			</div>
		</div>
	</div>
</section>

<!-- Features Section -->
<section class="py-24 sm:py-32 relative">
	<div class="container mx-auto px-6">
		<div class="text-center mb-16">
			<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/[0.08] text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-100 dark:border-blue-500/[0.15]">
				<Zap size={12} />
				Features
			</div>
			<h2 class="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight mb-4">Everything you need for secure coding</h2>
			<p class="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg max-w-xl mx-auto">A comprehensive toolkit built from the ground up for monitored exam sessions and collaborative development.</p>
		</div>
		
		<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
			<!-- Card 1 -->
			<div class="group relative p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] hover:border-blue-200 dark:hover:border-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/[0.04]">
				<div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
					<ShieldAlert size={20} strokeWidth={1.8} />
				</div>
				<h3 class="text-base font-semibold mb-2 text-zinc-900 dark:text-white">Activity Monitoring</h3>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
					Tracks keystrokes, focus changes, and clipboard events. Auto-generates PDF reports.
				</p>
			</div>
			
			<!-- Card 2 -->
			<div class="group relative p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] hover:border-blue-200 dark:hover:border-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/[0.04]">
				<div class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform">
					<Users size={20} strokeWidth={1.8} />
				</div>
				<h3 class="text-base font-semibold mb-2 text-zinc-900 dark:text-white">Yjs Collaboration</h3>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
					Google Docs-style live editing with shared cursors and conflict-free data types.
				</p>
			</div>
			
			<!-- Card 3 -->
			<div class="group relative p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] hover:border-cyan-200 dark:hover:border-cyan-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/[0.04]">
				<div class="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
					<Lock size={20} strokeWidth={1.8} />
				</div>
				<h3 class="text-base font-semibold mb-2 text-zinc-900 dark:text-white">Secured Preview</h3>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
					Integrated browser restricts traffic to <code class="text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-1 py-0.5 rounded text-xs">localhost</code> only.
				</p>
			</div>

			<!-- Card 4 -->
			<div class="group relative p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] hover:border-amber-200 dark:hover:border-amber-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/[0.04]">
				<div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform">
					<Code2 size={20} strokeWidth={1.8} />
				</div>
				<h3 class="text-base font-semibold mb-2 text-zinc-900 dark:text-white">Monaco Editor</h3>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
					VS Code's editor engine with syntax highlighting, auto-complete, and formatting.
				</p>
			</div>

			<!-- Card 5 -->
			<div class="group relative p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06] hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.04]">
				<div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
					<FileBox size={20} strokeWidth={1.8} />
				</div>
				<h3 class="text-base font-semibold mb-2 text-zinc-900 dark:text-white">Key Shield Storage</h3>
				<p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
					Isolated local directories protected by Key Shield within the Electron process.
				</p>
			</div>

			<!-- Card 6 — CTA -->
			<a href="/docs" class="group relative p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-white dark:to-zinc-100 border border-transparent flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
				<div class="w-10 h-10 rounded-xl bg-white/10 dark:bg-black/5 flex items-center justify-center text-white dark:text-zinc-900 mb-4 group-hover:scale-110 transition-transform">
					<Terminal size={20} strokeWidth={1.8} />
				</div>
				<h3 class="text-base font-semibold text-white dark:text-zinc-900 mb-1">Explore Architecture</h3>
				<span class="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
					View docs <ArrowRight size={11} class="group-hover:translate-x-0.5 transition-transform" />
				</span>
			</a>
		</div>
	</div>
</section>

<!-- Bottom CTA -->
<section class="py-20 sm:py-24 relative overflow-hidden">
	<div class="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.02] to-transparent dark:via-blue-500/[0.04]"></div>
	<div class="container mx-auto px-6 text-center relative z-10">
		<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/[0.08] text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-5 border border-blue-100 dark:border-blue-500/[0.15]">
			<Monitor size={12} />
			Get Started
		</div>
		<h2 class="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight mb-4">Ready to secure your coding sessions?</h2>
		<p class="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-8 text-base">Download Sonar IDE and set up supervised exams or collaborative workspaces in minutes.</p>
		<div class="flex flex-col sm:flex-row items-center justify-center gap-3">
			<a href="/download" class="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
				<Download size={15} />
				Download Now
			</a>
			<a href="https://github.com/rkvishwa/Sonar-Code-Editor" target="_blank" rel="noreferrer" class="w-full sm:w-auto px-6 py-2.5 bg-white/70 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 font-medium rounded-lg flex items-center justify-center gap-2 border border-zinc-200/80 dark:border-white/[0.08] text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-sm">
				Star on GitHub
				<ArrowRight size={14} class="opacity-50" />
			</a>
		</div>
	</div>
</section>

<style>
	

	/* --- Gradient text --- */
	@keyframes gradient-move {
		0%, 100% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
	}
	.animate-gradient {
		animation: gradient-move 5s ease infinite;
	}

	/* --- Hero stagger entrance --- */
	.animate-hero-in .hero-stagger-1,
	.animate-hero-in .hero-stagger-2,
	.animate-hero-in .hero-stagger-3,
	.animate-hero-in .hero-stagger-4,
	.animate-hero-in .hero-stagger-5 {
		animation: fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	.hero-stagger-1 { opacity: 0; }
	.hero-stagger-2 { opacity: 0; }
	.hero-stagger-3 { opacity: 0; }
	.hero-stagger-4 { opacity: 0; }
	.hero-stagger-5 { opacity: 0; }
	.animate-hero-in .hero-stagger-1 { animation-delay: 0.05s; }
	.animate-hero-in .hero-stagger-2 { animation-delay: 0.12s; }
	.animate-hero-in .hero-stagger-3 { animation-delay: 0.2s; }
	.animate-hero-in .hero-stagger-4 { animation-delay: 0.3s; }
	.animate-hero-in .hero-stagger-5 { animation-delay: 0.4s; }

	@keyframes fade-up {
		from { opacity: 0; transform: translateY(16px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* --- Dashboard float in --- */
	.animate-float-in {
		animation: float-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
	}
	@keyframes float-in {
		from { opacity: 0; transform: translateY(30px) scale(0.98); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	/* --- Feed line entrance --- */
	.animate-feed-line {
		animation: feed-slide 0.5s ease both;
	}
	@keyframes feed-slide {
		from { opacity: 0; transform: translateX(-8px); }
		to { opacity: 1; transform: translateX(0); }
	}
        /* --- Shake button --- */
        @keyframes shake {
                0%, 100% { transform: translate(0, -2px); }
                15% { transform: translate(-4px, -2px); }
                30% { transform: translate(4px, -2px); }
                45% { transform: translate(-3px, -2px); }
                60% { transform: translate(3px, -2px); }
                75% { transform: translate(-2px, -2px); }
                90% { transform: translate(2px, -2px); }
        }
        .shake-btn:hover {
                animation: shake 0.4s ease;
        }
@keyframes marqueeRight {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0%); }
}
.animate-marquee-right-fast {
  animation: marqueeRight 35s linear infinite;
}
.animate-marquee-right-slow {
  animation: marqueeRight 45s linear infinite;
}
</style>








