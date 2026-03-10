const fs = require('fs');
const p = 'c:/Users/User/Documents/Projects/Sonar-Code-Editor/website/src/routes/+page.svelte';
let s = fs.readFileSync(p, 'utf8');

const regex = /<!-- Hero Section -->([\s\S]*?)<!-- Dashboard Preview -->/;
let newHtml = \<!-- Hero Section -->
<section class="relative flex flex-col items-start justify-center px-4 sm:px-8 lg:px-[10%] pt-28 sm:pt-36 xl:pt-44 pb-20 overflow-hidden min-h-screen bg-[#050508]">

<!-- Radial fade mask for top/sides -->
<div class="absolute inset-0 z-0 pointer-events-none" style="background: radial-gradient(circle at top, transparent 20%, #050508 80%);"></div>

<!-- Meteor Shower Canvas -->
<div class="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden" style="mask-image: linear-gradient(to right, transparent 0%, transparent 40%, black 60%);">
<canvas bind:this={canvas} class="w-full h-full"></canvas>
</div>

<!-- Hero Two-Column Layout -->
<div class="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-start text-left">

<!-- Left Column Component -->
<div class="flex flex-col items-start w-full lg:w-1/2" class:animate-hero-in={mounted}>

<!-- NEW Announcement Badge -->
<div class="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#050508] border border-cyan-500/30 text-zinc-300 text-[12px] font-medium mb-8 hero-stagger-1 shadow-[0_0_10px_rgba(0,212,255,0.1)]">
<span class="text-cyan-400">? New</span> <span class="opacity-50">|</span> <span>Now with real-time supervision &rarr;</span>
</div>

<!-- Logo mark -->
<div class="mb-6 hero-stagger-2">
<div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 flex items-center justify-center shadow-xl shadow-blue-500/20 dark:shadow-blue-400/20">
<img src="/favicon.png" alt="Sonar Icon" class="w-10 h-10 sm:w-12 sm:h-12 brightness-0 invert" />
</div>
</div>

<!-- Heading -->
<h1 class="text-[clamp(3rem,6vw,5rem)] font-bold tracking-tight leading-[1.1] text-white mb-5 hero-stagger-3">
The IDE built for<br/>
<span class="relative whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-400 animate-gradient bg-[length:200%_auto]">
supervision<span class="animate-pulse text-cyan-400 inline-block -ml-1">_</span>
</span>
</h1>

<!-- Subtitle -->
<p class="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-[520px] mb-10 leading-relaxed hero-stagger-4">
Real-time collaboration, exam monitoring, and secure coding ? powered by Monaco and Electron.
</p>

<!-- CTA buttons -->
<div class="flex flex-col sm:flex-row items-center justify-start gap-4 hero-stagger-5 w-full">
<a href="/download" class="shake-btn group w-full sm:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-lg shadow-lg shadow-zinc-900/10 dark:shadow-white/10 flex items-center justify-center gap-2 text-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
<Download size={15} />
<span>Download for Windows</span>
</a>
<a href="/download-mac" class="shake-btn group w-full sm:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-lg shadow-lg shadow-zinc-900/10 dark:shadow-white/10 flex items-center justify-center gap-2 text-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
<Download size={15} />
<span>Download for Mac</span>
</a>
<a href="/docs" class="shake-btn group w-full sm:w-auto px-6 py-2.5 bg-white/70 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.1] backdrop-blur-md text-zinc-700 dark:text-zinc-300 font-medium rounded-lg flex items-center justify-center gap-2 border border-zinc-200/80 dark:border-white/[0.08] text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-sm">
<span>Read Docs</span>
<ArrowRight size={14} class="opacity-50 group-hover:translate-x-0.5 transition-transform" />
</a>
</div>
</div>

<!-- Right Column -->
<div class="hidden lg:block w-1/2"></div>
</div>

<!-- Dashboard Preview -->\n\t\;

s = s.replace(regex, newHtml);

// Fix up the ending of the section if necessary
let dashboardRegex = /<!-- Dashboard Preview -->([\s\S]*?)<\/section>/;
let ms = s.match(dashboardRegex);
if(ms) {
    let dashboardBlock = ms[1];
    
    // We want the Dashboard Preview to be pushed down since it is inside the same section
    // Actually, currently it's \<div class="mt-20 sm:mt-28 max-w-4xl w-full relative z-10"\ so it aligns nicely below. Let's make sure it's centered
    // We already changed the section to \items-start\, so we should add \self-center\ to this dashboard block to keep it centered!
    let updatedDbBlock = dashboardBlock.replace('w-full relative z-10', 'w-full relative z-10 self-center');
    s = s.replace(dashboardBlock, updatedDbBlock);
}

fs.writeFileSync(p, s);
console.log("Updated HTML!");
