<script lang="ts">
  import { onMount } from "svelte";
  import {
    Search,
    Book,
    Shield,
    Users,
    ChevronRight,
    Code2,
    Eye,
    Activity,
    Monitor,
    Terminal,
    FileText,
    Settings,
    Wifi,
    WifiOff,
    Lock,
    Keyboard,
    Database,
    HardDrive,
    Globe,
    Cpu,
    Clipboard,
    FolderTree,
    Layers,
    RefreshCw,
    ArrowLeft,
    ArrowRight,
    Home,
  } from "lucide-svelte";

  let activeSection = $state("introduction");
  let searchQuery = $state("");

  const sections = [
    {
      group: "Getting Started",
      items: [
        { id: "introduction", label: "Introduction" },
        { id: "installation", label: "Installation" },
      ],
    },
    {
      group: "Core Features",
      items: [
        { id: "code-editor", label: "Code Editor" },
        { id: "file-tree", label: "File Tree & Workspace" },
        { id: "collaboration", label: "Live Collaboration" },
        { id: "activity-monitoring", label: "Activity Monitoring" },
        { id: "admin-dashboard", label: "Admin Dashboard" },
        { id: "local-preview", label: "Local Preview" },
        { id: "settings", label: "Settings" },
      ],
    },
    {
      group: "Security",
      items: [
        { id: "security-model", label: "Security Model" },
        { id: "preview-lockdown", label: "Preview Lockdown" },
        { id: "filesystem-sandbox", label: "File System Sandbox" },
      ],
    },
    {
      group: "Reference",
      items: [
        { id: "tech-stack", label: "Tech Stack" },
        { id: "changelog", label: "Changelog" },
      ],
    },
  ];

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );

    sections.forEach((group) => {
      group.items.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });
    });

    return () => observer.disconnect();
  });

  const filteredSections = $derived(
    searchQuery.trim()
      ? sections
          .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
              item.label.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
          }))
          .filter((group) => group.items.length > 0)
      : sections,
  );
</script>

<svelte:head>
  <title>Documentation | Sonar IDE</title>
  <meta
    name="description"
    content="Complete documentation for Sonar IDE — features, security model, and developer reference."
  />
</svelte:head>

<div
  class="px-6 pt-12 pb-12 lg:pt-16 lg:pb-20 max-w-300 mx-auto w-full flex flex-col md:flex-row gap-12 transition-colors duration-200"
>
  <!-- Sidebar Navigation -->
  <aside
    class="w-full md:w-64 shrink-0 font-medium sticky top-22 self-start max-h-[calc(100vh-6.5rem)] overflow-y-auto"
  >
    <div class="space-y-6 pr-2">
      <div class="relative mb-6">
        <Search
          size={16}
          class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="text"
          placeholder="Filter sections..."
          bind:value={searchQuery}
          class="w-full bg-white dark:bg-white/2 border border-zinc-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400"
        />
      </div>

      {#each filteredSections as group}
        <div>
          <h3
            class="text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 font-bold"
          >
            {group.group}
          </h3>
          <ul class="space-y-1.5">
            {#each group.items as item}
              <li>
                <a
                  href="#{item.id}"
                  class="block py-1 text-sm transition-colors {activeSection ===
                  item.id
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}"
                >
                  {item.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 max-w-3xl space-y-16">
    <!-- Introduction -->
    <section id="introduction">
      <h1
        class="text-4xl font-extrabold mb-6 text-zinc-900 dark:text-white tracking-tight"
      >
        Documentation
      </h1>
      <p class="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
        Sonar IDE is a real-time collaborative code editor built with <strong
          >Electron + React + Vite</strong
        >, designed for <strong>supervised coding environments</strong>, pair
        programming, and monitored exams. It combines the power of the Monaco
        Editor (the engine behind VS Code) with comprehensive activity
        monitoring and administrative controls.
      </p>
      <p class="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Whether you're an administrator setting up exam sessions or a student
        writing code, this documentation covers everything from installation to
        advanced features.
      </p>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Installation -->
    <section id="installation">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Terminal size={22} class="text-blue-600 dark:text-blue-400" />
        Installation
      </h2>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Prerequisites
      </h3>
      <ul
        class="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1 mb-6"
      >
        <li>Node.js v18.x or higher</li>
        <li>NPM v9.x or higher</li>
        <li>Git</li>
      </ul>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Local Development
      </h3>
      <div
        class="bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5 rounded-xl p-5 font-mono text-sm text-zinc-700 dark:text-zinc-300 space-y-1 mb-6 overflow-x-auto"
      >
        <p class="text-zinc-500 dark:text-zinc-500"># Clone and install</p>
        <p>git clone https://github.com/your-username/Sonar-Code-Editor.git</p>
        <p>cd Sonar-Code-Editor</p>
        <p>npm install</p>
        <br />
        <p class="text-zinc-500 dark:text-zinc-500">
          # Start all processes (Vite + TypeScript + Electron)
        </p>
        <p>npm run start</p>
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Production Build
      </h3>
      <div
        class="bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5 rounded-xl p-5 font-mono text-sm text-zinc-700 dark:text-zinc-300 space-y-1 overflow-x-auto"
      >
        <p>npm run build</p>
        <p>
          npm run package:win &nbsp; <span class="text-zinc-500"
            ># Windows NSIS installer</span
          >
        </p>
        <p>
          npm run package:mac &nbsp; <span class="text-zinc-500"
            ># macOS DMG</span
          >
        </p>
        <p>
          npm run package:linux <span class="text-zinc-500"
            ># Linux AppImage</span
          >
        </p>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Code Editor -->
    <section id="code-editor">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Code2 size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Powered by the exact Monaco Editor engine from VS Code, Sonar supports <strong
          >100+ programming languages</strong
        >
        with full syntax highlighting, IntelliSense, auto-closing brackets, and code
        formatting.
      </p>

      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div
          class="p-5 rounded-xl bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">
            Editor Features
          </h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Multi-tab file editing with visual tab bar</li>
            <li>Auto-save with configurable 500ms debounce</li>
            <li>Toggleable word wrap and minimap</li>
            <li>JetBrains Mono font with ligatures</li>
            <li>Smooth scrolling and cursor blinking</li>
            <li>Auto-closing brackets, quotes, and HTML tags</li>
          </ul>
        </div>
        <div
          class="p-5 rounded-xl bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">
            Supported Languages
          </h4>
          <div class="flex flex-wrap gap-1.5">
            {#each ["TypeScript", "JavaScript", "HTML", "CSS", "JSON", "Python", "Rust", "Go", "Java", "C", "C++", "PHP", "SQL", "Markdown", "YAML", "Bash"] as lang}
              <span
                class="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded text-xs font-mono"
                >{lang}</span
              >
            {/each}
          </div>
        </div>
      </div>

      <div class="mt-4 p-5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
        <h4 class="font-semibold text-amber-900 dark:text-amber-200 mb-2 text-sm flex items-center gap-2">
          <Shield size={16} /> Admin-Controlled Editor Policies
        </h4>
        <p class="text-sm text-amber-800 dark:text-amber-300">
          To maintain strict exam environments, advanced editor behaviors such as <strong>quick suggestions (autocomplete)</strong>, <strong>snippet completions</strong>, and <strong>auto-closing brackets/quotes</strong> can be dynamically enabled or disabled globally by an administrator in the admin dashboard settings. This prevents over-reliance on IntelliSense and enforces academic integrity when needed.
        </p>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- File Tree -->
    <section id="file-tree">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <FolderTree size={22} class="text-blue-600 dark:text-blue-400" />
        File Tree & Workspace
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The File Tree provides full workspace management with right-click
        context menus and inline rename for effortless navigation.
      </p>

      <ul
        class="list-disc list-inside text-zinc-600 dark:text-zinc-400 text-sm space-y-1.5"
      >
        <li>Recursive folder expansion with type-specific file icons</li>
        <li>
          Right-click context menu for create, delete, and rename operations
        </li>
        <li>
          Inline rename with double-click (Enter to commit, Esc to cancel)
        </li>
        <li>Binary file detection — images displayed in a preview tab</li>
        <li>Platform-aware indentation (Windows: 16px, macOS: 28px)</li>
        <li>
          Global undo restores the last deleted file from an internal trash
          buffer
        </li>
        <li>
          KeyShield captures input at the window level to prevent React focus
          conflicts
        </li>
      </ul>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Collaboration -->
    <section id="collaboration">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Users size={22} class="text-blue-600 dark:text-blue-400" />
        Live Collaboration
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Google Docs-style real-time code collaboration powered by <strong
          >Yjs</strong
        >
        (CRDT) and <strong>y-monaco</strong> bindings. All changes are synchronized
        automatically with conflict-free resolution — no manual merging required.
      </p>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        How It Works
      </h3>
      <div
        class="bg-zinc-50 dark:bg-white/2 rounded-xl border border-zinc-200 dark:border-white/5 p-5 text-sm text-zinc-600 dark:text-zinc-400 space-y-3 mb-6"
      >
        <p>
          <strong class="text-zinc-900 dark:text-white"
            >1. Host starts session</strong
          > — A user initiates a collaboration session and shares their session details.
        </p>
        <p>
          <strong class="text-zinc-900 dark:text-white">2. Client joins</strong>
          — Other team members enter the shared address to connect securely.
        </p>
        <p>
          <strong class="text-zinc-900 dark:text-white"
            >3. Team validation</strong
          > — The system verifies the joining client's team ID to ensure authorized
          access only.
        </p>
        <p>
          <strong class="text-zinc-900 dark:text-white"
            >4. Workspace sync</strong
          > — Full workspace structure and file contents are automatically synchronized.
        </p>
        <p>
          <strong class="text-zinc-900 dark:text-white">5. Live editing</strong>
          — Every change is synced in real-time. Shared cursors show each user's
          position with a unique color and name label.
        </p>
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Cursor Colors
      </h3>
      <div class="flex flex-wrap gap-2 mb-6">
        {#each [{ color: "#3b82f6", label: "Blue" }, { color: "#10b981", label: "Green" }, { color: "#f59e0b", label: "Amber" }, { color: "#ef4444", label: "Red" }, { color: "#8b5cf6", label: "Violet" }, { color: "#ec4899", label: "Pink" }, { color: "#06b6d4", label: "Cyan" }, { color: "#84cc16", label: "Lime" }] as { color, label }}
          <div
            class="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-white/5 rounded-lg"
          >
            <div
              class="w-3 h-3 rounded-full"
              style="background-color: {color}"
            ></div>
            <span class="text-xs text-zinc-600 dark:text-zinc-400">{label}</span
            >
          </div>
        {/each}
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Activity Monitoring -->
    <section id="activity-monitoring">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Activity size={22} class="text-blue-600 dark:text-blue-400" />
        Activity Monitoring
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        The monitoring system operates through a dual-layer architecture: the <strong
          >Main Process</strong
        >
        sends heartbeats every 15 seconds, while the <strong>Renderer</strong> tracks
        local activity events and attaches them to each heartbeat before syncing
        to Appwrite.
      </p>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Tracked Events
      </h3>
      <div
        class="bg-zinc-50 dark:bg-white/2 rounded-xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5 text-sm overflow-hidden mb-6"
      >
        {#each [["Online/Offline Status", "Monitors network connectivity and records disconnected states"], ["Window Focus", "Detects when a user leaves the IDE or switches focus away"], ["Internal Copy/Paste", "Tracks copy and paste operations within the editor"], ["External Paste Detection", "Alerts when content is pasted from an external source"], ["Active Applications", "Records which applications the user is actively viewing"], ["Current File", "Logs which file the user is currently editing"]] as [event, desc]}
          <div class="p-3 flex gap-4">
            <span
              class="text-zinc-900 dark:text-zinc-200 font-semibold shrink-0 text-xs w-40"
              >{event}</span
            >
            <span class="text-zinc-600 dark:text-zinc-400 text-xs">{desc}</span>
          </div>
        {/each}
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Offline Resilience
      </h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        If the network is unavailable, activities are queued safely in local
        storage. Once the connection is restored, all queued events are
        transparently synced to provide gapless monitoring without disrupting
        the user.
      </p>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Admin Dashboard -->
    <section id="admin-dashboard">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Book size={22} class="text-blue-600 dark:text-blue-400" />
        Admin Dashboard
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Users with <code class="text-blue-700 dark:text-blue-300"
          >role: 'admin'</code
        > are routed to a dedicated monitoring dashboard with real-time visibility
        into all active teams and their activity.
      </p>

      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div
          class="p-5 rounded-xl bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">
            Real-time Monitoring
          </h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Live team list with online/offline status</li>
            <li>Tracking of last seen timestamp</li>
            <li>Visibility into current active windows and files</li>
            <li>Reliable status updates with robust fallbacks</li>
          </ul>
        </div>
        <div
          class="p-5 rounded-xl bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">
            Activity Metrics
          </h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Total heartbeats, unique apps, files, and windows</li>
            <li>Online/offline duration tracking</li>
            <li>Clipboard copy count and external paste detection</li>
            <li>App blur events (suspected app switches)</li>
          </ul>
        </div>
        <div
          class="p-5 rounded-xl bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">
            Dashboard Views
          </h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Table mode (compact, columnar) and Grid mode (card-based)</li>
            <li>Sort by: Team Name, Status, or Last Seen</li>
            <li>Filter by: All, Online Only, or Offline Only</li>
            <li>Case-insensitive search by team name</li>
          </ul>
        </div>
        <div
          class="p-5 rounded-xl bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">
            PDF Report Generation
          </h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Per-team detailed reports via jsPDF</li>
            <li>Summary: total time, online %, disconnections, app switches</li>
            <li>Online/offline timeline with durations</li>
            <li>Suspicious app detection (browsers, chat, AI tools)</li>
          </ul>
        </div>
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Global Dashboard Insights
      </h3>
      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5"
      >
        <li>Online/offline user count with percentage breakdown</li>
        <li>Top 5 most-accessed external applications</li>
        <li>Recently active teams (within last 5 minutes)</li>
        <li>Estimated average session duration</li>
      </ul>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Local Preview -->
    <section id="local-preview">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Eye size={22} class="text-blue-600 dark:text-blue-400" />
        Local Preview
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        The integrated preview panel embeds a <code
          class="text-blue-700 dark:text-blue-300">&lt;webview&gt;</code
        >
        restricted to <strong>localhost-only</strong> URLs. All non-localhost navigation
        is silently blocked, preventing exam candidates from accessing external websites.
      </p>

      <div
        class="bg-zinc-50 dark:bg-white/2 rounded-xl border border-zinc-200 dark:border-white/5 p-5 mb-6"
      >
        <h4 class="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">
          Navigation Controls
        </h4>
        <div
          class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-zinc-600 dark:text-zinc-400"
        >
          <div class="flex items-center gap-2">
            <ArrowLeft size={14} class="text-blue-600 dark:text-blue-400" /> Back
          </div>
          <div class="flex items-center gap-2">
            <ArrowRight size={14} class="text-blue-600 dark:text-blue-400" /> Forward
          </div>
          <div class="flex items-center gap-2">
            <RefreshCw size={14} class="text-blue-600 dark:text-blue-400" /> Refresh
          </div>
          <div class="flex items-center gap-2">
            <Home size={14} class="text-blue-600 dark:text-blue-400" /> Home
          </div>
        </div>
      </div>

      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5"
      >
        <li>
          Embedded Express server starts from port 3500 (auto-finds free port)
        </li>
        <li>Serves static files from workspace with no-cache headers</li>
        <li>
          Follow File mode: auto-navigates to the active <code
            class="text-blue-700 dark:text-blue-300">.html</code
          > file
        </li>
        <li>Hot reload: refreshes preview on every file save (toggleable)</li>
        <li>
          Console capture: intercepts log, warn, error from the loaded page
          (last 500 entries)
        </li>
        <li>Inspector button opens DevTools for the webview</li>
        <li>Supports: HTML, CSS, JS, images, fonts, media, PDFs</li>
      </ul>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Settings -->
    <section id="settings">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Settings size={22} class="text-blue-600 dark:text-blue-400" />
        Settings
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The settings modal provides tabs for customizing the IDE experience. User settings persist to <code class="text-blue-700 dark:text-blue-300">localStorage</code>. Administrator actions sync globally in real-time.
      </p>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Student & General Settings
      </h3>
      <div
        class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5 text-sm overflow-hidden mb-6"
      >
        {#each [["Text Editor", "Auto-Save (500ms debounce), Hot Reload (refresh preview on save), Word Wrap toggle"], ["Appearance", "Theme: Light, Dark, or System (respects OS preference on load)"], ["Collaboration", "Show collaborator usernames toggle, username opacity slider (0-100%)"], ["Account", "View team name, list team members (student IDs), add members (max 5)"], ["Activity Log", "View event timeline, export as color-coded PDF with suspicious activity flags"], ["Security", "Change team password (requires current password verification)"]] as [tab, desc]}
          <div class="p-4">
            <h4 class="font-semibold text-zinc-900 dark:text-white mb-1">
              {tab}
            </h4>
            <p class="text-zinc-600 dark:text-zinc-400 text-xs">{desc}</p>
          </div>
        {/each}
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Admin Settings & Overrides
      </h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
        Administrators have access to global management settings that bypass local student choices.
      </p>
      <div
        class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5 text-sm overflow-hidden"
      >
        {#each [["Editor Restrictions", "Locally disable Monaco's built-in Quick Suggestions (Autocomplete), Snippet Completions, and auto-closing brackets."], ["Network Constraints", "Toggle and enforce Global Internet Restrictions to completely sandbox the team."], ["Log Management", "Safely clear flagged activity logs globally or manage team connection states."], ["Activity Policies", "Define strict conditions for what constitutes an external paste or blur event."]] as [tab, desc]}
          <div class="p-4">
            <h4 class="font-semibold text-zinc-900 dark:text-white mb-1">
              {tab}
            </h4>
            <p class="text-zinc-600 dark:text-zinc-400 text-xs">{desc}</p>
          </div>
        {/each}
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Security Model -->
    <section id="security-model">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Shield size={22} class="text-blue-600 dark:text-blue-400" />
        Security Model
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Sonar enforces multiple layers of security to maintain academic
        integrity during exams.
      </p>

      <div class="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
        <div
          class="p-4 rounded-xl bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-1">
            Team-Based Authentication
          </h4>
          <p>
            Users authenticate with Team Name + Password via Appwrite. Offline
            fallback uses locally cached credentials with a simple hash.
            Role-based routing sends <code
              class="text-blue-700 dark:text-blue-300">admin</code
            >
            users to the dashboard and
            <code class="text-blue-700 dark:text-blue-300">team</code> users to the
            IDE.
          </p>
        </div>
        <div
          class="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-1">
            Input Sanitization
          </h4>
          <p>
            System operations are carefully guarded to ensure all generated
            files remain within their isolated workspace root. Restricted
            characters are rejected completely to prevent traversal attacks.
          </p>
        </div>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Preview Lockdown -->
    <section id="preview-lockdown">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Lock size={22} class="text-blue-600 dark:text-blue-400" />
        Preview Lockdown
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The <code class="text-blue-700 dark:text-blue-300">&lt;webview&gt;</code
        > element intercepts all navigation requests and validates them against a
        strict localhost-only policy:
      </p>
      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5 mb-4"
      >
        <li>
          Only <code class="text-blue-700 dark:text-blue-300">localhost:*</code>
          and <code class="text-blue-700 dark:text-blue-300">127.0.0.1:*</code> URLs
          are permitted
        </li>
        <li>
          Non-localhost URLs are silently ignored (redirected to server root)
        </li>
        <li>
          URL bar input auto-prepends <code
            class="text-blue-700 dark:text-blue-300">http://</code
          > for bare localhost entries
        </li>
        <li>
          All responses include <code class="text-blue-700 dark:text-blue-300"
            >Cache-Control: no-cache</code
          > headers
        </li>
      </ul>
      <p class="text-sm text-zinc-500 dark:text-zinc-500">
        This ensures exam candidates cannot browse the web, access external
        APIs, or open any online resources from within the IDE.
      </p>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- File System Sandbox -->
    <section id="filesystem-sandbox">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <HardDrive size={22} class="text-blue-600 dark:text-blue-400" />
        File System Sandbox
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The application guarantees an isolated environment by ensuring editors
        have zero direct access to the computer's underlying file system.
      </p>
      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5"
      >
        <li>
          Binary files gracefully exclude disruptive contents from the editor
          pane
        </li>
        <li>
          Missing directory structures are securely generated during sync
          operations
        </li>
        <li>
          System configurations (e.g. environment files) remain securely hidden
          off-screen
        </li>
      </ul>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Tech Stack -->
    <section id="tech-stack">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Database size={22} class="text-blue-600 dark:text-blue-400" />
        Tech Stack
      </h2>

      <div class="grid sm:grid-cols-2 gap-4">
        <div
          class="p-5 rounded-xl bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">
            Frontend
          </h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>React</li>
            <li>Monaco Editor</li>
            <li>Yjs (CRDT)</li>
            <li>Lucide Icons</li>
            <li>Tailwind CSS</li>
            <li>Appwrite Service</li>
          </ul>
        </div>
        <div
          class="p-5 rounded-xl bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5"
        >
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">
            Desktop & Build
          </h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Electron</li>
            <li>Electron Builder</li>
            <li>TypeScript</li>
            <li>Vite</li>
          </ul>
        </div>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Changelog -->
    <section id="changelog">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <FileText size={22} class="text-blue-600 dark:text-blue-400" />
        Changelog
      </h2>

      <div
        class="bg-zinc-50 dark:bg-white/2 rounded-xl border border-zinc-200 dark:border-white/5 p-6"
      >
        <div class="flex items-center gap-3 mb-4">
          <span
            class="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold"
            >v1.0.0-beta</span
          >
          <span class="text-zinc-500 dark:text-zinc-500 text-sm"
            >Initial Beta Release</span
          >
        </div>
        <ul class="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
          <li>
            Real-time collaborative code editing powered by Monaco Editor and
            Yjs
          </li>
          <li>
            Secure Admin dashboard for user monitoring and activity tracking
          </li>
          <li>Custom File Tree navigation and multi-document tabs handling</li>
          <li>Integrated Preview Panel restricted to localhost domains only</li>
          <li>Context Bridge secure IPC between Main and Renderer processes</li>
          <li>Appwrite authentication and cloud synchronization integration</li>
          <li>Offline behavior logging with PDF generation via jsPDF</li>
          <li>
            WebSocket-based P2P file sharing and workspace synchronization
          </li>
          <li>
            Activity event tracking: online/offline, app focus/blur, clipboard
            operations
          </li>
          <li>Support for 100+ programming languages via Monaco Editor</li>
          <li>
            Cross-platform compatibility: Windows, macOS, Linux with native
            installers
          </li>
        </ul>
      </div>
    </section>

    <!-- Reporting Vulnerabilities -->
    <div
      class="mt-16 p-6 rounded-2xl bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-600/10 dark:to-cyan-600/10 border border-blue-200 dark:border-blue-500/20 transition-colors duration-200"
    >
      <h3 class="font-bold text-zinc-900 dark:text-white mb-2">
        Reporting Security Vulnerabilities
      </h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Security issues should <strong>not</strong> be reported as public GitHub
        issues. Please email
        <code class="text-blue-700 dark:text-blue-300">security@knurdz.org</code
        >
        with a detailed disclosure. See
        <a
          href="https://github.com/your-username/Sonar-Code-Editor/blob/main/SECURITY.md"
          target="_blank"
          rel="noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >SECURITY.md</a
        > for the full policy.
      </p>
    </div>
  </main>
</div>
