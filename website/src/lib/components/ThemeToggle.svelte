<script lang="ts">
  import { Sun, Moon } from "lucide-svelte";
  import { onMount } from "svelte";

  type ThemeMode = "light" | "dark";

  let currentTheme = $state<ThemeMode>("dark");

  function applyTheme(theme: ThemeMode) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.theme = theme;
  }

  function toggleTheme() {
    currentTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(currentTheme);
  }

  onMount(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // If no preference stored, read system theme. Otherwise use stored.
    if (localStorage.theme === "light" || localStorage.theme === "dark") {
      currentTheme = localStorage.theme;
    } else {
      currentTheme = mediaQuery.matches ? "dark" : "light";
    }

    applyTheme(currentTheme);
  });
</script>

<button
  type="button"
  onclick={toggleTheme}
  class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/70 dark:border-cyan-400/25 bg-white/75 dark:bg-cyan-500/10 text-zinc-600 hover:text-cyan-700 dark:text-zinc-300 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/15 transition-colors cursor-pointer"
  aria-label="Toggle theme"
>
  {#if currentTheme === "light"}
    <Moon size={20} />
  {:else}
    <Sun size={20} />
  {/if}
</button>
