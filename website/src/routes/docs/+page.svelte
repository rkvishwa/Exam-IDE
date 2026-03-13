<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Search, Book, Shield, Users, ChevronRight, Code2, Eye, Activity,
    Monitor, Terminal, FileText, Settings, Wifi, WifiOff, Lock, Keyboard,
    Database, HardDrive, Globe, Cpu, Clipboard, FolderTree, Layers,
    RefreshCw, ArrowLeft, ArrowRight, Home
  } from 'lucide-svelte';

  let activeSection = $state('introduction');
  let searchQuery = $state('');

  const sections = [
    { group: 'Getting Started', items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'installation', label: 'Installation' },
      { id: 'configuration', label: 'Configuration' },
    ]},
    { group: 'Architecture', items: [
      { id: 'architecture-overview', label: 'Overview' },
      { id: 'electron-processes', label: 'Electron Processes' },
      { id: 'ipc-channels', label: 'IPC Channels' },
    ]},
    { group: 'Core Features', items: [
      { id: 'code-editor', label: 'Code Editor' },
      { id: 'file-tree', label: 'File Tree & Workspace' },
      { id: 'collaboration', label: 'Live Collaboration' },
      { id: 'activity-monitoring', label: 'Activity Monitoring' },
      { id: 'admin-dashboard', label: 'Admin Dashboard' },
      { id: 'local-preview', label: 'Local Preview' },
      { id: 'search', label: 'Search' },
      { id: 'settings', label: 'Settings' },
    ]},
    { group: 'Security', items: [
      { id: 'security-model', label: 'Security Model' },
      { id: 'preview-lockdown', label: 'Preview Lockdown' },
      { id: 'filesystem-sandbox', label: 'File System Sandbox' },
    ]},
    { group: 'Reference', items: [
      { id: 'tech-stack', label: 'Tech Stack' },
      { id: 'changelog', label: 'Changelog' },
    ]},
  ];

  onMount(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeSection = entry.target.id;
        }
      }
    }, { rootMargin: '-80px 0px -70% 0px' });

    sections.forEach(group => {
      group.items.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });
    });

    return () => observer.disconnect();
  });

  const filteredSections = $derived(
    searchQuery.trim()
      ? sections.map(group => ({
          ...group,
          items: group.items.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
        })).filter(group => group.items.length > 0)
      : sections
  );
</script>

<svelte:head>
  <title>Documentation | Sonar IDE</title>
  <meta name="description" content="Complete documentation for Sonar IDE — architecture, features, security model, and developer reference." />
</svelte:head>

<div class="px-6 pt-24 pb-12 lg:pt-32 lg:pb-20 max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-12 transition-colors duration-200">

  <!-- Sidebar Navigation -->
  <aside class="w-full md:w-64 shrink-0 font-medium sticky top-[5.5rem] self-start max-h-[calc(100vh-6.5rem)] overflow-y-auto">
    <div class="space-y-6 pr-2">
      <div class="relative mb-6">
        <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Filter sections..."
          bind:value={searchQuery}
          class="w-full bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400"
        />
      </div>

      {#each filteredSections as group}
        <div>
          <h3 class="text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 font-bold">{group.group}</h3>
          <ul class="space-y-1.5">
            {#each group.items as item}
              <li>
                <a
                  href="#{item.id}"
                  class="block py-1 text-sm transition-colors {activeSection === item.id
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
      <h1 class="text-4xl font-extrabold mb-6 text-zinc-900 dark:text-white tracking-tight">Documentation</h1>
      <p class="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
        Sonar IDE is a real-time collaborative code editor built with <strong>Electron + React + Vite</strong>, 
        designed for <strong>supervised coding environments</strong>, pair programming, and monitored exams. 
        It combines the power of the Monaco Editor (the engine behind VS Code) with comprehensive 
        activity monitoring and administrative controls.
      </p>
      <p class="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Whether you're an administrator setting up exam sessions or a student writing code, 
        this documentation covers everything from installation to the internal architecture.
      </p>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Installation -->
    <section id="installation">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Terminal size={22} class="text-blue-600 dark:text-blue-400" />
        Installation
      </h2>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Prerequisites</h3>
      <ul class="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1 mb-6">
        <li>Node.js v18.x or higher</li>
        <li>NPM v9.x or higher</li>
        <li>Git</li>
      </ul>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Local Development</h3>
      <div class="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-xl p-5 font-mono text-sm text-zinc-700 dark:text-zinc-300 space-y-1 mb-6 overflow-x-auto">
        <p class="text-zinc-500 dark:text-zinc-500"># Clone and install</p>
        <p>git clone https://github.com/rkvishwa/Sonar-Code-Editor.git</p>
        <p>cd Sonar-Code-Editor</p>
        <p>npm install</p>
        <br />
        <p class="text-zinc-500 dark:text-zinc-500"># Start all processes (Vite + TypeScript + Electron)</p>
        <p>npm run start</p>
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Production Build</h3>
      <div class="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-xl p-5 font-mono text-sm text-zinc-700 dark:text-zinc-300 space-y-1 overflow-x-auto">
        <p>npm run build</p>
        <p>npm run package:win &nbsp; <span class="text-zinc-500"># Windows NSIS installer</span></p>
        <p>npm run package:mac &nbsp; <span class="text-zinc-500"># macOS DMG</span></p>
        <p>npm run package:linux <span class="text-zinc-500"># Linux AppImage</span></p>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Configuration -->
    <section id="configuration">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Settings size={22} class="text-blue-600 dark:text-blue-400" />
        Configuration
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        Create a <code class="bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300 text-sm">.env</code> file in the project root with the following Appwrite variables:
      </p>
      <div class="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-xl p-5 font-mono text-sm text-zinc-700 dark:text-zinc-300 space-y-1 overflow-x-auto">
        <p>VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1</p>
        <p>VITE_APPWRITE_PROJECT_ID=your_project_id</p>
        <p>VITE_APPWRITE_DB_NAME=devwatch_db</p>
        <p>VITE_APPWRITE_COLLECTION_TEAMS=teams</p>
        <p>VITE_APPWRITE_COLLECTION_SESSIONS=sessions</p>
        <p>VITE_APPWRITE_COLLECTION_ACTIVITY_LOGS=activityLogs</p>
        <p>VITE_APPWRITE_COLLECTION_REPORTS=reports</p>
        <p>NODE_ENV=development</p>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Architecture Overview -->
    <section id="architecture-overview">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Layers size={22} class="text-blue-600 dark:text-blue-400" />
        Architecture Overview
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Sonar IDE uses Electron's multi-process model. The <strong>Main Process</strong> handles native OS APIs, file system operations, 
        and the WebSocket collaboration server. The <strong>Renderer Process</strong> runs the React-based UI. 
        A <strong>Preload Script</strong> acts as a secure bridge between the two.
      </p>
      <div class="grid sm:grid-cols-3 gap-4 not-prose">
        <div class="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 text-center">
          <Cpu class="text-blue-600 dark:text-blue-400 mx-auto mb-3" size={28} />
          <h4 class="font-bold text-zinc-900 dark:text-white mb-1 text-sm">Main Process</h4>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">Node.js runtime: file I/O, IPC routing, monitoring, collaboration server, static server</p>
        </div>
        <div class="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 text-center">
          <Shield class="text-blue-600 dark:text-blue-400 mx-auto mb-3" size={28} />
          <h4 class="font-bold text-zinc-900 dark:text-white mb-1 text-sm">Preload Script</h4>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">Context Bridge: exposes <code class="text-blue-600 dark:text-blue-300">electronAPI</code> safely, KeyShield input capture</p>
        </div>
        <div class="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 text-center">
          <Monitor class="text-blue-600 dark:text-blue-400 mx-auto mb-3" size={28} />
          <h4 class="font-bold text-zinc-900 dark:text-white mb-1 text-sm">Renderer Process</h4>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">React + Vite UI: pages, components, contexts, hooks, and services</p>
        </div>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Electron Processes -->
    <section id="electron-processes">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <HardDrive size={22} class="text-blue-600 dark:text-blue-400" />
        Electron Processes
      </h2>

      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold mb-2 text-zinc-800 dark:text-zinc-200">Main Process Modules</h3>
          <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-200 dark:divide-white/5 text-sm">
            <div class="p-4 flex justify-between items-start gap-4">
              <code class="text-blue-700 dark:text-blue-300 font-semibold shrink-0">main.ts</code>
              <span class="text-zinc-600 dark:text-zinc-400 text-right">App lifecycle, window creation, IPC routing, macOS automation permission check</span>
            </div>
            <div class="p-4 flex justify-between items-start gap-4">
              <code class="text-blue-700 dark:text-blue-300 font-semibold shrink-0">ipcHandlers.ts</code>
              <span class="text-zinc-600 dark:text-zinc-400 text-right">File system ops (read, write, create, delete, rename, search), native dialogs, clipboard access</span>
            </div>
            <div class="p-4 flex justify-between items-start gap-4">
              <code class="text-blue-700 dark:text-blue-300 font-semibold shrink-0">collaborationManager.ts</code>
              <span class="text-zinc-600 dark:text-zinc-400 text-right">WebSocket server (port 1234), room management, team validation, network interface detection</span>
            </div>
            <div class="p-4 flex justify-between items-start gap-4">
              <code class="text-blue-700 dark:text-blue-300 font-semibold shrink-0">monitoring.ts</code>
              <span class="text-zinc-600 dark:text-zinc-400 text-right">15-second heartbeat timer, activity event collection, offline queue management</span>
            </div>
            <div class="p-4 flex justify-between items-start gap-4">
              <code class="text-blue-700 dark:text-blue-300 font-semibold shrink-0">staticServer.ts</code>
              <span class="text-zinc-600 dark:text-zinc-400 text-right">Express HTTP server for localhost-only preview, auto-port detection starting from 3500</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-2 text-zinc-800 dark:text-zinc-200">Preload Script</h3>
          <p class="text-zinc-600 dark:text-zinc-400 text-sm">
            <code class="text-blue-700 dark:text-blue-300">preload.ts</code> exposes the <code class="text-blue-700 dark:text-blue-300">electronAPI</code> 
            object via Electron's Context Bridge. This is the only way the Renderer can access file system operations, 
            collaboration, monitoring, clipboard, and server control — the Renderer has <strong>zero</strong> direct Node.js access.
          </p>
        </div>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- IPC Channels -->
    <section id="ipc-channels">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <RefreshCw size={22} class="text-blue-600 dark:text-blue-400" />
        IPC Channels
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        All communication between the Main and Renderer process flows through typed IPC channels via the Context Bridge. 
        Here is the complete channel reference:
      </p>

      <div class="space-y-6">
        <!-- File System -->
        <div>
          <h3 class="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">File System</h3>
          <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 text-sm divide-y divide-zinc-100 dark:divide-white/5 overflow-hidden">
            {#each [
              ['fs:readDirectory', 'Recursively read folder structure (excludes dotfiles, node_modules)'],
              ['fs:readFile', 'Read text file (detects binary via NULL byte scan in first 8KB)'],
              ['fs:readFileBase64', 'Read file as Base64 (for images and binary display)'],
              ['fs:writeFile', 'Write/overwrite file content (auto-creates parent dirs)'],
              ['fs:createFile', 'Create an empty file'],
              ['fs:createFolder', 'Create a new directory'],
              ['fs:deleteItem', 'Delete file or folder recursively (idempotent)'],
              ['fs:renameItem', 'Rename with case-only rename support via temp file (Windows fix)'],
              ['fs:search', 'Full-text substring search across workspace files'],
              ['fs:openFolderDialog', 'Native OS folder picker dialog'],
              ['fs:openFileDialog', 'Native OS file picker dialog'],
            ] as [channel, desc]}
              <div class="p-3 flex gap-4">
                <code class="text-blue-700 dark:text-blue-300 font-mono shrink-0 text-xs">{channel}</code>
                <span class="text-zinc-600 dark:text-zinc-400 text-xs">{desc}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Monitoring -->
        <div>
          <h3 class="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Monitoring</h3>
          <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 text-sm divide-y divide-zinc-100 dark:divide-white/5 overflow-hidden">
            {#each [
              ['monitoring:start', 'Begin activity tracking with team credentials'],
              ['monitoring:stop', 'End tracking, send final offline heartbeat'],
              ['monitoring:heartbeat', 'Main→Renderer: 15-second periodic activity sync'],
              ['monitoring:flushQueue', 'Main→Renderer: Flush offline log queue on reconnect'],
              ['monitoring:setCurrentFile', 'Renderer→Main: Update currently active file path'],
            ] as [channel, desc]}
              <div class="p-3 flex gap-4">
                <code class="text-blue-700 dark:text-blue-300 font-mono shrink-0 text-xs">{channel}</code>
                <span class="text-zinc-600 dark:text-zinc-400 text-xs">{desc}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Collaboration -->
        <div>
          <h3 class="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Collaboration</h3>
          <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 text-sm divide-y divide-zinc-100 dark:divide-white/5 overflow-hidden">
            {#each [
              ['collaboration:startHost', 'Launch WebSocket server on port 1234, become host'],
              ['collaboration:joinSession', 'Connect to host IP, validates team ID match'],
              ['collaboration:stopSession', 'Close WebSocket, clean up Yjs doc and providers'],
              ['collaboration:getStatus', 'Query current session state (active, mode, users)'],
              ['collaboration:getLocalIp', 'Get LAN IP (prefers physical NICs over virtual)'],
              ['collaboration:getNetworkInterfaces', 'List all available network adapters'],
              ['collaboration:statusChange', 'Main→Renderer: Connection status broadcasts'],
            ] as [channel, desc]}
              <div class="p-3 flex gap-4">
                <code class="text-blue-700 dark:text-blue-300 font-mono shrink-0 text-xs">{channel}</code>
                <span class="text-zinc-600 dark:text-zinc-400 text-xs">{desc}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Server & System -->
        <div>
          <h3 class="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Server, Network & System</h3>
          <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 text-sm divide-y divide-zinc-100 dark:divide-white/5 overflow-hidden">
            {#each [
              ['server:start', 'Start HTTP preview server for selected workspace'],
              ['server:stop', 'Stop preview server'],
              ['server:getUrl', 'Get current server URL (localhost:port)'],
              ['network:status', 'Main→Renderer: Real-time connectivity updates'],
              ['network:getStatus', 'On-demand network check (HTTP to Appwrite endpoint)'],
              ['clipboard:readText', 'Read current clipboard contents'],
              ['system:getActiveWindow', 'macOS: Get focused application title'],
              ['system:checkPermission', 'Check macOS Automation permission status'],
            ] as [channel, desc]}
              <div class="p-3 flex gap-4">
                <code class="text-blue-700 dark:text-blue-300 font-mono shrink-0 text-xs">{channel}</code>
                <span class="text-zinc-600 dark:text-zinc-400 text-xs">{desc}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Code Editor -->
    <section id="code-editor">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Code2 size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Powered by the exact Monaco Editor engine from VS Code, Sonar supports <strong>100+ programming languages</strong> 
        with full syntax highlighting, IntelliSense, auto-closing brackets, and code formatting.
      </p>

      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div class="p-5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">Editor Features</h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Multi-tab file editing with visual tab bar</li>
            <li>Auto-save with configurable 500ms debounce</li>
            <li>Toggleable word wrap and minimap</li>
            <li>JetBrains Mono font with ligatures</li>
            <li>Smooth scrolling and cursor blinking</li>
            <li>Auto-closing brackets, quotes, and HTML tags</li>
          </ul>
        </div>
        <div class="p-5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">Supported Languages</h4>
          <div class="flex flex-wrap gap-1.5">
            {#each ['TypeScript', 'JavaScript', 'HTML', 'CSS', 'JSON', 'Python', 'Rust', 'Go', 'Java', 'C', 'C++', 'PHP', 'SQL', 'Markdown', 'YAML', 'Bash'] as lang}
              <span class="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">{lang}</span>
            {/each}
          </div>
        </div>
      </div>

      <p class="text-sm text-zinc-500 dark:text-zinc-500">
        Note: In exam mode, quick suggestions, snippet completions, and parameter hints are intentionally disabled 
        to prevent over-reliance on autocomplete.
      </p>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- File Tree -->
    <section id="file-tree">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <FolderTree size={22} class="text-blue-600 dark:text-blue-400" />
        File Tree & Workspace
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The File Tree provides full workspace management with right-click context menus, 
        inline rename, and keyboard shortcuts.
      </p>
      <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 p-5 text-sm space-y-3 mb-4">
        <div class="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
          <Keyboard size={14} class="text-blue-600 dark:text-blue-400 shrink-0" />
          <span><code class="bg-zinc-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">Ctrl+Alt+N</code> — Create new file</span>
        </div>
        <div class="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
          <Keyboard size={14} class="text-blue-600 dark:text-blue-400 shrink-0" />
          <span><code class="bg-zinc-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">Ctrl+Alt+Shift+N</code> — Create new folder</span>
        </div>
        <div class="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
          <Keyboard size={14} class="text-blue-600 dark:text-blue-400 shrink-0" />
          <span><code class="bg-zinc-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">Ctrl+Z</code> — Restore last deleted item</span>
        </div>
      </div>
      <ul class="list-disc list-inside text-zinc-600 dark:text-zinc-400 text-sm space-y-1.5">
        <li>Recursive folder expansion with type-specific file icons</li>
        <li>Right-click context menu for create, delete, and rename operations</li>
        <li>Inline rename with double-click (Enter to commit, Esc to cancel)</li>
        <li>Binary file detection — images displayed in a preview tab</li>
        <li>Platform-aware indentation (Windows: 16px, macOS: 28px)</li>
        <li>Global undo restores the last deleted file from an internal trash buffer</li>
        <li>KeyShield captures input at the window level to prevent React focus conflicts</li>
      </ul>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Collaboration -->
    <section id="collaboration">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Users size={22} class="text-blue-600 dark:text-blue-400" />
        Live Collaboration
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Google Docs-style real-time code collaboration powered by <strong>Yjs</strong> (CRDT) and <strong>y-monaco</strong> bindings. 
        All changes are synchronized automatically with conflict-free resolution — no manual merging required.
      </p>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">How It Works</h3>
      <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 p-5 text-sm text-zinc-600 dark:text-zinc-400 space-y-3 mb-6">
        <p><strong class="text-zinc-900 dark:text-white">1. Host starts session</strong> — Launches a WebSocket server on port 1234, broadcasts their LAN IP.</p>
        <p><strong class="text-zinc-900 dark:text-white">2. Client joins</strong> — Enters host IP address, connects to <code class="text-blue-700 dark:text-blue-300">ws://hostIp:1234</code>.</p>
        <p><strong class="text-zinc-900 dark:text-white">3. Team validation</strong> — Server verifies the joining client's team ID matches the host's. Mismatches are rejected with WebSocket close code 1008.</p>
        <p><strong class="text-zinc-900 dark:text-white">4. Workspace sync</strong> — Host broadcasts full workspace metadata (folder structure + file contents). Client creates local copies.</p>
        <p><strong class="text-zinc-900 dark:text-white">5. Live editing</strong> — Every keystroke synced via Yjs CRDT. Shared cursors show each user's position with a unique color and name label.</p>
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Cursor Colors</h3>
      <div class="flex flex-wrap gap-2 mb-6">
        {#each [
          { color: '#3b82f6', label: 'Blue' },
          { color: '#10b981', label: 'Green' },
          { color: '#f59e0b', label: 'Amber' },
          { color: '#ef4444', label: 'Red' },
          { color: '#8b5cf6', label: 'Violet' },
          { color: '#ec4899', label: 'Pink' },
          { color: '#06b6d4', label: 'Cyan' },
          { color: '#84cc16', label: 'Lime' },
        ] as { color, label }}
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-white/5 rounded-lg">
            <div class="w-3 h-3 rounded-full" style="background-color: {color}"></div>
            <span class="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
          </div>
        {/each}
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Network Interface Selection</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Sonar automatically prefers physical network adapters (Ethernet/Wi-Fi) over virtual ones. 
        Virtual adapters from Hyper-V, WSL, Docker, Tailscale, Hamachi, and VPN tunnels are deprioritized. 
        If no physical adapter exists, a virtual adapter IP is used as fallback, with <code class="text-blue-700 dark:text-blue-300">127.0.0.1</code> as last resort.
      </p>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Activity Monitoring -->
    <section id="activity-monitoring">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Activity size={22} class="text-blue-600 dark:text-blue-400" />
        Activity Monitoring
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        The monitoring system operates through a dual-layer architecture: the <strong>Main Process</strong> sends heartbeats every 15 seconds, 
        while the <strong>Renderer</strong> tracks local activity events and attaches them to each heartbeat before syncing to Appwrite.
      </p>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Tracked Events</h3>
      <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5 text-sm overflow-hidden mb-6">
        {#each [
          ['status_online / status_offline', 'Network connectivity transitions (HTTP-verified against Appwrite endpoint)'],
          ['app_focus / app_blur', 'Window focus state changes — detects when user leaves the IDE'],
          ['clipboard_copy', 'Copy events within the editor'],
          ['clipboard_paste_external', 'Paste from external source (clipboard content doesn\'t match last in-IDE copy)'],
          ['Active window title', 'OS-level detection of which app the user is currently in (macOS: osascript, Windows: Win32 API)'],
          ['Current file path', 'Which file the user has open in the editor at each heartbeat'],
        ] as [event, desc]}
          <div class="p-3 flex gap-4">
            <code class="text-blue-700 dark:text-blue-300 font-mono shrink-0 text-xs">{event}</code>
            <span class="text-zinc-600 dark:text-zinc-400 text-xs">{desc}</span>
          </div>
        {/each}
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Heartbeat Payload</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
        Every 15 seconds, the main process sends a heartbeat to the renderer containing:
      </p>
      <ul class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1 mb-6">
        <li>Team name and ID</li>
        <li>Current window title and active file path</li>
        <li>Online/offline status with ISO 8601 timestamp</li>
        <li>Extracted application name from window title</li>
        <li>Accumulated local activity events since last heartbeat</li>
      </ul>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Offline Resilience</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        If the network is unavailable, heartbeats are queued in <code class="text-blue-700 dark:text-blue-300">localStorage</code> under 
        <code class="text-blue-700 dark:text-blue-300">sonar_offline_queue</code>. On reconnect, all queued items are merged into a single 
        activity log row with an offline period summary (timestamps, duration, apps/files accessed while offline).
      </p>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Admin Dashboard -->
    <section id="admin-dashboard">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Book size={22} class="text-blue-600 dark:text-blue-400" />
        Admin Dashboard
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Users with <code class="text-blue-700 dark:text-blue-300">role: 'admin'</code> are routed to a dedicated monitoring dashboard 
        with real-time visibility into all active teams and their activity.
      </p>

      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div class="p-5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">Real-time Monitoring</h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Live team list with online/offline status</li>
            <li>Last seen timestamp and current window/file</li>
            <li>Heartbeat stale-check every 5 seconds (30s timeout)</li>
            <li>Realtime Appwrite subscriptions with 30s full-sync fallback</li>
          </ul>
        </div>
        <div class="p-5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">Activity Metrics</h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Total heartbeats, unique apps, files, and windows</li>
            <li>Online/offline duration tracking</li>
            <li>Clipboard copy count and external paste detection</li>
            <li>App blur events (suspected app switches)</li>
          </ul>
        </div>
        <div class="p-5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">Dashboard Views</h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Table mode (compact, columnar) and Grid mode (card-based)</li>
            <li>Sort by: Team Name, Status, or Last Seen</li>
            <li>Filter by: All, Online Only, or Offline Only</li>
            <li>Case-insensitive search by team name</li>
          </ul>
        </div>
        <div class="p-5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-2 text-sm">PDF Report Generation</h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>Per-team detailed reports via jsPDF</li>
            <li>Summary: total time, online %, disconnections, app switches</li>
            <li>Online/offline timeline with durations</li>
            <li>Suspicious app detection (browsers, chat, AI tools)</li>
          </ul>
        </div>
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">Global Dashboard Insights</h3>
      <ul class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5">
        <li>Online/offline user count with percentage breakdown</li>
        <li>Top 5 most-accessed external applications</li>
        <li>Recently active teams (within last 5 minutes)</li>
        <li>Estimated average session duration</li>
      </ul>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Local Preview -->
    <section id="local-preview">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Eye size={22} class="text-blue-600 dark:text-blue-400" />
        Local Preview
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        The integrated preview panel embeds a <code class="text-blue-700 dark:text-blue-300">&lt;webview&gt;</code> 
        restricted to <strong>localhost-only</strong> URLs. All non-localhost navigation is silently blocked, 
        preventing exam candidates from accessing external websites.
      </p>

      <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 p-5 mb-6">
        <h4 class="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">Navigation Controls</h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div class="flex items-center gap-2"><ArrowLeft size={14} class="text-blue-600 dark:text-blue-400" /> Back</div>
          <div class="flex items-center gap-2"><ArrowRight size={14} class="text-blue-600 dark:text-blue-400" /> Forward</div>
          <div class="flex items-center gap-2"><RefreshCw size={14} class="text-blue-600 dark:text-blue-400" /> Refresh</div>
          <div class="flex items-center gap-2"><Home size={14} class="text-blue-600 dark:text-blue-400" /> Home</div>
        </div>
      </div>

      <ul class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5">
        <li>Embedded Express server starts from port 3500 (auto-finds free port)</li>
        <li>Serves static files from workspace with no-cache headers</li>
        <li>Follow File mode: auto-navigates to the active <code class="text-blue-700 dark:text-blue-300">.html</code> file</li>
        <li>Hot reload: refreshes preview on every file save (toggleable)</li>
        <li>Console capture: intercepts log, warn, error from the loaded page (last 500 entries)</li>
        <li>Inspector button opens DevTools for the webview</li>
        <li>Supports: HTML, CSS, JS, images, fonts, media, PDFs</li>
      </ul>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Search -->
    <section id="search">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Search size={22} class="text-blue-600 dark:text-blue-400" />
        Search
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        Full-text search across the entire workspace with 400ms debounce. Results are grouped by file, 
        with click-to-navigate jumping directly to the matching line in the editor.
      </p>
      <ul class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5">
        <li><strong>Match Case (Aa)</strong> — Toggle case-sensitive matching</li>
        <li><strong>Whole Word (ab)</strong> — Match only complete words using regex word boundaries</li>
        <li>Results show file path, line number, and highlighted text preview</li>
        <li>Expandable file groups for navigating large result sets</li>
        <li>Skips binary files, node_modules, and dotfiles automatically</li>
      </ul>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Settings -->
    <section id="settings">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Settings size={22} class="text-blue-600 dark:text-blue-400" />
        Settings
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The settings modal provides six tabs for customizing the IDE experience. All settings persist 
        to <code class="text-blue-700 dark:text-blue-300">localStorage</code> (prefixed with <code class="text-blue-700 dark:text-blue-300">ide-</code>).
      </p>

      <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5 text-sm overflow-hidden">
        {#each [
          ['Text Editor', 'Auto-Save (500ms debounce), Hot Reload (refresh preview on save), Word Wrap toggle'],
          ['Appearance', 'Theme: Light, Dark, or System (respects OS preference on load)'],
          ['Collaboration', 'Show collaborator usernames toggle, username opacity slider (0-100%)'],
          ['Account', 'View team name, list team members (student IDs), add members (max 5)'],
          ['Activity Log', 'View event timeline, export as color-coded PDF with suspicious activity flags'],
          ['Security', 'Change team password (requires current password verification)'],
        ] as [tab, desc]}
          <div class="p-4">
            <h4 class="font-semibold text-zinc-900 dark:text-white mb-1">{tab}</h4>
            <p class="text-zinc-600 dark:text-zinc-400 text-xs">{desc}</p>
          </div>
        {/each}
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Security Model -->
    <section id="security-model">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Shield size={22} class="text-blue-600 dark:text-blue-400" />
        Security Model
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Sonar enforces multiple layers of security to maintain academic integrity during exams.
      </p>

      <div class="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-1">Team-Based Authentication</h4>
          <p>Users authenticate with Team Name + Password via Appwrite. Offline fallback uses locally cached credentials with a simple hash. Role-based routing sends <code class="text-blue-700 dark:text-blue-300">admin</code> users to the dashboard and <code class="text-blue-700 dark:text-blue-300">team</code> users to the IDE.</p>
        </div>
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-1">macOS Automation Permission</h4>
          <p>On macOS, Sonar requires Automation/System Events permission at startup to monitor application switching. The app blocks until this permission is granted, preventing unmonitored exam sessions.</p>
        </div>
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-1">Input Sanitization</h4>
          <p>File names reject characters <code class="text-blue-700 dark:text-blue-300">&lt;&gt;:"|?*</code> and reserved names (<code class="text-blue-700 dark:text-blue-300">.</code>, <code class="text-blue-700 dark:text-blue-300">..</code>). Path traversal is prevented by normalizing and validating all paths stay within the workspace root.</p>
        </div>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Preview Lockdown -->
    <section id="preview-lockdown">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Lock size={22} class="text-blue-600 dark:text-blue-400" />
        Preview Lockdown
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The <code class="text-blue-700 dark:text-blue-300">&lt;webview&gt;</code> element intercepts all navigation requests and 
        validates them against a strict localhost-only policy:
      </p>
      <ul class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5 mb-4">
        <li>Only <code class="text-blue-700 dark:text-blue-300">localhost:*</code> and <code class="text-blue-700 dark:text-blue-300">127.0.0.1:*</code> URLs are permitted</li>
        <li>Non-localhost URLs are silently ignored (redirected to server root)</li>
        <li>URL bar input auto-prepends <code class="text-blue-700 dark:text-blue-300">http://</code> for bare localhost entries</li>
        <li>All responses include <code class="text-blue-700 dark:text-blue-300">Cache-Control: no-cache</code> headers</li>
      </ul>
      <p class="text-sm text-zinc-500 dark:text-zinc-500">
        This ensures exam candidates cannot browse the web, access external APIs, or open any online resources 
        from within the IDE.
      </p>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- File System Sandbox -->
    <section id="filesystem-sandbox">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <HardDrive size={22} class="text-blue-600 dark:text-blue-400" />
        File System Sandbox
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-4">
        The Renderer process has <strong>zero direct access</strong> to the file system. All operations go through the 
        Context Bridge → IPC → Main Process pipeline:
      </p>
      <ul class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5">
        <li>Binary files detected by scanning first 8KB for NULL bytes — prevents garbled data in the editor</li>
        <li>File operations are idempotent: delete/rename treat "already done" as success (collaboration race-condition safety)</li>
        <li>Parent directories are auto-created when writing files (prevents errors during workspace sync)</li>
        <li>Dotfiles (<code class="text-blue-700 dark:text-blue-300">.git</code>, <code class="text-blue-700 dark:text-blue-300">.env</code>) and <code class="text-blue-700 dark:text-blue-300">node_modules</code> are excluded from directory listings</li>
        <li>Case-only renames on Windows use a two-step temp-file strategy</li>
      </ul>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Tech Stack -->
    <section id="tech-stack">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <Database size={22} class="text-blue-600 dark:text-blue-400" />
        Tech Stack
      </h2>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="p-5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">Frontend (Renderer)</h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 font-mono">
            <li>react ^18.2.0</li>
            <li>@monaco-editor/react ^4.6.0</li>
            <li>yjs ^13.6.29</li>
            <li>y-monaco ^0.1.6</li>
            <li>y-websocket ^3.0.0</li>
            <li>react-router-dom ^6.22.0</li>
            <li>react-resizable-panels ^2.0.19</li>
            <li>lucide-react ^0.577.0</li>
            <li>appwrite ^16.0.0</li>
            <li>jspdf ^2.5.1</li>
          </ul>
        </div>
        <div class="p-5 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
          <h4 class="font-semibold text-zinc-900 dark:text-white mb-3 text-sm">Desktop & Build</h4>
          <ul class="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 font-mono">
            <li>electron ^28.3.3</li>
            <li>electron-builder ^24.9.1</li>
            <li>electron-store ^8.1.0</li>
            <li>ws ^8.19.0</li>
            <li>typescript ^5.3.3</li>
            <li>vite ^5.0.11</li>
            <li>@vitejs/plugin-react ^4.2.1</li>
            <li>concurrently ^8.2.2</li>
          </ul>
        </div>
      </div>
    </section>

    <hr class="border-zinc-200 dark:border-white/10" />

    <!-- Changelog -->
    <section id="changelog">
      <h2 class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3">
        <FileText size={22} class="text-blue-600 dark:text-blue-400" />
        Changelog
      </h2>

      <div class="bg-zinc-50 dark:bg-white/[0.02] rounded-xl border border-zinc-200 dark:border-white/5 p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">v1.0.0-beta</span>
          <span class="text-zinc-500 dark:text-zinc-500 text-sm">Initial Beta Release</span>
        </div>
        <ul class="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
          <li>Real-time collaborative code editing powered by Monaco Editor and Yjs</li>
          <li>Secure Admin dashboard for user monitoring and activity tracking</li>
          <li>Custom File Tree navigation and multi-document tabs handling</li>
          <li>Integrated Preview Panel restricted to localhost domains only</li>
          <li>Context Bridge secure IPC between Main and Renderer processes</li>
          <li>Appwrite authentication and cloud synchronization integration</li>
          <li>Offline behavior logging with PDF generation via jsPDF</li>
          <li>WebSocket-based P2P file sharing and workspace synchronization</li>
          <li>Activity event tracking: online/offline, app focus/blur, clipboard operations</li>
          <li>Support for 100+ programming languages via Monaco Editor</li>
          <li>Cross-platform compatibility: Windows, macOS, Linux with native installers</li>
        </ul>
      </div>
    </section>

    <!-- Reporting Vulnerabilities -->
    <div class="mt-16 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-600/10 dark:to-cyan-600/10 border border-blue-200 dark:border-blue-500/20 transition-colors duration-200">
      <h3 class="font-bold text-zinc-900 dark:text-white mb-2">Reporting Security Vulnerabilities</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Security issues should <strong>not</strong> be reported as public GitHub issues. 
        Please email <code class="text-blue-700 dark:text-blue-300">hello@brainvave.com</code> with a detailed disclosure. 
        See <a href="https://github.com/rkvishwa/Sonar-Code-Editor/blob/main/SECURITY.md" target="_blank" rel="noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">SECURITY.md</a> for the full policy.
      </p>
    </div>

  </main>
</div>