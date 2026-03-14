<script lang="ts">
  import { onMount } from "svelte";
  import { Monitor, AlertCircle, FileDown } from "lucide-svelte";

  // Fallback direct download link (in case GitHub API fails)
  let manualFallbackLink =
    "https://github.com/rkvishwa/Sonar-Code-Editor/releases/download/v1.0.0-beta.4/Sonar.Code.Editor.Setup.1.0.0-beta.4.exe";
  let status = $state("Preparing download...");
  let error = $state(false);

  onMount(async () => {
    try {
      const response = await fetch(
        "https://api.github.com/repos/rkvishwa/Sonar-Code-Editor/releases/latest"
      );
      if (response.ok) {
        const data = await response.json();
        const exeAsset = data.assets.find((asset: any) =>
          asset.name.endsWith(".exe")
        );

        if (exeAsset && exeAsset.browser_download_url) {
          status = "Redirecting to latest release...";
          window.location.href = exeAsset.browser_download_url;
          return;
        }
      }

      // Fallback
      status = "Starting download...";
      window.location.href = manualFallbackLink;
    } catch (e) {
      console.error(e);
      error = true;
      status = "Attempting fallback download...";
      window.location.href = manualFallbackLink;
    }
  });
</script>

<svelte:head>
  <title>Download for Windows | Sonar IDE</title>
</svelte:head>

<div
  class="px-6 py-20 lg:py-32 max-w-4xl mx-auto w-full text-center transition-colors duration-200"
>
  <div
    class="w-20 h-20 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/20"
  >
    <Monitor size={40} />
  </div>

  <h1
    class="text-4xl sm:text-5xl font-extrabold mb-6 tracking-tight text-zinc-900 dark:text-white"
  >
    Downloading for Windows
  </h1>

  <div
    class="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl p-8 sm:p-12 mt-12 shadow-sm dark:shadow-none transition-colors duration-200 max-w-xl mx-auto"
  >
    <div class="flex flex-col items-center justify-center gap-6">
      {#if error}
        <div class="flex items-center gap-3 text-red-500 bg-red-500/10 px-5 py-3 rounded-xl font-medium">
          <AlertCircle size={20} />
          <span>Could not fetch latest release. Proceeding with fallback.</span>
        </div>
      {:else}
        <div
          class="animate-spin rounded-full h-12 w-12 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-blue-600 dark:border-t-blue-400"
        ></div>
      {/if}

      <div class="space-y-2">
        <p class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {status}
        </p>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          Your download should begin automatically.
        </p>
      </div>

      <div class="w-full h-[1px] bg-zinc-100 dark:bg-white/5 my-4"></div>

      <div class="text-sm text-zinc-600 dark:text-zinc-400">
        <p class="mb-3">If the download doesn't start,</p>
        <a
          href={manualFallbackLink}
          class="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-900 dark:text-white font-medium rounded-xl transition-all"
        >
          <FileDown size={16} />
          <span>Download Manually</span>
        </a>
      </div>
    </div>
  </div>
</div>
