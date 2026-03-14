# 🛠️ Development & Setup Guide

Welcome to the development guide for **Sonar Code Editor**. This document covers how to set up your local development environment, build the application, and package it for distribution.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: `v18.x` or higher
- **NPM**: `v9.x` or higher
- **Git**

## 🚀 Local Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/rkvishwa/Sonar-Code-Editor.git
   cd Sonar-Code-Editor
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Create a `.env` file in the root directory.
   - Configure your **Appwrite** endpoint, project ID, and other required keys required for authentication and real-time database syncing.

## 💻 Running in Development

To start the application with hot-reloading for both the Vite React renderer and the Electron wrapper:

```bash
npm run start
```

_This utilizes `concurrently` to run the Vite dev server, TypeScript compiler for the main process, and the Electron executable simultaneously._

## 📂 Project Structure

```text
├── assets/                   # App icons and static graphical assets
├── build/                    # Electron builder output rules and assets
├── release/                  # Compiled executable applications (generated)
├── src/
│   ├── main/                 # Electron main process source
│   │   ├── main.ts           # App lifecycle & window management
│   │   ├── ipcHandlers.ts    # Secure IPC communication handlers
│   │   ├── monitoring.ts     # System monitoring & activity tracking
│   │   └── ...
│   ├── preload/              # Electron context bridge scripts
│   │   └── preload.ts
│   ├── renderer/             # React frontend source
│   │   ├── components/       # Reusable UI (Editor, Sidebar, FileTree, AdminPanel)
│   │   ├── context/          # React Contexts (Auth, Collaboration)
│   │   ├── hooks/            # Custom Hooks (Network status, Activity)
│   │   ├── pages/            # Main Views (IDE, Login, Admin Dashboard)
│   │   ├── services/         # Appwrite, localStore, PDF reporting
│   │   ├── styles/           # Global CSS definitions
│   │   ├── types/            # TypeScript declaration files
│   │   └── App.tsx
│   └── shared/               # Shared types and constants (main ↔ renderer)
├── appwrite.config.json      # Appwrite Collection schema definitions
├── package.json              # Dependencies & scripts
└── vite.renderer.config.ts   # Vite configuration for the renderer UI
```

## 📦 Building & Packaging

To compile the application for production and package it into distributable executables:

```bash
# 1. Build the React renderer, Main process, and Preload scripts
npm run build

# 2. Package for your specific OS
npm run package:win    # For Windows (.exe)
npm run package:mac    # For macOS (.dmg, .app)
npm run package:linux  # For Linux (.AppImage)
```

_Compiled artifacts will be located in the `release/` directory._
