<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { Github, Download, Home, Menu, X, Zap } from "lucide-svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  let { children } = $props();

  // Computed for active navigation
  const isActive = (path: string) =>
    page.url.pathname === path ||
    (path !== "/" && page.url.pathname.startsWith(`${path}/`));
  const navLinkClass = (path: string) =>
    isActive(path)
      ? "text-cyan-700 dark:text-cyan-200 cursor-pointer"
      : "text-zinc-700 dark:text-zinc-100/82 hover:text-cyan-700 dark:hover:text-cyan-200 cursor-pointer";

  let isMobileMenuOpen = $state(false);

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  // Close menu on navigation
  $effect(() => {
    page.url.pathname;
    isMobileMenuOpen = false;
  });
</script>

<div
  class="relative isolate min-h-screen flex flex-col overflow-x-clip bg-[#f7fbff] dark:bg-[#071018] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-cyan-400/20 transition-colors duration-200"
>
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%)]"
    ></div>
    <div
      class="absolute inset-0 opacity-85 dark:opacity-60 bg-[linear-gradient(rgba(71,85,105,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(71,85,105,0.16)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-size-[3rem_3rem] mask-[radial-gradient(circle_at_center,black_58%,transparent_95%)]"
    ></div>
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.62),transparent_62%)] dark:bg-[radial-gradient(circle_at_top,rgba(8,16,25,0.28),transparent_58%)]"
    ></div>
  </div>

  <header class="fixed top-0 z-100 w-full px-4 pt-3 sm:px-6">
    <div
      class="header-shell relative mx-auto w-full max-w-300 rounded-2xl border border-cyan-400/30 dark:border-cyan-400/20 bg-[#e9f3ff]/78 dark:bg-[#040a16]/94 shadow-[0_18px_46px_-24px_rgba(3,40,58,0.45)] dark:shadow-[0_18px_46px_-24px_rgba(2,12,27,0.9)] backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-200"
    >
      <div class="relative flex h-16 items-center justify-between px-4 sm:px-6">
        <a href="/" class="flex items-center space-x-3 text-xl font-bold">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 dark:border-cyan-300/35 bg-white/78 dark:bg-cyan-500/12 shadow-sm"
          >
            <img
              src="/favicon.png"
              alt="Sonar Code Editor Icon"
              class="h-6 w-6 drop-shadow-sm"
            />
          </div>
          <span
            class="bg-linear-to-r from-cyan-700 via-sky-700 to-blue-700 bg-clip-text text-transparent dark:from-cyan-100 dark:via-sky-200 dark:to-blue-200"
            >Sonar IDE</span
          >
        </a>

        <nav class="hidden md:flex items-center gap-6 text-sm font-semibold">
          <a
            href="/"
            class={`relative pb-1 transition-colors ${navLinkClass("/")}`}
          >
            Home
            <span
              class={`absolute left-0 -bottom-1 h-0.5 rounded-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all ${isActive("/") ? "w-full opacity-100" : "w-0 opacity-0"}`}
            ></span>
          </a>
          <a
            href="/docs"
            class={`relative pb-1 transition-colors ${navLinkClass("/docs")}`}
          >
            Documentation
            <span
              class={`absolute left-0 -bottom-1 h-0.5 rounded-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all ${isActive("/docs") ? "w-full opacity-100" : "w-0 opacity-0"}`}
            ></span>
          </a>
          <a
            href="/about"
            class={`relative pb-1 transition-colors ${navLinkClass("/about")}`}
          >
            About
            <span
              class={`absolute left-0 -bottom-1 h-0.5 rounded-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all ${isActive("/about") ? "w-full opacity-100" : "w-0 opacity-0"}`}
            ></span>
          </a>
          <a
            href="/contact"
            class={`relative pb-1 transition-colors ${navLinkClass("/contact")}`}
          >
            Contact
            <span
              class={`absolute left-0 -bottom-1 h-0.5 rounded-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all ${isActive("/contact") ? "w-full opacity-100" : "w-0 opacity-0"}`}
            ></span>
          </a>
        </nav>

        <div class="flex items-center space-x-2 sm:space-x-3">
          <div class="hidden md:flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />
            <a
              href="https://github.com/rkvishwa/Sonar-Code-Editor"
              target="_blank"
              rel="noreferrer"
              class="rounded-xl border border-cyan-400/38 dark:border-cyan-300/35 bg-white/74 dark:bg-white/10 p-2 text-zinc-700 dark:text-zinc-100/85 hover:text-cyan-700 dark:hover:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors cursor-pointer"
              aria-label="GitHub Repository"
            >
              <Github size={18} />
            </a>
            <a
              href="/download"
              class="rounded-full bg-linear-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-400 hover:to-blue-500 cursor-pointer"
            >
              <span class="inline-flex items-center space-x-2">
                <Download size={16} />
                <span>Download</span>
              </span>
            </a>
          </div>
          <button
            onclick={toggleMobileMenu}
            class="md:hidden inline-flex items-center justify-center rounded-xl border border-cyan-400/38 dark:border-cyan-300/35 bg-white/74 dark:bg-cyan-500/12 p-2 text-cyan-700 dark:text-cyan-100 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors cursor-pointer"
            aria-label="Menu"
          >
            {#if isMobileMenuOpen}
              <X size={18} />
            {:else}
              <Menu size={18} />
            {/if}
          </button>
        </div>
      </div>

      {#if isMobileMenuOpen}
        <div class="md:hidden border-t border-cyan-400/20 px-4 py-4 space-y-4">
          <nav class="flex flex-col gap-3 font-semibold text-sm">
            <a href="/" class={navLinkClass("/")}>Home</a>
            <a href="/docs" class={navLinkClass("/docs")}>Documentation</a>
            <a href="/about" class={navLinkClass("/about")}>About</a>
            <a href="/contact" class={navLinkClass("/contact")}>Contact</a>
          </nav>
          <div class="flex items-center gap-3 pt-4 border-t border-cyan-400/20">
            <ThemeToggle />
            <a
              href="https://github.com/rkvishwa/Sonar-Code-Editor"
              target="_blank"
              rel="noreferrer"
              class="rounded-xl border border-cyan-400/38 dark:border-cyan-300/35 bg-white/74 dark:bg-white/10 p-2 text-zinc-700 dark:text-zinc-100/85 hover:text-cyan-700 dark:hover:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors flex-1 flex justify-center items-center cursor-pointer"
              aria-label="GitHub Repository"
            >
              <Github size={18} />
            </a>
            <a
              href="/download"
              class="rounded-full bg-linear-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-400 hover:to-blue-500 flex-1 flex justify-center items-center gap-2 cursor-pointer"
            >
              <Download size={16} />
              <span>Download</span>
            </a>
          </div>
        </div>
      {/if}
    </div>
  </header>

  <main class="relative z-10 flex-1 flex flex-col pt-12">
    {#key page.url.pathname}
      <div class="page-load-smooth">
        {@render children()}
      </div>
    {/key}
  </main>

  <footer
    class="relative z-10 mt-auto border-t border-zinc-200/70 dark:border-white/8 pt-16 pb-8 bg-white/60 dark:bg-[#0d1520]/72 text-zinc-500 dark:text-zinc-400 backdrop-blur-xl transition-colors duration-200"
  >
    <div class="container mx-auto px-6 max-w-300">
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16"
      >
        <div
          class="col-span-1 md:col-span-2 lg:col-span-2 lg:border-r border-zinc-200/70 dark:border-white/8 pr-0 lg:pr-4"
        >
          <div class="flex items-center space-x-3 mb-4">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 dark:border-cyan-300/35 bg-white/78 dark:bg-cyan-500/12 shadow-sm"
            >
              <img
                src="/favicon.png"
                alt="Sonar Code Editor Icon"
                class="h-6 w-6 drop-shadow-sm"
              />
            </div>
            <span
              class="text-xl font-bold bg-linear-to-r from-cyan-700 via-sky-700 to-blue-700 bg-clip-text text-transparent dark:from-cyan-100 dark:via-sky-200 dark:to-blue-200"
              >Sonar IDE</span
            >
          </div>
          <p
            class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 mb-6 max-w-sm"
          >
            A modern, lightweight code editor built for speed, collaboration,
            and a seamless development experience across all your devices.
            Backed by knurdz.org for the developer community.
          </p>
        </div>

        <div class="lg:pl-8">
          <h3 class="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Product
          </h3>
          <ul class="space-y-3 text-sm">
            <li>
              <a
                href="/download"
                class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >Download</a
              >
            </li>
            <li>
              <a
                href="/docs"
                class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >Documentation</a
              >
            </li>
            <li>
              <a
                href="/docs#code-editor"
                class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >Features</a
              >
            </li>
            <li>
              <a
                href="https://github.com/rkvishwa/Sonar-Code-Editor/releases"
                target="_blank"
                rel="noreferrer"
                class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >Releases</a
              >
            </li>
          </ul>
        </div>

        <div>
          <h3 class="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Resources
          </h3>
          <ul class="space-y-3 text-sm">
            <li>
              <a
                href="/about"
                class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >About Us</a
              >
            </li>
            <li>
              <a
                href="https://github.com/rkvishwa/Sonar-Code-Editor"
                target="_blank"
                rel="noreferrer"
                class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >Source Code</a
              >
            </li>
            <li>
              <a
                href="/privacy"
                class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >Privacy Policy</a
              >
            </li>
          </ul>
        </div>

        <div>
          <h3 class="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Connect
          </h3>
          <ul class="space-y-4 text-sm">
            <li>
              <span
                class="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1"
                >Community</span
              >
              <a
                href="https://knurdz.org"
                target="_blank"
                class="text-cyan-600 dark:text-cyan-400 hover:underline transition-colors font-medium"
                >knurdz.org</a
              >
            </li>
            <li>
              <span
                class="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1"
                >Email Us</span
              >
              <a
                href="mailto:contact@knurdz.org"
                class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >contact@knurdz.org</a
              >
            </li>
            <li>
              <span
                class="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1"
                >Support</span
              >
              <a
                href="/contact"
                class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >Contact Form</a
              >
            </li>
          </ul>
        </div>
      </div>

      <div
        class="pt-8 border-t border-zinc-200/70 dark:border-white/8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400"
      >
        <p>&copy; {new Date().getFullYear()} Sonar Project. MIT Licensed.</p>
        <a
          href="https://knurdz.org"
          target="_blank"
          rel="noreferrer"
          class="group flex items-center space-x-1.5 border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-200 dark:hover:border-cyan-800/60 hover:shadow-[0_0_12px_rgba(6,182,212,0.15)] px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider text-zinc-600 dark:text-zinc-300 hover:text-cyan-700 dark:hover:text-cyan-300 shadow-sm transition-all duration-300 cursor-pointer"
        >
          <Zap
            size={14}
            class="text-cyan-500 fill-cyan-500/20 group-hover:fill-cyan-500/40 transition-colors duration-300"
          />
          <span>POWERED BY KNURDZ</span>
        </a>
      </div>
    </div>
  </footer>
</div>
