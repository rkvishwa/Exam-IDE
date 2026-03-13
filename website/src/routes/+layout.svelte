<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { Github, Activity, Download } from 'lucide-svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	let { children } = $props();

	// Computed for active navigation
	const isActive = (path: string) => page.url.pathname === path || page.url.pathname.startsWith(`${path}/`);
</script>

<div class="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500/30 transition-colors duration-200">
	<header class="fixed top-0 z-[100] w-full border-b border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0f]/70 backdrop-blur-[12px]">
		<div class="container mx-auto px-6 h-16 flex items-center justify-between">
			<a href="/" class="flex items-center space-x-3 text-xl font-bold">
				<img src="/favicon.png" alt="Sonar Code Editor Icon" class="w-7 h-7 drop-shadow-sm" />
				<span class="text-zinc-900 dark:text-white">Sonar IDE</span>
			</a>
			
			<nav class="hidden md:flex items-center space-x-8 text-sm font-medium">
				<a href="/docs" class="transition-colors {isActive('/docs') ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}">Documentation</a>
				<a href="/developer" class="transition-colors {isActive('/developer') ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}">Architecture</a>
				<a href="/about" class="transition-colors {isActive('/about') ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}">About</a>
			</nav>

			<div class="flex items-center space-x-3 sm:space-x-5">
				<ThemeToggle />
				<div class="w-px h-5 bg-zinc-200 dark:bg-white/10 hidden sm:block"></div>
				<a 
					href="https://github.com/rkvishwa/Sonar-Code-Editor" 
					target="_blank" 
					rel="noreferrer"
					class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
					aria-label="GitHub Repository"
				>
					<Github size={20} />
				</a>
				<a 
					href="/download" 
					class="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-medium shadow-md shadow-blue-500/20 transition-all flex items-center space-x-2"
				>
					<Download size={16} />
					<span class="hidden sm:inline">Download</span>
				</a>
			</div>
		</div>
	</header>

	<main class="flex-1 flex flex-col">
		{@render children()}
	</main>

	<footer class="border-t border-zinc-200 dark:border-white/5 mt-auto py-12 bg-zinc-50 dark:bg-[#121214] text-zinc-500 dark:text-zinc-400 transition-colors duration-200">
		<div class="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm">
			<div class="flex items-center space-x-2 mb-6 md:mb-0">
				<img src="/favicon.png" alt="Sonar Icon" class="w-5 h-5 opacity-70 grayscale dark:grayscale-0" />
				<span class="font-medium text-zinc-700 dark:text-zinc-300">Sonar Code Editor</span>
			</div>
			
			<div class="flex space-x-8">
				<a href="/docs" class="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Documentation</a>
				<a href="/developer" class="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Architecture</a>
				<a href="/about#contact-us" class="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Contact Us</a>
				<a href="https://github.com/rkvishwa/Sonar-Code-Editor" target="_blank" rel="noreferrer" class="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">GitHub</a>
			</div>
			
			<div class="mt-6 md:mt-0">
				&copy; {new Date().getFullYear()} Sonar Project. MIT Licensed.
			</div>
		</div>
	</footer>
</div>

