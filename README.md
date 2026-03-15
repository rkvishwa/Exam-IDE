<div align="center">
  <img src="assets/win_icon.png" alt="Sonar Code Editor Logo" width="128" height="128" />
  <h1>🌊 Sonar Code Editor & Monitoring System</h1>
  <p>A modern, real-time collaborative code editor built for teams, featuring advanced monitoring, file management, and powerful developer tools.</p>
  
  <p>
    <img src="https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white" alt="Electron" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Appwrite-F02E65?style=for-the-badge&logo=Appwrite&logoColor=white" alt="Appwrite" />
  </p>
</div>

---

## 🚀 Download Beta Release

### <img src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Mac Logo" align="absmiddle" /> (Recommended)
You can easily install the beta version using Homebrew:
```bash
brew install --cask rkvishwa/knurdz/sonar-code-editor
```

**Alternative: Manual Download**  
You can also download the latest `.dmg` file directly from our [GitHub Releases](https://github.com/rkvishwa/Sonar-Code-Editor/releases) page.
[Download Mac Beta (.dmg)](https://github.com/rkvishwa/Sonar-Code-Editor/releases/download/v1.0.0-beta.4/Sonar.Code.Editor-1.0.0-beta.4-arm64.dmg)

> **Note on Mac Installation:** If you manually download the `.dmg`, macOS Gatekeeper may flag the app as damaged or from an unidentified developer because it is not yet signed in the beta phase.
> 
> **To bypass and install:** Open your terminal and run the following command on the extracted app file:
> ```bash
> sudo xattr -rd com.apple.quarantine /Applications/Sonar\ Code\ Editor.app
> ```

### <img src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows Logo" align="absmiddle" />
You can download the latest `.exe` file directly from our [GitHub Releases](https://github.com/rkvishwa/Sonar-Code-Editor/releases) page.
[Download Windows Beta (.exe)](https://github.com/rkvishwa/Sonar-Code-Editor/releases/download/v1.0.0-beta.4/Sonar.Code.Editor.Setup.1.0.0-beta.4.exe)

> **Note on Windows Installation:** The stable version for Windows will be officially released on the Microsoft Store. Since this beta version `.exe` is not yet signed, Windows SmartScreen may show an "Untrusted" or "Windows protected your PC" prompt. 
> 
> **To bypass and install:** Click on **"More info"** and then select **"Run anyway"**.

### 🐛 Known Issues in beta version 4
If you encounter any bugs or want to see what's currently being worked on, check out our [Known Issues](https://github.com/rkvishwa/Sonar-Code-Editor/issues).

---

## 📖 Overview

**Sonar Code Editor** is a feature-rich desktop IDE built with Electron, React, and Vite. It leverages the robust Monaco Editor for a VS Code-like coding experience and integrates real-time collaboration using Yjs and WebSockets. Beyond standard editing, Sonar includes an administrative monitoring system, activity logging, and report generation, making it ideal for supervised coding environments, pair programming, and educational settings.

## ✨ Key Features

- **💡 Advanced Code Editing**
  - Powered by **Monaco Editor** (the engine behind VS Code).
  - Syntax highlighting, auto-completion, and code formatting.
  - **Custom Tabs** for managing multiple open documents seamlessly.

- **🤝 Real-time Collaboration**
  - Seamless, Google Docs-style real-time typing using **Yjs** and **y-monaco**.
  - Collaborative cursors and shared document states.

- **🛡️ Administration & User Capabilities**
  - **Admin Abilities**: Built-in Admin Dashboard to manage environment settings, monitor real-time user activities, and govern access.
  - **User Abilities**: Dedicated coding environment with secure login, file management, and real-time collaboration.
  - Detailed **Activity Logging** tracking user actions and events.
  - Generates comprehensive PDF reports via **jsPDF**.
  - **File Tree Key Shield** functionality to control access and secure environments.

- **📁 Interactive Workspace**
  - **Custom File Tree** visual explorer for localized workspace navigation.
  - Resizable panels (Editor, Preview, Sidebar) via `react-resizable-panels`.

- **🌐 Secure Preview Panel**
  - Integrated **Preview Panel & Preview Tab** to view live runtime environments.
  - Built-in security restriction: the preview can only load `localhost` URLs on any port (defaults to port `5173`), preventing arbitrary external browsing inside the IDE.

- **🔐 Cloud & Authentication**
  - Integrated **Appwrite** backend for secure authentication, database, and real-time events.
  - Robust offline support and network connectivity tracking (`is-online`).

## 🛠️ Tech Stack

### Frontend (Renderer)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **Routing**: React Router DOM (v6)
- **Styling**: Standard CSS with Radix UI Colors & Lucide React icons
- **Collaboration**: Yjs, y-monaco, y-websocket

### Backend / Desktop Core
- **Desktop Framework**: Electron
- **Inter-Process Communication (IPC)**: Context Bridge (Preload scripts)
- **Local Storage**: `electron-store`
- **BaaS (Backend as a Service)**: Appwrite

##  Getting Started

*Application download links and website information will be updated here in the future. Stay tuned!*

## 👥 Contributors

A huge thank you to everyone who has contributed to the Sonar Code Editor project:

| | | | Commits |
| :---: | :--- | :--- | :---: |
| <img src="https://github.com/rkvishwa.png?size=40" width="40" style="border-radius: 50%; margin-top: 15px;" /> | **RKK Vishva Kumar** | [@rkvishwa](https://github.com/rkvishwa) | 182 |
| <img src="https://github.com/Kasun-Kumara.png?size=40" width="40" style="border-radius: 50%;" /> | **Kasun Kumara** | [@Kasun-Kumara](https://github.com/Kasun-Kumara) | 43 |
| <img src="https://github.com/SadeepaNHerath.png?size=40" width="40" style="border-radius: 50%;" /> | **Sadeepa N. Herath** | [@SadeepaNHerath](https://github.com/SadeepaNHerath) | 33 |
| <img src="https://github.com/harshasilva.png?size=40" width="40" style="border-radius: 50%;" /> | **Harsha Silva** | [@harshasilva](https://github.com/harshasilva) | 9 |
| <img src="https://github.com/Senuka-Deneth.png?size=40" width="40" style="border-radius: 50%;" /> | **Senuka Deneth** | [@Senuka-Deneth](https://github.com/Senuka-Deneth) | 4 |
| <img src="https://github.com/Praveen-R-2518.png?size=40" width="40" style="border-radius: 50%;" /> | **Praveen Ramanathan** | [@Praveen-R-2518](https://github.com/Praveen-R-2518) | 2 |
| <img src="https://github.com/Thesaru-p.png?size=40" width="40" style="border-radius: 50%;" /> | **Thesaru P** | [@Thesaru-p](https://github.com/Thesaru-p) | 2 |

## 📜 License

This project is licensed under the **MIT License**.
