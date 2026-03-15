import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

// Global undo stack for file tree operations
export const fileUndoStack: Array<{ 
  originalPath: string; 
  trashPath: string; 
  type: "file" | "directory"; 
  onRestored: () => void; 
}> = [];

if (typeof window !== "undefined") {
  window.addEventListener("keydown", async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      const activeEl = document.activeElement;
      if (activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA" || activeEl?.closest('.monaco-editor')) {
         return; 
      }
      
      const lastOp = fileUndoStack.pop();
      if (lastOp) {
        try {
          await window.electronAPI.fs.renameItem(lastOp.trashPath, lastOp.originalPath);
          lastOp.onRestored();
        } catch (err) {
          console.error("Failed to restore item:", err);
          fileUndoStack.push(lastOp); // put it back if failed
        }
      }
    }
  });
}

import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  FileCode2,
  FileJson,
  FileText,
  FileImage,
  Terminal,
  Database,
  ShieldAlert,
  FilePlus2,
  FolderPlus,
  Braces,
  Code2,
  Palette,
} from "lucide-react";
import { FileNode } from "../../../shared/types";
import { fileTreeInputCallbacks } from "../../fileTreeKeyShield";
import "./FileTree.css";

// Track global mouse interaction to distinguish programmatic focus steals from user clicks
let isUserClicking = false;
if (typeof window !== "undefined") {
  window.addEventListener("mousedown", () => { isUserClicking = true; }, true);
  window.addEventListener("mouseup", () => { isUserClicking = false; }, true);
  window.addEventListener("keydown", () => { isUserClicking = true; }, true);
  window.addEventListener("keyup", () => { isUserClicking = false; }, true);
}
const isWindows = navigator.userAgent.toLowerCase().includes("win");
const INDENT_PX = isWindows ? 16 : 28;

function getIcon(node: FileNode) {
  if (node.type === "directory")
    return <Folder size={14} color="var(--accent)" />;

  const ext = node.extension || "";
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return <Braces size={14} color="#eab308" />;
    case "json":
      return <FileJson size={14} color="#22c55e" />;
    case "html":
      return <Code2 size={14} color="#ef4444" />;
    case "css":
      return <Palette size={14} color="var(--accent)" />;
    case "md":
      return <FileText size={14} color="#a1a1aa" />;
    case "png":
    case "jpg":
    case "svg":
      return <FileImage size={14} color="#8b5cf6" />;
    case "sh":
    case "bash":
      return <Terminal size={14} color="#10b981" />;
    case "php":
      return <FileCode2 size={14} color="#7b7fb5" />;
    case "sql":
      return <Database size={14} color="#f97316" />;
    case "env":
      return <ShieldAlert size={14} color="#eab308" />;
    default:
      return <File size={14} color="var(--text-muted)" />;
  }
}

interface CreatingItem {
  type: "file" | "folder";
  parentPath: string;
}

interface InlineCreateInputProps {
  type: "file" | "folder";
  depth: number;
  hasFolders: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

function InlineCreateInput({
  type,
  depth,
  hasFolders,
  onSubmit,
  onCancel,
}: InlineCreateInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep latest callbacks in refs so the debounced blur always calls the
  // current versions (parent re-renders may swap identities).
  const onSubmitRef = useRef(onSubmit);
  const onCancelRef = useRef(onCancel);
  onSubmitRef.current = onSubmit;
  onCancelRef.current = onCancel;

  useEffect(() => {
    // Initial focus with multiple strategies for reliability across platforms
    const el = inputRef.current;
    if (el) el.focus();
    const rafId = requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Register native-level Enter / Escape callbacks so the global window
  // capture listener can invoke them (React handlers are dead by that point).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    fileTreeInputCallbacks.set(el, {
      onSubmit: () => {
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
        handleSubmit();
      },
      onCancel: () => {
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
        onCancelRef.current();
      },
    });
    return () => { fileTreeInputCallbacks.delete(el); };
  });

  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    // Guard against double-submit (blur can fire after Enter)
    if (submittedRef.current) return;
    if (value.trim()) {
      submittedRef.current = true;
      onSubmitRef.current(value.trim());
    } else {
      onCancelRef.current();
    }
  }, [value]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // If the blur was caused by the user physically clicking away, we want to submit.
    // If Monaco steals focus programmatically, we DO NOT submit and optionally restore focus.
    const userClickedAway = isUserClicking;
    const relatedTarget = e.relatedTarget as Element | null;
    const wentToMonaco = relatedTarget && !!relatedTarget.closest('.monaco-editor');
    const wentToBody = relatedTarget === document.body || !relatedTarget;

    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      if (document.activeElement === inputRef.current) return;
      
      if (!userClickedAway && (wentToMonaco || wentToBody)) {
        // This was a programmatic focus steal (e.g., y-monaco merging edits).
        // Safely put focus back without aggressive capture loops that crash React.
        inputRef.current?.focus();
        return; 
      }
      
      handleSubmit();
    }, 300);
  }, [handleSubmit]);

  const handleFocus = useCallback(() => {
    // Cancel any pending blur-triggered cancel/submit.
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  return (
    <div
      className="tree-node inline-create"
      style={{ paddingLeft: `${depth * INDENT_PX + 8}px` }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {hasFolders ? (
        <span className="expand-icon"></span>
      ) : (
        <span className="expand-icon expand-icon-empty"></span>
      )}
      <span className="file-icon">
        {type === "folder" ? (
          <Folder size={14} color="var(--accent)" />
        ) : (
          <File size={14} />
        )}
      </span>
      <input
        ref={inputRef}
        className="inline-create-input"
        title="Create item"
        value={value}
        placeholder={type === "folder" ? "Folder name" : "File name"}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  hasFolders: boolean;
  activeFilePath: string | null;
  onFileClick: (path: string, name: string) => void;
  onRefresh: () => void;
  workspaceRoot: string;
  creatingItem: CreatingItem | null;
  onSetCreating: (item: CreatingItem | null) => void;
  selectedFolder: string | null;
  onSelectFolder: (path: string) => void;
  onFileOpened: (path: string, name: string, isPreview?: boolean) => void;
  onFileDeleted: (path: string, type: "file" | "directory") => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileCreated?: (path: string, name: string, savedContent?: string, isUndo?: boolean) => void;
  onFolderCreated?: (path: string) => void;
}

function FileTreeNode({
  node,
  depth,
  hasFolders,
  activeFilePath,
  onFileClick,
  onRefresh,
  workspaceRoot,
  creatingItem,
  onSetCreating,
  selectedFolder,
  onSelectFolder,
  onFileOpened,
  onFileDeleted,
  onFileRenamed,
  onFileCreated,
  onFolderCreated,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[]>(node.children || []);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChildFolders = children.some((c) => c.type === "directory");

  const isCreatingHere =
    creatingItem &&
    creatingItem.parentPath === node.path &&
    node.type === "directory";

  const loadChildren = useCallback(async () => {
    if (node.type === "directory") {
      try {
        const items = await window.electronAPI.fs.readDirectory(node.path);
        setChildren(items);
      } catch (err) {
        // Directory may have been renamed/deleted by a collaboration peer.
        // Silently return stale children instead of crashing.
        console.warn('loadChildren failed (collab race?):', err);
      }
    }
  }, [node]);

  useEffect(() => {
    if (isCreatingHere && !expanded) {
      setExpanded(true);
      loadChildren();
    }
  }, [isCreatingHere, expanded, loadChildren]);

  const toggleExpanded = async () => {
    if (node.type !== "directory") return;
    if (!expanded) await loadChildren();
    setExpanded((v) => !v);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent("close-context-menus"));
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleNewFile = () => {
    closeContextMenu();
    const dirPath =
      node.type === "directory"
        ? node.path
        : node.path.split(/[\\/]/).slice(0, -1).join("/");
    onSetCreating({ type: "file", parentPath: dirPath });
  };

  const handleNewFolder = () => {
    closeContextMenu();
    const dirPath =
      node.type === "directory"
        ? node.path
        : node.path.split(/[\\/]/).slice(0, -1).join("/");
    onSetCreating({ type: "folder", parentPath: dirPath });
  };

  const handleInlineCreate = async (name: string) => {
    if (!creatingItem) return;
    // Normalize path separators for cross-platform safety (Windows backslashes)
    const parentNorm = creatingItem.parentPath.replace(/\\/g, "/");
    const fullPath = `${parentNorm}/${name}`;
    // Clear creating state FIRST so the input is always removed even if the
    // fs call fails — this prevents the UI from "freezing" with an orphaned
    // inline input that can never be dismissed.
    const itemType = creatingItem.type;
    onSetCreating(null);
    try {
      if (itemType === "file") {
        await window.electronAPI.fs.createFile(fullPath);
        await loadChildren();
        onFileCreated?.(fullPath, name);
        onFileOpened(fullPath, name, false);
      } else {
        await window.electronAPI.fs.createFolder(fullPath);
        await loadChildren();
        onFolderCreated?.(fullPath);
      }
    } catch (err) {
      console.error("Failed to create item:", err);
      // Still refresh to show current state
      await loadChildren().catch(() => {});
    }
  };

  const handleDeleteMenuClick = async () => {
    closeContextMenu();

    try {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Perform pseudo-delete by renaming to a hidden .trash file
      const dirStr = node.path.substring(0, Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\')));
      const fileName = node.path.substring(Math.max(node.path.lastIndexOf('/'), node.path.lastIndexOf('\\')) + 1);
      const trashPath = `${dirStr}/.trash_${Date.now()}_${fileName}`;

      // Read file content BEFORE renaming so we can restore it on undo.
      // This is the most reliable source — it doesn't depend on Y.Text,
      // Monaco model state, or re-reading after rename.
      let savedContent: string | undefined;
      if (node.type === "file") {
        try {
          savedContent = await window.electronAPI.fs.readFile(node.path);
        } catch (readErr) {
          console.warn(`Could not pre-read file for undo stack: ${node.path}`, readErr);
        }
      }
      
      await window.electronAPI.fs.renameItem(node.path, trashPath);
      
      // Store in global undo stack so Ctrl+Z brings it back
      fileUndoStack.push({
        originalPath: node.path,
        trashPath,
        type: node.type,
        onRestored: () => {
            if (node.type === "file") {
               onFileCreated?.(node.path, node.name, savedContent, true);
            } else {
               onFolderCreated?.(node.path);
            }
            onRefresh();
        }
      });
      
      onFileDeleted(node.path, node.type);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const startRename = () => {
    closeContextMenu();
    setNewName(node.name);
    setRenaming(true);
    commitRenameRef.current = false;
  };

  const commitRenameRef = useRef(false);

  const commitRename = async () => {
    if (commitRenameRef.current) return;
    commitRenameRef.current = true;
    
    setRenaming(false);
    if (newName !== node.name && newName.trim()) {
      const dir = node.path.split(/[\\/]/).slice(0, -1).join("/");
      const newPath = `${dir}/${newName.trim()}`;
      try {
        await window.electronAPI.fs.renameItem(node.path, newPath);
      } catch (err) {
        console.error("Local rename failed:", err);
        commitRenameRef.current = false;
        onRefresh();
        return;
      }
      // Broadcast the rename to collaboration peers even if the tab update
      // below encounters an issue – this is the critical sync step.
      try {
        onFileRenamed?.(node.path, newPath);
      } catch (err) {
        console.error('broadcastRename failed:', err);
      }
      onRefresh();
    }
  };

  const handleRenameBlur = useCallback((e: React.FocusEvent) => {
    const userClickedAway = isUserClicking;
    const relatedTarget = e.relatedTarget as Element | null;
    const wentToMonaco = relatedTarget && !!relatedTarget.closest('.monaco-editor');
    const wentToBody = relatedTarget === document.body || !relatedTarget;
    
    if (renameBlurTimeoutRef.current) clearTimeout(renameBlurTimeoutRef.current);
    renameBlurTimeoutRef.current = setTimeout(() => {
      // Focus came back naturally — do nothing.
      if (document.activeElement === renameInputRef.current) return;
      
      if (!userClickedAway && (wentToMonaco || wentToBody)) {
        // Focus stolen programmatically by Monaco during a collab sync.
        // Prevent premature rename commit, gently restore focus.
        renameInputRef.current?.focus();
        return;
      }
      
      // We only commit if it's an explicit submit (Enter key, or actually clicking away).
      // Double check that it's still renaming to avoid double-commit race condition.
      commitRename();
    }, 300);
  }, [newName, node.name, node.path]);

  // Register native-level Enter / Escape callbacks for the rename input
  useEffect(() => {
    if (!renaming) return;
    const el = renameInputRef.current;
    if (el) {
      fileTreeInputCallbacks.set(el, {
        onSubmit: () => {
          if (renameBlurTimeoutRef.current) {
            clearTimeout(renameBlurTimeoutRef.current);
            renameBlurTimeoutRef.current = null;
          }
          commitRename();
        },
        onCancel: () => {
          if (renameBlurTimeoutRef.current) {
            clearTimeout(renameBlurTimeoutRef.current);
            renameBlurTimeoutRef.current = null;
          }
          setRenaming(false);
        },
      });
    }

    // cleanup timeouts + callback registry when renaming finishes/cancels
    return () => {
      if (renameBlurTimeoutRef.current) clearTimeout(renameBlurTimeoutRef.current);
      if (el) fileTreeInputCallbacks.delete(el);
    };
  }, [renaming, newName, node.name, node.path]);

  useEffect(() => {
    if (contextMenu) {
      const handler = (e: Event) => {
        const el =
          e.target instanceof HTMLElement
            ? e.target
            : (e.target as Node).parentElement;
        if (el?.closest?.(".context-menu")) return;
        closeContextMenu();
      };
      const blurHandler = () => closeContextMenu();
      const closeHandler = () => closeContextMenu();
      window.addEventListener("mousedown", handler);
      window.addEventListener("blur", blurHandler);
      document.addEventListener("close-context-menus", closeHandler);
      return () => {
        window.removeEventListener("mousedown", handler);
        window.removeEventListener("blur", blurHandler);
        document.removeEventListener("close-context-menus", closeHandler);
      };
    }
  }, [contextMenu]);

  const isActive = node.type === "file" && node.path === activeFilePath;
  const isSelected = node.type === "directory" && node.path === selectedFolder;

  return (
    <div className="tree-node-wrapper">
      <div
        className={`tree-node ${isActive ? "active" : ""} ${isSelected ? "selected-folder" : ""}`}
        style={{ paddingLeft: `${depth * INDENT_PX + 8}px` }}
        onKeyDown={(e) => {
          if (renaming) return;
          if (e.key === "F2") {
            e.preventDefault();
            startRename();
          } else if (e.key === "Delete" || e.key === "Del" || (e.metaKey && e.key === "Backspace")) {
            e.preventDefault();
            handleDeleteMenuClick();
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (node.type === "file") onFileClick(node.path, node.name);
            else {
              onSelectFolder(node.path);
              toggleExpanded();
            }
          }
        }}
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          (e.currentTarget as HTMLElement).focus();
          if (node.type === "file") onFileClick(node.path, node.name);
          else {
            onSelectFolder(node.path);
            toggleExpanded();
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {hasFolders ? (
          node.type === "directory" ? (
            <span className="expand-icon">
              {expanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
          ) : (
            <span className="expand-icon"></span>
          )
        ) : (
          <span className="expand-icon expand-icon-empty"></span>
        )}
        <span className="file-icon">{getIcon(node)}</span>
        {renaming ? (
          <input
            ref={renameInputRef}
            autoFocus
            className="rename-input"
            title="Rename item"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onFocus={(e) => {
              if (renameBlurTimeoutRef.current) {
                clearTimeout(renameBlurTimeoutRef.current);
                renameBlurTimeoutRef.current = null;
              }
              e.target.select();
            }}
            onBlur={handleRenameBlur}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="node-name">{node.name}</span>
        )}
      </div>

      {contextMenu &&
        createPortal(
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="context-menu-item" onClick={handleNewFile}>
              <span>New File</span>
            </div>
            <div className="context-menu-item" onClick={handleNewFolder}>
              <span>New Folder</span>
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={startRename}>
              <span>Rename</span>
              <span className="context-menu-shortcut">F2</span>
            </div>
            <div className="context-menu-separator" />
              <div className="context-menu-item danger" onClick={handleDeleteMenuClick}>
                <span>Delete</span>
                <span className="context-menu-shortcut">{isWindows ? "Del" : "⌘⌫"}</span>
              </div>
            </div>,
            document.body,
          )}

      {expanded && node.type === "directory" && (
        <div className="tree-children">
          {isCreatingHere && creatingItem?.type === "folder" && (
            <InlineCreateInput
              type={creatingItem.type}
              depth={depth + 1}
              hasFolders={hasChildFolders}
              onSubmit={handleInlineCreate}
              onCancel={() => onSetCreating(null)}
            />
          )}
          {children
            .filter((c) => c.type === "directory")
            .map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                hasFolders={hasChildFolders}
                activeFilePath={activeFilePath}
                onFileClick={onFileClick}
                onRefresh={loadChildren}
                workspaceRoot={workspaceRoot}
                creatingItem={creatingItem}
                onSetCreating={onSetCreating}
                selectedFolder={selectedFolder}
                onSelectFolder={onSelectFolder}
                onFileOpened={onFileOpened}
                onFileDeleted={onFileDeleted}
                onFileRenamed={onFileRenamed}
                onFileCreated={onFileCreated}
                onFolderCreated={onFolderCreated}
              />
            ))}
          {isCreatingHere && creatingItem?.type === "file" && (
            <InlineCreateInput
              type={creatingItem.type}
              depth={depth + 1}
              hasFolders={hasChildFolders}
              onSubmit={handleInlineCreate}
              onCancel={() => onSetCreating(null)}
            />
          )}
          {children
            .filter((c) => c.type !== "directory")
            .map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                hasFolders={hasChildFolders}
                activeFilePath={activeFilePath}
                onFileClick={onFileClick}
                onRefresh={loadChildren}
                workspaceRoot={workspaceRoot}
                creatingItem={creatingItem}
                onSetCreating={onSetCreating}
                selectedFolder={selectedFolder}
                onSelectFolder={onSelectFolder}
                onFileOpened={onFileOpened}
                onFileDeleted={onFileDeleted}
                onFileRenamed={onFileRenamed}
                onFileCreated={onFileCreated}
                onFolderCreated={onFolderCreated}
              />
            ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  workspaceRoot: string | null;
  onOpenFolder: () => void;
  onFileClick: (path: string, name: string) => void;
  activeFilePath: string | null;
  autoSave: boolean;
  onAutoSaveChange: (autoSave: boolean) => void;
  onFileOpened?: (path: string, name: string, isPreview?: boolean) => void;
  newFileTrigger?: number;
  onFileDeleted?: (path: string, type: "file" | "directory") => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileCreated?: (path: string, name: string, savedContent?: string, isUndo?: boolean) => void;
  onFolderCreated?: (path: string) => void;
  refreshTrigger?: number;
}

const FileTree = React.memo(function FileTree({
  workspaceRoot,
  onOpenFolder,
  onFileClick,
  activeFilePath,
  autoSave,
  onAutoSaveChange,
  onFileOpened,
  newFileTrigger,
  onFileDeleted,
  onFileRenamed,
  onFileCreated,
  onFolderCreated,
  refreshTrigger,
}: FileTreeProps) {
  const [rootNodes, setRootNodes] = useState<FileNode[]>([]);
  const [creatingItem, setCreatingItem] = useState<CreatingItem | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(
    workspaceRoot,
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!newFileTrigger || !workspaceRoot) return;
    setCreatingItem({
      type: "file",
      parentPath: selectedFolder ?? workspaceRoot,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newFileTrigger]);

  useEffect(() => {
    if (contextMenu) {
      const handler = (e: Event) => {
        const el =
          e.target instanceof HTMLElement
            ? e.target
            : (e.target as Node).parentElement;
        if (el?.closest?.(".context-menu")) return;
        setContextMenu(null);
      };
      const blurHandler = () => setContextMenu(null);
      const closeHandler = () => setContextMenu(null);
      window.addEventListener("mousedown", handler);
      window.addEventListener("blur", blurHandler);
      document.addEventListener("close-context-menus", closeHandler);
      return () => {
        window.removeEventListener("mousedown", handler);
        window.removeEventListener("blur", blurHandler);
        document.removeEventListener("close-context-menus", closeHandler);
      };
    }
  }, [contextMenu]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedFolder(null);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const loadRoot = useCallback(async () => {
    if (!workspaceRoot) return;
    try {
      const items = await window.electronAPI.fs.readDirectory(workspaceRoot);
      setRootNodes(items);
    } catch (err) {
      console.warn('loadRoot failed:', err);
      // Don't clear rootNodes — keep showing stale data so UI isn't blank
    }
  }, [workspaceRoot]);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  useEffect(() => {
    if (refreshTrigger) loadRoot();
  }, [refreshTrigger, loadRoot]);

  const handleSetCreating = (item: CreatingItem | null) => {
    setCreatingItem(item);
  };

  const hasRootFolders = rootNodes.some((n) => n.type === "directory");

  if (!workspaceRoot) {
    return (
      <div className="file-tree-panel">
        <div className="tree-header">
          <span className="tree-header-title">
            Explorer
          </span>
          <div className="tree-actions" />
        </div>
        <div className="empty-folder-container">
          <p className="empty-folder-text">No folder opened</p>
          <div className="empty-folder-actions">
            <button
              onClick={onOpenFolder}
              className="empty-folder-btn"
            >
              Open Folder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="file-tree-panel"
      onClick={() => setSelectedFolder(workspaceRoot)}
      onContextMenu={(e) => {
        // Prevent default browser context menu and only show root context if clicking dead space
        if ((e.target as HTMLElement).closest(".tree-node")) return;
        e.preventDefault();
        e.stopPropagation();
        document.dispatchEvent(new CustomEvent("close-context-menus"));
        setContextMenu({ x: e.clientX, y: e.clientY });
        setSelectedFolder(workspaceRoot);
      }}
    >
      <div className="tree-header" title={workspaceRoot}>
        <span className="tree-header-title">
          {workspaceRoot.split(/[/\\]/).pop()}
        </span>
        <div className="tree-actions">
          <button
            className="tree-action-btn"
            title="New File"
            onClick={(e) => {
              e.stopPropagation();
              setCreatingItem({
                type: "file",
                parentPath: selectedFolder ?? workspaceRoot,
              });
            }}
          >
            <FilePlus2 size={18} />
          </button>
          <button
            className="tree-action-btn"
            title="New Folder"
            onClick={(e) => {
              e.stopPropagation();
              setCreatingItem({
                type: "folder",
                parentPath: selectedFolder ?? workspaceRoot,
              });
            }}
          >
            <FolderPlus size={18} />
          </button>
        </div>
      </div>
      <div className="tree-content">
        {creatingItem &&
          creatingItem.parentPath === workspaceRoot &&
          creatingItem.type === "folder" && (
            <InlineCreateInput
              type={creatingItem.type}
              depth={0}
              hasFolders={hasRootFolders}
              onSubmit={async (name) => {
                const rootNorm = workspaceRoot.replace(/\\/g, "/");
                const fullPath = `${rootNorm}/${name}`;
                // Clear creating state FIRST to prevent frozen input
                setCreatingItem(null);
                try {
                  await window.electronAPI.fs.createFolder(fullPath);
                  loadRoot();
                  onFolderCreated?.(fullPath);
                } catch (err) {
                  console.error("Failed to create folder at root:", err);
                  loadRoot();
                }
              }}
              onCancel={() => setCreatingItem(null)}
            />
          )}
        {rootNodes
          .filter((n) => n.type === "directory")
          .map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              hasFolders={hasRootFolders}
              activeFilePath={activeFilePath}
              onFileClick={onFileClick}
              onRefresh={loadRoot}
              workspaceRoot={workspaceRoot}
              creatingItem={creatingItem}
              onSetCreating={handleSetCreating}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
              onFileOpened={onFileOpened ?? (() => {})}
              onFileDeleted={onFileDeleted ?? (() => {})}
              onFileRenamed={onFileRenamed}
              onFileCreated={onFileCreated}
              onFolderCreated={onFolderCreated}
            />
          ))}
        {creatingItem &&
          creatingItem.parentPath === workspaceRoot &&
          creatingItem.type === "file" && (
            <InlineCreateInput
              type={creatingItem.type}
              depth={0}
              hasFolders={hasRootFolders}
              onSubmit={async (name) => {
                const rootNorm = workspaceRoot.replace(/\\/g, "/");
                const fullPath = `${rootNorm}/${name}`;
                // Clear creating state FIRST to prevent frozen input
                setCreatingItem(null);
                try {
                  await window.electronAPI.fs.createFile(fullPath);
                  loadRoot();
                  onFileCreated?.(fullPath, name);
                  onFileOpened?.(fullPath, name, false);
                } catch (err) {
                  console.error("Failed to create file at root:", err);
                  loadRoot();
                }
              }}
              onCancel={() => setCreatingItem(null)}
            />
          )}
        {rootNodes
          .filter((n) => n.type !== "directory")
          .map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              hasFolders={hasRootFolders}
              activeFilePath={activeFilePath}
              onFileClick={onFileClick}
              onRefresh={loadRoot}
              workspaceRoot={workspaceRoot}
              creatingItem={creatingItem}
              onSetCreating={handleSetCreating}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
              onFileOpened={onFileOpened ?? (() => {})}
              onFileDeleted={onFileDeleted ?? (() => {})}
              onFileRenamed={onFileRenamed}
              onFileCreated={onFileCreated}
              onFolderCreated={onFolderCreated}
            />
          ))}
      </div>

      {contextMenu &&
        createPortal(
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div
              className="context-menu-item"
              onClick={() => {
                setCreatingItem({ type: "file", parentPath: workspaceRoot });
                setContextMenu(null);
              }}
            >
              <span>New File</span>
            </div>
            <div
              className="context-menu-item"
              onClick={() => {
                setCreatingItem({ type: "folder", parentPath: workspaceRoot });
                setContextMenu(null);
              }}
            >
              <span>New Folder</span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});

export default FileTree;
