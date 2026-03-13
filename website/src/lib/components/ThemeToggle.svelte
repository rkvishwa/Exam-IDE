<script lang="ts">
  import { Sun, Moon, Monitor } from 'lucide-svelte';
  import { onMount } from 'svelte';

  type ThemeMode = 'light' | 'dark' | 'system';

  let currentTheme = $state<ThemeMode>('system');
  let isOpen = $state(false);

  function applyTheme(theme: ThemeMode) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      localStorage.removeItem('theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  function updateTheme(theme: ThemeMode) {
    currentTheme = theme;
    applyTheme(theme);
    isOpen = false;
  }

  function toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    isOpen = !isOpen;
  }

  onMount(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (localStorage.theme === 'dark' || localStorage.theme === 'light') {
      currentTheme = localStorage.theme;
    } else {
      currentTheme = 'system';
    }

    applyTheme(currentTheme);

    const onSystemThemeChange = (event: MediaQueryListEvent) => {
      if (currentTheme === 'system') {
        if (event.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.theme-toggle-container')) {
        isOpen = false;
      }
    };

    mediaQuery.addEventListener('change', onSystemThemeChange);
    document.addEventListener('click', onDocumentClick);

    return () => {
      mediaQuery.removeEventListener('change', onSystemThemeChange);
      document.removeEventListener('click', onDocumentClick);
    };
  });
</script>

<div class="relative theme-toggle-container">
  <button 
    type="button"
    onclick={toggleMenu}
    class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/70 dark:border-cyan-400/25 bg-white/75 dark:bg-cyan-500/10 text-zinc-600 hover:text-cyan-700 dark:text-zinc-300 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/15 transition-colors"
    aria-label="Toggle theme"
    aria-expanded={isOpen ? 'true' : 'false'}
  >
    {#if currentTheme === 'light'}
      <Sun size={20} />
    {:else if currentTheme === 'dark'}
      <Moon size={20} />
    {:else}
      <Monitor size={20} />
    {/if}
  </button>

  {#if isOpen}
    <div class="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-cyan-200/80 dark:border-cyan-400/20 bg-white/95 dark:bg-[#0d1a2b]/96 p-1 shadow-xl shadow-cyan-900/15 backdrop-blur-xl">
      <button 
        type="button"
        class="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-left text-sm transition-colors {currentTheme === 'light' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 font-medium' : 'text-zinc-600 dark:text-zinc-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-300'}"
        onclick={() => updateTheme('light')}
      >
        <Sun size={16} />
        <span>Light</span>
      </button>
      <button 
        type="button"
        class="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-left text-sm transition-colors {currentTheme === 'dark' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 font-medium' : 'text-zinc-600 dark:text-zinc-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-300'}"
        onclick={() => updateTheme('dark')}
      >
        <Moon size={16} />
        <span>Dark</span>
      </button>
      <button 
        type="button"
        class="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-left text-sm transition-colors {currentTheme === 'system' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 font-medium' : 'text-zinc-600 dark:text-zinc-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-300'}"
        onclick={() => updateTheme('system')}
      >
        <Monitor size={16} />
        <span>System</span>
      </button>
    </div>
  {/if}
</div>
