<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData } from "./$types";
  import { Mail, ShieldCheck, Sparkles, Clock3, Send } from "lucide-svelte";

  let { form } = $props<{ form?: ActionData }>();

  let glowCard: HTMLDivElement;
  let mouseX = $state(0);
  let mouseY = $state(0);
  let isHovering = $state(false);

  function handleMouseMove(event: MouseEvent) {
    if (!glowCard) return;
    const rect = glowCard.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function handleMouseEnter() {
    isHovering = true;
  }

  function handleMouseLeave() {
    isHovering = false;
  }
</script>

<svelte:head>
  <title>Contact Us | Sonar IDE</title>
  <meta
    name="description"
    content="Contact the Sonar IDE team and receive an automatic acknowledgment email after submitting the form."
  />
</svelte:head>

<div class="relative overflow-hidden px-6 pt-12 pb-20 sm:pt-16 lg:pt-20">
  <div class="relative max-w-[1200px] mx-auto">
    <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] items-start">
      <section class="pt-0 lg:pt-2">
        <div
          class="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 dark:border-cyan-400/20 bg-white/80 dark:bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300 shadow-sm backdrop-blur-sm"
        >
          <Mail size={14} />
          Contact Us
        </div>

        <h1
          class="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white leading-[1.05]"
        >
          Talk to the team behind Sonar.
        </h1>

        <p
          class="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400"
        >
          Questions about secure coding environments, classroom deployments, or
          collaboration workflows belong here. Send a message and we will
          acknowledge it by email automatically.
        </p>

        <div class="mt-10 space-y-4">
          <div
            class="rounded-2xl border border-zinc-200/80 dark:border-white/8 bg-white/75 dark:bg-white/3 p-5 backdrop-blur-sm shadow-sm"
          >
            <div class="flex items-start gap-4">
              <div
                class="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300"
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2
                  class="text-base font-semibold text-zinc-900 dark:text-white"
                >
                  Direct and traceable
                </h2>
                <p
                  class="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                >
                  Every submission is copied to the configured inbox so your
                  team can follow up without losing context.
                </p>
              </div>
            </div>
          </div>

          <div
            class="rounded-2xl border border-zinc-200/80 dark:border-white/8 bg-white/75 dark:bg-white/3 p-5 backdrop-blur-sm shadow-sm"
          >
            <div class="flex items-start gap-4">
              <div
                class="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
              >
                <Clock3 size={20} />
              </div>
              <div>
                <h2
                  class="text-base font-semibold text-zinc-900 dark:text-white"
                >
                  Immediate acknowledgment
                </h2>
                <p
                  class="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                >
                  The sender receives a confirmation email right after submit,
                  so they know the message was received.
                </p>
              </div>
            </div>
          </div>

          <div
            class="rounded-2xl border border-zinc-200/80 dark:border-white/8 bg-white/75 dark:bg-white/3 p-5 backdrop-blur-sm shadow-sm"
          >
            <div class="flex items-start gap-4">
              <div
                class="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300"
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h2
                  class="text-base font-semibold text-zinc-900 dark:text-white"
                >
                  Built for product feedback
                </h2>
                <p
                  class="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                >
                  Use the form for feature requests, deployment questions,
                  partnerships, or general support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        bind:this={glowCard}
        onmousemove={handleMouseMove}
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
        role="presentation"
        class="relative"
      >
        <div
          class="pointer-events-none absolute -inset-10 rounded-[2rem] blur-3xl transition-opacity duration-300"
          style="background: radial-gradient(340px circle at {mouseX}px {mouseY}px, rgba(34, 211, 238, 0.24), transparent 62%); opacity: {isHovering
            ? 1
            : 0};"
        ></div>

        <div
          class="pointer-events-none absolute -inset-[1px] rounded-[2rem] transition-opacity duration-300"
          style="background: radial-gradient(520px circle at {mouseX}px {mouseY}px, rgba(34, 211, 238, 0.95), rgba(59, 130, 246, 0.55) 22%, transparent 45%); opacity: {isHovering
            ? 1
            : 0};"
        ></div>

        <div
          class="pointer-events-none absolute -inset-[1px] rounded-[2rem] bg-linear-to-br from-cyan-200/80 via-white/30 to-blue-200/60 dark:from-cyan-400/20 dark:via-white/5 dark:to-blue-500/20 opacity-80"
        ></div>

        <section
          class="relative overflow-hidden rounded-[2rem] border border-white/70 dark:border-white/10 bg-white/82 dark:bg-[#081019]/82 p-8 sm:p-10 shadow-[0_24px_80px_-32px_rgba(8,145,178,0.45)] backdrop-blur-xl"
        >
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_50%)]"
          ></div>

          <div class="relative">
            <div class="mb-8 flex items-center gap-3">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-[#081019] shadow-lg"
              >
                <Send size={20} />
              </div>
              <div>
                <p
                  class="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300"
                >
                  Message the team
                </p>
                <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">
                  Send a contact request
                </h2>
              </div>
            </div>

            <form method="POST" use:enhance class="space-y-5" novalidate>
              <div>
                <label
                  for="name"
                  class="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                  >Name</label
                >
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form?.values?.name ?? ""}
                  autocomplete="name"
                  required
                  class="w-full rounded-xl border border-zinc-300/90 dark:border-white/10 bg-white/90 dark:bg-[#08131f] px-4 py-3 text-zinc-900 dark:text-zinc-100 outline-none transition-[border-color,box-shadow,background-color] focus:border-cyan-500 dark:focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.18)]"
                  aria-invalid={form?.errors?.name ? "true" : "false"}
                />
                {#if form?.errors?.name}
                  <p class="mt-2 text-sm text-rose-600 dark:text-rose-400">
                    {form.errors.name}
                  </p>
                {/if}
              </div>

              <div>
                <label
                  for="email"
                  class="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                  >Email</label
                >
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form?.values?.email ?? ""}
                  autocomplete="email"
                  required
                  class="w-full rounded-xl border border-zinc-300/90 dark:border-white/10 bg-white/90 dark:bg-[#08131f] px-4 py-3 text-zinc-900 dark:text-zinc-100 outline-none transition-[border-color,box-shadow,background-color] focus:border-cyan-500 dark:focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.18)]"
                  aria-invalid={form?.errors?.email ? "true" : "false"}
                />
                {#if form?.errors?.email}
                  <p class="mt-2 text-sm text-rose-600 dark:text-rose-400">
                    {form.errors.email}
                  </p>
                {/if}
              </div>

              <div>
                <label
                  for="message"
                  class="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                  >Message</label
                >
                <textarea
                  id="message"
                  name="message"
                  rows="7"
                  required
                  class="w-full rounded-xl border border-zinc-300/90 dark:border-white/10 bg-white/90 dark:bg-[#08131f] px-4 py-3 text-zinc-900 dark:text-zinc-100 outline-none transition-[border-color,box-shadow,background-color] focus:border-cyan-500 dark:focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.18)] resize-y"
                  aria-invalid={form?.errors?.message ? "true" : "false"}
                  >{form?.values?.message ?? ""}</textarea
                >
                {#if form?.errors?.message}
                  <p class="mt-2 text-sm text-rose-600 dark:text-rose-400">
                    {form.errors.message}
                  </p>
                {/if}
              </div>

              {#if form?.message}
                <div
                  class={`rounded-2xl border px-4 py-3 text-sm ${form.success ? "border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-rose-200 bg-rose-50/90 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"}`}
                >
                  {form.message}
                </div>
              {/if}

              <div
                class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <p class="text-sm text-zinc-500 dark:text-zinc-400">
                  A confirmation email is sent to the address you provide.
                </p>
                <button
                  type="submit"
                  class="inline-flex items-center justify-center whitespace-nowrap gap-2 rounded-xl bg-zinc-950 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/15 transition-all hover:-translate-y-0.5 hover:bg-cyan-500 dark:bg-white dark:text-[#081019] dark:hover:bg-cyan-300"
                >
                  <Send size={16} />
                  <span>Send Message</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  </div>
</div>
