import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { IpcMain, Dialog, webContents, BrowserView, BrowserWindow, clipboard, shell } from 'electron';
import { FileNode } from '../shared/types';
import { IPC_CHANNELS } from '../shared/constants';
import { startStaticServer, stopStaticServer, getServerUrl } from './staticServer';

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function readDirectoryRecursive(dirPath: string, deep = false): FileNode[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          type: 'directory' as const,
          path: fullPath,
          children: deep ? readDirectoryRecursive(fullPath) : [],
        };
      } else {
        return {
          name: entry.name,
          type: 'file' as const,
          path: fullPath,
          extension: getExtension(entry.name),
        };
      }
    })
    .sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
}

function searchFilesRecursive(dirPath: string, query: string, results: any[]) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        searchFilesRecursive(fullPath, query, results);
      } else {
        const ext = getExtension(entry.name);
        if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) continue;
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query.toLowerCase())) {
              results.push({
                path: fullPath,
                name: entry.name,
                line: i + 1,
                text: lines[i].trim()
              });
            }
          }
        } catch (e) {
          // ignore read errors
        }
      }
    }
  } catch (e) {
    // ignore dir errors
  }
}

export function registerFsHandlers(ipcMain: IpcMain, dialog: Dialog): void {
  ipcMain.handle(IPC_CHANNELS.FS_READ_DIR, async (_event, dirPath: string) => {
    try {
      return readDirectoryRecursive(dirPath);
    } catch (err) {
      throw new Error(`Failed to read directory: ${(err as Error).message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, async (_event, filePath: string) => {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to read file: ${(err as Error).message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_READ_FILE_BASE64, async (_event, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase().slice(1);
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml',
        webp: 'image/webp', ico: 'image/x-icon',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (err) {
      throw new Error(`Failed to read file as base64: ${(err as Error).message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_WRITE_FILE, async (_event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to write file: ${(err as Error).message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_CREATE_FILE, async (_event, filePath: string) => {
    try {
      // Ensure parent directory exists (important for cross-platform collaboration sync)
      const parentDir = path.dirname(filePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(filePath, '', 'utf-8');
    } catch (err) {
      throw new Error(`Failed to create file: ${(err as Error).message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_CREATE_FOLDER, async (_event, folderPath: string) => {
    try {
      fs.mkdirSync(folderPath, { recursive: true });
    } catch (err) {
      throw new Error(`Failed to create folder: ${(err as Error).message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_DELETE_ITEM, async (_event, itemPath: string) => {
    try {
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(itemPath);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw new Error(`Failed to delete item: ${(err as Error).message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_RENAME_ITEM, async (_event, oldPath: string, newPath: string) => {
    try {
      // Ensure target parent directory exists (important for cross-platform collaboration sync)
      const targetDir = path.dirname(newPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Detect case-only rename (e.g. File.txt → file.txt).  On case-insensitive
      // file systems (Windows, default macOS) fs.renameSync silently succeeds but
      // may not actually change the on-disk name.  Use a two-step rename via a
      // temporary name to force the change.
      const oldBase = path.basename(oldPath);
      const newBase = path.basename(newPath);
      const isCaseOnlyRename =
        oldBase !== newBase && oldBase.toLowerCase() === newBase.toLowerCase();

      if (isCaseOnlyRename) {
        const tmpPath = oldPath + '.__rename_tmp__';
        fs.renameSync(oldPath, tmpPath);
        fs.renameSync(tmpPath, newPath);
      } else {
        fs.renameSync(oldPath, newPath);
      }
    } catch (err) {
      throw new Error(`Failed to rename item: ${(err as Error).message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_SEARCH, async (_event, dirPath: string, query: string) => {
    const results: any[] = [];
    if (!dirPath || !query) return results;
    searchFilesRecursive(dirPath, query, results);
    return results;
  });

  ipcMain.handle(IPC_CHANNELS.FS_OPEN_FOLDER_DIALOG, async (event) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender);
    try {
      const result = await dialog.showOpenDialog(win!, {
        properties: ['openDirectory'],
        title: 'Open Folder',
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return { path: result.filePaths[0], isDirectory: true };
    } catch (err) {
      throw new Error(`Failed to open folder dialog: ${(err as Error).message}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_OPEN_FILE_DIALOG, async (event) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender);
    try {
      const result = await dialog.showOpenDialog(win!, {
        properties: ['openFile'],
        title: 'Open File',
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      const selectedPath = result.filePaths[0];
      return { path: selectedPath, isDirectory: false, parentPath: path.dirname(selectedPath), name: path.basename(selectedPath) };
    } catch (err) {
      throw new Error(`Failed to open file dialog: ${(err as Error).message}`);
    }
  });

  // Static server handlers
  ipcMain.handle(IPC_CHANNELS.SERVER_START, async (_event, rootDir: string) => {
    const port = await startStaticServer(rootDir);
    return port;
  });

  ipcMain.handle(IPC_CHANNELS.SERVER_STOP, async () => {
    await stopStaticServer();
  });

  ipcMain.handle(IPC_CHANNELS.SERVER_GET_URL, async () => {
    return getServerUrl();
  });

  // DevTools docking handlers using BrowserView
  let devtoolsView: BrowserView | null = null;

  ipcMain.handle(IPC_CHANNELS.DEVTOOLS_OPEN, async (event, previewId: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const previewContents = webContents.fromId(previewId);
    if (!previewContents) return;

    // Clean up existing
    if (devtoolsView) {
      try {
        win.removeBrowserView(devtoolsView);
        devtoolsView.webContents.close();
      } catch {}
      devtoolsView = null;
    }

    devtoolsView = new BrowserView();
    win.addBrowserView(devtoolsView);
    devtoolsView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    previewContents.setDevToolsWebContents(devtoolsView.webContents);
    previewContents.openDevTools();
  });

  ipcMain.handle(IPC_CHANNELS.DEVTOOLS_CLOSE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !devtoolsView) return;
    try {
      win.removeBrowserView(devtoolsView);
      devtoolsView.webContents.close();
    } catch {}
    devtoolsView = null;
  });

  ipcMain.handle(IPC_CHANNELS.DEVTOOLS_RESIZE, async (_event, bounds: { x: number; y: number; width: number; height: number }) => {
    if (!devtoolsView) return;
    devtoolsView.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    });
  });

  // Active window title detection
  // Returns null if the active window is the app itself (any of its windows)
  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_WINDOW, async (event) => {
    try {
      const platform = process.platform;
      let title = '';

      // Check if any of the app's own windows are focused
      const allWindows = BrowserWindow.getAllWindows();
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      const anyOwnWindowFocused = allWindows.some(w => w.isFocused());
      // Also check if the sender window itself is focused (covers iframe/webview focus changes)
      if (anyOwnWindowFocused || (senderWindow && senderWindow.isFocused())) {
        return null; // It's our own app, not an external switch
      }

      if (platform === 'win32') {
        // PowerShell: get foreground window title
        const cmd = 'powershell -NoProfile -Command "(Add-Type -MemberDefinition \'[DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\\"user32.dll\\\", CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);\' -Name Win32 -Namespace Native -PassThru)| Out-Null; $h=[Native.Win32]::GetForegroundWindow(); $sb=New-Object System.Text.StringBuilder 256; [Native.Win32]::GetWindowText($h,$sb,256)|Out-Null; $sb.ToString()"';
        title = execSync(cmd, { timeout: 3000, encoding: 'utf-8' }).trim();
      } else if (platform === 'darwin') {
        // Use NSWorkspace via JXA to get the localized app name and bundle ID.
        // AppleScript's `name of application process` returns the process name
        // which is "Electron" for all Electron-based apps (VS Code, etc.),
        // making them indistinguishable. NSWorkspace gives the proper display
        // name (e.g. "Visual Studio Code") and a unique bundle identifier.
        const OWN_BUNDLE_ID = 'com.sonar.editor';
        const info = execSync(
          `osascript -l JavaScript -e 'ObjC.import("AppKit"); var ws = $.NSWorkspace.sharedWorkspace; var app = ws.frontmostApplication; (app.bundleIdentifier.js) + "||" + (app.localizedName.js)'`,
          { timeout: 3000, encoding: 'utf-8' }
        ).trim();

        const separatorIdx = info.indexOf('||');
        const bundleId = separatorIdx >= 0 ? info.substring(0, separatorIdx) : '';
        const appName = separatorIdx >= 0 ? info.substring(separatorIdx + 2) : info;

        // Filter out our own app reliably by bundle identifier
        if (bundleId === OWN_BUNDLE_ID) {
          return null;
        }

        title = appName;
      } else {
        // Linux
        title = execSync('xdotool getactivewindow getwindowname 2>/dev/null || echo ""', {
          timeout: 3000, encoding: 'utf-8'
        }).trim();
      }

      // Non-macOS: fallback filter by comparing with own window titles
      if (platform !== 'darwin') {
        const ownTitles = allWindows.map(w => w.getTitle()).filter(Boolean);
        if (ownTitles.some(ownTitle => title === ownTitle || title.includes(ownTitle) || ownTitle.includes(title))) {
          return null;
        }
      }

      return title || null;
    } catch {
      return null;
    }
  });

  // Clipboard read
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_READ_TEXT, async () => {
    return clipboard.readText();
  });

  // Permission check: returns true if Automation/System Events access is granted on macOS
  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK_PERMISSION, async (): Promise<boolean> => {
    if (process.platform !== 'darwin') return true;
    return new Promise((resolve) => {
      try {
        // Must query a protected resource to actually exercise the Automation
        // permission. A simple `return "ok"` succeeds without permission.
        execSync(
          'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'',
          { timeout: 5000, encoding: 'utf-8' }
        );
        resolve(true);
      } catch (err: unknown) {
        const msg = String((err as Error).message || '');
        if (
          msg.includes('Not authorized') ||
          msg.includes('1743') ||
          msg.includes('not allowed to send Apple events') ||
          msg.includes('errAEEventNotPermitted') ||
          msg.includes('not allowed assistive access')
        ) {
          resolve(false);
        } else {
          resolve(true);
        }
      }
    });
  });

  // Open macOS Privacy & Security → Automation settings
  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_PREFS, async () => {
    if (process.platform === 'darwin') {
      await shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'
      );
    }
  });
}
