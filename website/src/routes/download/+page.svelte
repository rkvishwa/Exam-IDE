<script lang="ts">
  import { onMount } from "svelte";
  import {
    Download,
    Monitor,
    ShieldAlert,
    WifiOff,
    Link2,
    Copy,
    Check,
    Terminal,
  } from "lucide-svelte";

  type ClientOS = "windows" | "mac" | "other";

  let clientOS = $state<ClientOS>("other");
  let linkCopied = $state(false);
  let updateLinkCopied = $state(false);
  const macDownloadLink =
    "https://github.com/rkvishwa/Sonar-Code-Editor/releases/latest";

  function copyMacLink() {
    navigator.clipboard.writeText(macDownloadLink).then(() => {
      linkCopied = true;
      setTimeout(() => {
        linkCopied = false;
      }, 2000);
    });
  }

  function copyUpdateLink() {
    navigator.clipboard.writeText(macDownloadLink).then(() => {
      updateLinkCopied = true;
      setTimeout(() => {
        updateLinkCopied = false;
      }, 2000);
    });
  }

  onMount(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("windows")) {
      clientOS = "windows";
    } else if (ua.includes("macintosh") || ua.includes("mac os x")) {
      clientOS = "mac";
    } else {
      clientOS = "other";
    }
  });
</script>

<svelte:head>
  <title>Download | Sonar IDE</title>
</svelte:head>

<div
  class="px-6 py-20 lg:py-32 max-w-4xl mx-auto w-full text-center transition-colors duration-200"
>
  <div
    class="w-20 h-20 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/20"
  >
    <Download size={40} />
  </div>

  <h1
    class="text-4xl sm:text-6xl font-extrabold mb-6 tracking-tight text-zinc-900 dark:text-white"
  >
    Get Sonar IDE
  </h1>
  <p class="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-12">
    Download the official client to join supervised exam environments or start
    collaborating securely.
  </p>

  <div
    class="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl p-8 sm:p-12 mb-16 shadow-sm dark:shadow-none transition-colors duration-200"
  >
    <div class="flex flex-col items-center justify-center gap-4 mb-12">
      {#if clientOS === "mac"}
        <div
          class="w-full max-w-2xl rounded-2xl border border-cyan-300/40 dark:border-cyan-400/30 bg-white/70 dark:bg-white/[0.05] p-4 sm:p-5"
        >
          <label
            for="download-mac-link"
            class="mb-2 text-xs uppercase tracking-[0.15em] font-semibold text-cyan-700 dark:text-cyan-300 inline-flex items-center gap-2"
          >
            <Link2 size={12} />
            <span>macOS Download Link</span>
          </label>
          <div
            class="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-1.5 backdrop-blur-md flex items-center shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-white/20"
          >
            <div class="flex items-center flex-1 min-w-0 pl-3">
              <Terminal size={14} class="text-zinc-400 mr-2 shrink-0" />
              <input
                id="download-mac-link"
                type="text"
                value={macDownloadLink}
                readonly
                onclick={(event) =>
                  (event.currentTarget as HTMLInputElement).select()}
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
          <p class="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Paste this link on your terminal.
          </p>
          <div class="mt-5 w-full">
            <label
              for="mac-update-link"
              class="mb-2 text-xs text-zinc-500 dark:text-zinc-400 block font-medium"
              >Already installed an older version? <span
                class="text-cyan-600 dark:text-cyan-400">Update here:</span
              ></label
            >
            <div
              class="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-1.5 backdrop-blur-md flex items-center shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-white/20"
            >
              <div class="flex items-center flex-1 min-w-0 pl-3">
                <Terminal size={14} class="text-zinc-400 mr-2 shrink-0" />
                <input
                  id="mac-update-link"
                  type="text"
                  value={macDownloadLink}
                  readonly
                  onclick={(event) =>
                    (event.currentTarget as HTMLInputElement).select()}
                  class="bg-transparent text-sm font-mono text-zinc-700 dark:text-zinc-300 w-full outline-none truncate cursor-copy selection:bg-cyan-500/20"
                />
              </div>
              <button
                onclick={copyUpdateLink}
                aria-label="Copy update link"
                class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all
                  {updateLinkCopied
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400'}"
              >
                {#if updateLinkCopied}
                  <Check size={14} />
                {:else}
                  <Copy size={14} />
                {/if}
              </button>
            </div>
          </div>
        </div>
      {:else}
        <button
          class="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-3 transition-all hover:scale-105 active:scale-95"
        >
          <Monitor size={24} />
          <div class="text-left font-sans">
            <div class="text-sm font-medium opacity-80 leading-none mb-1">
              Download for
            </div>
            <div class="text-xl leading-none">Windows</div>
          </div>
        </button>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
          Allow permission in your browser to download the file.
        </p>
        <div class="mt-5 w-full max-w-sm mx-auto sm:mx-0">
          <label
            for="win-update-link"
            class="mb-2 text-xs text-zinc-500 dark:text-zinc-400 block font-medium"
            >Already installed an older version? <span
              class="text-blue-600 dark:text-blue-400">Update here:</span
            ></label
          >
          <div
            class="rounded-xl border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] p-1.5 backdrop-blur-md flex items-center shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-white/20"
          >
            <div class="flex items-center flex-1 min-w-0 pl-3">
              <Terminal size={14} class="text-zinc-400 mr-2 shrink-0" />
              <input
                id="win-update-link"
                type="text"
                value={macDownloadLink}
                readonly
                onclick={(event) =>
                  (event.currentTarget as HTMLInputElement).select()}
                class="bg-transparent text-sm font-mono text-zinc-700 dark:text-zinc-300 w-full outline-none truncate cursor-copy selection:bg-cyan-500/20"
              />
            </div>
            <button
              onclick={copyUpdateLink}
              aria-label="Copy update link"
              class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all
                {updateLinkCopied
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400'}"
            >
              {#if updateLinkCopied}
                <Check size={14} />
              {:else}
                <Copy size={14} />
              {/if}
            </button>
          </div>
        </div>
      {/if}
    </div>

    <div
      class="grid sm:grid-cols-2 gap-6 text-left border-t border-zinc-100 dark:border-white/5 pt-10"
    >
      <div class="flex items-start space-x-4">
        <div
          class="w-10 h-10 rounded-lg bg-red-100 dark:bg-rose-500/10 flex items-center justify-center text-red-600 dark:text-rose-400 shrink-0"
        >
          <ShieldAlert size={20} />
        </div>
        <div>
          <h3 class="font-bold text-zinc-900 dark:text-white mb-1">
            Admin Privileges Required
          </h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Sonar needs elevated access to reliably capture operating system
            window focus telemetry.
          </p>
        </div>
      </div>
      <div class="flex items-start space-x-4">
        <div
          class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0"
        >
          <WifiOff size={20} />
        </div>
        <div>
          <h3 class="font-bold text-zinc-900 dark:text-white mb-1">
            Firewall Whitelisting
          </h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Ensure Appwrite WebSocket connections are permitted through your
            school's network firewall.
          </p>
        </div>
      </div>
    </div>
  </div>

  <p class="text-zinc-500 dark:text-zinc-500 text-sm">
    Currently tracking version: <span
      class="font-mono text-zinc-900 dark:text-white">v1.2.0</span
    > • By downloading, you agree to the Academic Data Policy.
  </p>
</div>
