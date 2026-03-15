<script lang="ts">
  import { page } from "$app/state";
  import { ArrowLeft, AlertTriangle, Bug, XCircle } from "lucide-svelte";
</script>

<svelte:head>
  <title>{page.status} - {page.error?.message || "Error"} | Sonar IDE</title>
</svelte:head>

<div class="relative isolate flex flex-grow min-h-[70vh] flex-col items-center justify-center px-4 sm:px-6">
  <!-- Decorative background -->
  <div
    class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15),transparent_50%)]"
  ></div>

  <!-- Main Content Box -->
  <div class="z-10 w-full max-w-2xl text-center smooth-fade">
    <!-- Doodle Background Elements for 404 -->
    {#if page.status === 404}
      <div class="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] opacity-20 dark:opacity-[0.08] sm:h-[400px] sm:w-[500px]">
        <!-- Doodle 1: Wavy dashed line -->
        <svg class="absolute -left-12 top-0 h-24 w-24 sm:-left-24 sm:-top-8 sm:h-32 sm:w-32 doodle-float-1" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 50 Q 25 20, 50 50 T 90 50" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="8 8" class="text-cyan-600 dark:text-cyan-400" />
        </svg>

        <!-- Doodle 2: Crossed out mini elements -->
        <svg class="absolute -bottom-8 right-0 h-16 w-16 sm:-bottom-12 sm:-right-8 sm:h-24 sm:w-24 doodle-float-2" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 20 L40 40 M40 20 L20 40 M60 60 L80 80 M80 60 L60 80 M45 25 L55 35 M55 25 L45 35" stroke="currentColor" stroke-width="5" stroke-linecap="round" class="text-zinc-400 dark:text-zinc-500" />
        </svg>
        
        <!-- Doodle 3: Spiral/Swirl -->
        <svg class="absolute bottom-16 -left-4 h-20 w-20 sm:bottom-20 sm:-left-16 sm:h-28 sm:w-28 doodle-float-3" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 50 m0 -40 a40 40 0 1 1 -1 0 m1 10 a30 30 0 1 0 1 0 m-1 -10 a20 20 0 1 1 -1 0" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="text-cyan-500 dark:text-cyan-600" style="stroke-dasharray: 10 15;"/>
          <path d="M20 50 C20 30, 80 30, 80 50 C80 65, 35 65, 35 50 C35 40, 60 40, 60 50" stroke="currentColor" stroke-width="4" stroke-linecap="round" class="text-cyan-500 dark:text-cyan-600"/>
        </svg>
      </div>
    {/if}

    <div class="mb-8 flex justify-center {page.status === 404 ? 'smooth-float' : ''}">
      <div class="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-cyan-100/50 p-6 shadow-inner ring-1 ring-cyan-200/50 backdrop-blur-md dark:bg-cyan-950/30 dark:ring-cyan-800/50">
        {#if page.status === 404}
          <XCircle class="h-12 w-12 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
        {:else if page.status >= 500}
          <AlertTriangle class="h-12 w-12 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
        {:else}
          <Bug class="h-12 w-12 text-cyan-600 dark:text-cyan-400" strokeWidth={1.5} />
        {/if}
      </div>
    </div>

    <h1 class="mb-2 text-7xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-8xl">
      {page.status}
    </h1>

    <h2 class="mb-4 text-2xl font-semibold text-zinc-800 dark:text-zinc-200 sm:text-3xl">
      {#if page.status === 404}
        Page Not Found
      {:else if page.status === 510}
        Not Extended
      {:else}
        Oops! Something went wrong
      {/if}
    </h2>

    <p class="mx-auto mb-10 max-w-xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg sm:leading-relaxed">
      {page.error?.message || "An unexpected error occurred."}
    </p>

    <!-- Actions -->
    <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
      <a
        href="/"
        class="group flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5 hover:bg-cyan-500 dark:bg-cyan-500 dark:shadow-cyan-900/30 dark:hover:bg-cyan-400 sm:w-auto"
      >
        <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Return Home
      </a>
      
      <a
        href="/contact"
        class="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/50 px-6 py-3 text-sm font-semibold text-zinc-700 backdrop-blur-md transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:w-auto"
      >
        Contact Support
      </a>
    </div>
  </div>
</div>

<style>
  .smooth-fade {
    animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: translateY(15px);
  }
  
  .smooth-float {
    animation: soft-float 4s ease-in-out infinite;
  }
  
  @keyframes fade-up {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes soft-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .doodle-float-1 {
    animation: doodle-sway 8s ease-in-out infinite;
    transform-origin: center;
  }
  
  .doodle-float-2 {
    animation: doodle-sway-reverse 10s ease-in-out infinite;
    transform-origin: center;
  }
  
  .doodle-float-3 {
    animation: doodle-bob 9s ease-in-out infinite;
    transform-origin: center;
  }

  @keyframes doodle-sway {
    0%, 100% { transform: rotate(-5deg) translate(0, 0); }
    50% { transform: rotate(5deg) translate(10px, -15px); }
  }

  @keyframes doodle-sway-reverse {
    0%, 100% { transform: rotate(5deg) translate(0, 0); }
    50% { transform: rotate(-10deg) translate(-15px, 10px); }
  }

  @keyframes doodle-bob {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-20px) scale(1.05); }
  }
</style>
