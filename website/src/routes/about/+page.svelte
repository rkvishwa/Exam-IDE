<script lang="ts">
  import { onMount } from 'svelte';
  import { Github, Users, ShieldCheck, Globe } from 'lucide-svelte';

  interface Contributor {
    login: string;
    avatar_url: string;
    html_url: string;
    contributions: number;
    id: number;
  }

  let contributors = $state<Contributor[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      const res = await fetch('https://api.github.com/repos/rkvishwa/Sonar-Code-Editor/contributors');
      if (res.ok) {
        contributors = await res.json();
      }
    } catch (err) {
      console.error('Failed to load contributors', err);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>About | Sonar IDE</title>
</svelte:head>

<div class="px-6 pt-10 pb-20 lg:pt-16 lg:pb-24 max-w-5xl mx-auto w-full transition-colors duration-200">
  <div class="text-center mb-24">
    <div class="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-8">
      <ShieldCheck size={32} />
    </div>
    <h1 class="text-4xl sm:text-5xl font-extrabold mb-6 tracking-tight text-zinc-900 dark:text-white">Built for Integrity</h1>
    <p class="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
      Sonar Code Editor was developed to bridge the gap between powerful modern code editing and strict academic/professional integrity. It provides a reliable supervised environment without sacrificing the developer experience.
    </p>
  </div>

  <section class="mb-20 relative overflow-hidden rounded-3xl bg-zinc-900 dark:bg-black text-white p-8 sm:p-12 shadow-2xl border border-zinc-800 dark:border-white/10 transition-colors duration-200">
    <div class="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
    
    <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
      <div class="flex-1">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-semibold tracking-wider uppercase mb-4 outline outline-1 outline-white/10">
          <span>The Community</span>
        </div>
        <h2 class="text-3xl sm:text-4xl font-extrabold mb-4">Crafted by <span class="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400">knurdz</span></h2>
        <p class="text-zinc-400 max-w-lg mb-6 leading-relaxed mx-auto md:mx-0">
          Sonar IDE is proudly developed and maintained by the <strong>knurdz</strong> community. This project is completely open-source, and we welcome contributions from developers worldwide to help build the future of education and coding.
        </p>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
        <a href="https://knurdz.org/" target="_blank" rel="noreferrer" class="flex items-center justify-center space-x-2 px-6 py-3.5 bg-white text-zinc-900 hover:bg-zinc-100 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
          <Globe size={20} />
          <span>knurdz.org</span>
        </a>
        <a href="https://github.com/knurdz" target="_blank" rel="noreferrer" class="flex items-center justify-center space-x-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl outline outline-1 outline-white/20 transition-all hover:scale-105 active:scale-95">
          <Github size={20} />
          <span>GitHub Org</span>
        </a>
      </div>
    </div>
  </section>

  <section class="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-3xl p-8 sm:p-12 mb-20 transition-colors duration-200">
    <div class="flex items-center space-x-3 mb-8">
      <Users size={28} class="text-blue-600 dark:text-blue-400" />
      <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Project Contributors</h2>
    </div>

    {#if loading}
      <div class="flex justify-center py-20">
        <div class="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    {:else if contributors.length > 0}
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
        {#each contributors as contributor (contributor.id)}
          <a
            href={contributor.html_url}
            target="_blank"
            rel="noreferrer"
            class="flex flex-col items-center group p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/5 transition"
          >
            <div class="w-20 h-20 rounded-full overflow-hidden mb-4 ring-2 ring-zinc-200 dark:ring-white/10 group-hover:ring-blue-500 transition-all">
              <img src={contributor.avatar_url} alt={contributor.login} class="w-full h-full object-cover" />
            </div>
            <span class="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{contributor.login}</span>
            <span class="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{contributor.contributions} commits</span>
          </a>
        {/each}
      </div>
    {:else}
      <div class="text-center py-12 text-zinc-500">
        <p>Could not load contributors at this time.</p>
        <a href="https://github.com/rkvishwa/Sonar-Code-Editor" class="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-4">
          <Github size={16} />
          <span>View on GitHub</span>
        </a>
      </div>
    {/if}
  </section>

  <div class="text-center bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-600/10 dark:to-cyan-600/10 rounded-3xl p-10 border border-blue-200 dark:border-blue-500/20 transition-colors duration-200">
    <h2 class="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">Join the Mission</h2>
    <p class="text-zinc-600 dark:text-zinc-400 mb-8 max-w-xl mx-auto">
      Help us improve Sonar Code Editor by actively suggesting features, improving logging, or building better IDE tools.
    </p>
    <div class="flex flex-col sm:flex-row justify-center gap-4">
      <a href="/contact" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors inline-block shadow-lg shadow-blue-500/20">
        Contact Us
      </a>
      <a href="https://github.com/rkvishwa/Sonar-Code-Editor/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" class="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-[#0B0F19] hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold rounded-lg transition-colors inline-block shadow-lg">
        Contribution Guidelines
      </a>
    </div>
  </div>
</div>
