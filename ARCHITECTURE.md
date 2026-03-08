# 🏛️ Architecture Overview

**Sonar Code Editor** is a desktop application built with web technologies. It is structured to ensure high performance, secure offline capabilities, and seamless real-time collaboration.

## 🧱 Core Technologies

- **Electron**: Provides the desktop runtime shell, interacting with OS-level APIs (file system, window management).
- **Vite & React**: Drives the frontend UI (Renderer process) for a snappy development experience.
- **Monaco Editor**: The underlying editor engine (same as VS Code) providing syntax highlighting and intellisense.
- **Yjs**: Enables real-time, peer-to-peer style collaborative editing through CRDTs (Conflict-free Replicated Data Types).
- **Appwrite**: Handles backend services including secure authentication, database, and real-time events.

## 🔄 Process Model

Sonar utilizes Electron's multi-process architecture:

1. **Main Process (`src/main/`)**:
   - Manages application lifecycle and native OS interactions.
   - Handles the file system (opening/saving projects).
   - Manages the **Key Shield** security features and background activity monitoring logs for exam environments.

2. **Preload Script (`src/preload/`)**:
   - Acts as a secure Context Bridge between Main and Renderer.
   - Exposes safe, explicit APIs (`window.electronAPI`) rather than allowing full Node.js access in the UI.

3. **Renderer Process (`src/renderer/`)**:
   - The React application.
   - Manages UI state, editor contexts, the file tree panel, tabs, and the localhost-restricted preview panel.

## 🤝 Collaborative Editing

Real-time collaboration is achieved via `y-monaco` and `y-websocket`. When a session is initiated, a WebSocket room is created, allowing multiple clients to sync cursor positions, selections, and document changes simultaneously without overriding each other's work.

## 🛡️ Security & Monitoring Isolation

To serve its primary use case in **Exam Environments**:
- **Preview Restriction**: The preview panel is an isolated webview that strictly intercepts and blocks non-`localhost` traffic to prevent external web browsing.
- **Event Tracking**: User keystrokes, window focus changes, and copy/paste actions are handled globally and stored locally via `electron-store`, which can be exported asynchronously via `jsPDF`.