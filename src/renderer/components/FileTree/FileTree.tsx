import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronDown, Folder, File, FileCode2, FileJson, FileText, FileImage, Terminal, Database, ShieldAlert, FilePlus2, FolderPlus, Braces, Code2, Palette } from 'lucide-react';
import { FileNode } from '../../../shared/types';
import './FileTree.css';

const isWindows = navigator.userAgent.toLowerCase().includes('win');
const INDENT_PX = isWindows ? 8 : 16;

function getIcon(node: FileNode) {
  if (node.type === 'directory') return <Folder size={14} color="var(--accent)" />;
  
  const ext = node.extension || '';
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <Braces size={14} color="#eab308" />;
    case 'json':
      return <FileJson size={14} color="#22c55e" />;
    case 'html':
      return <Code2 size={14} color="#ef4444" />;
    case 'css':
      return <Palette size={14} color="#3b82f6" />;
    case 'md':
      return <FileText size={14} color="#a1a1aa" />;
    case 'png':
    case 'jpg':
    case 'svg':
      return <FileImage size={14} color="#8b5cf6" />;
    case 'sh':
    case 'bash':
      return <Terminal size={14} color="#10b981" />;
    case 'php':
      return <FileCode2 size={14} color="#7b7fb5" />;
    case 'sql':
      return <Database size={14} color="#f97316" />;
    case 'env':
      return <ShieldAlert size={14} color="#eab308" />;
    default:
      return <File size={14} color="var(--text-muted)" />;
  }
}

interface CreatingItem {
  type: 'file' | 'folder';
  parentPath: string;
}

interface InlineCreateInputProps {
  type: 'file' | 'folder';
  depth: number;
  hasFolders: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

function InlineCreateInput({ type, depth, hasFolders, onSubmit, onCancel }: InlineCreateInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div className="tree-node inline-create" style={{ paddingLeft: `${depth * INDENT_PX + 8}px` }}>
      {hasFolders ? <span className="expand-icon"></span> : <span className="expand-icon" style={{ width: '4px' }}></span>}
      <span className="file-icon">{type === 'folder' ? <Folder size={14} color="var(--accent)" /> : <File size={14} />}</span>
      <input
        ref={inputRef}
        className="inline-create-input"
        value={value}
        placeholder={type === 'folder' ? 'Folder name' : 'File name'}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') onCancel();
        }}
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
  onFileOpened: (path: string, name: string) => void;
  onFileDeleted: (path: string, type: 'file' | 'directory') => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
}

function FileTreeNode({ node, depth, hasFolders, activeFilePath, onFileClick, onRefresh, workspaceRoot, creatingItem, onSetCreating, selectedFolder, onSelectFolder, onFileOpened, onFileDeleted, onFileRenamed }: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[]>(node.children || []);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const hasChildFolders = children.some(c => c.type === 'directory');

  const isCreatingHere = creatingItem && creatingItem.parentPath === node.path && node.type === 'directory';

  const loadChildren = useCallback(async () => {
    if (node.type === 'directory') {
      const items = await window.electronAPI.fs.readDirectory(node.path);
      setChildren(items);
    }
  }, [node]);

  useEffect(() => {
    if (isCreatingHere && !expanded) {
      setExpanded(true);
      loadChildren();
    }
  }, [isCreatingHere, expanded, loadChildren]);

  const toggleExpanded = async () => {
    if (node.type !== 'directory') return;
    if (!expanded) await loadChildren();
    setExpanded((v) => !v);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('close-context-menus'));
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleNewFile = () => {
    closeContextMenu();
    const dirPath = node.type === 'directory' ? node.path : node.path.split(/[\\/]/).slice(0, -1).join('/');
    onSetCreating({ type: 'file', parentPath: dirPath });
  };

  const handleNewFolder = () => {
    closeContextMenu();
    const dirPath = node.type === 'directory' ? node.path : node.path.split(/[\\/]/).slice(0, -1).join('/');
    onSetCreating({ type: 'folder', parentPath: dirPath });
  };

  const handleInlineCreate = async (name: string) => {
    if (!creatingItem) return;
    const fullPath = `${creatingItem.parentPath}/${name}`;
    if (creatingItem.type === 'file') {
      await window.electronAPI.fs.createFile(fullPath);
      onSetCreating(null);
      await loadChildren();
      onFileOpened(fullPath, name);
    } else {
      await window.electronAPI.fs.createFolder(fullPath);
      onSetCreating(null);
      await loadChildren();
    }
  };

  const handleDelete = async () => {
    closeContextMenu();
    if (confirm(`Delete "${node.name}"?`)) {
      await window.electronAPI.fs.deleteItem(node.path);
      onFileDeleted(node.path, node.type);
      onRefresh();
    }
  };

  const startRename = () => {
    closeContextMenu();
    setRenaming(true);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const commitRename = async () => {
    setRenaming(false);
    if (newName !== node.name && newName.trim()) {
      const dir = node.path.split(/[\\/]/).slice(0, -1).join('/');
      const newPath = `${dir}/${newName.trim()}`;
      await window.electronAPI.fs.renameItem(node.path, newPath);
      onFileRenamed?.(node.path, newPath);
      onRefresh();
    }
  };

  useEffect(() => {
    if (contextMenu) {
      const handler = () => closeContextMenu();
      window.addEventListener('click', handler);
      document.addEventListener('close-context-menus', handler as EventListener);
      return () => {
        window.removeEventListener('click', handler);
        document.removeEventListener('close-context-menus', handler as EventListener);
      };
    }
  }, [contextMenu]);

  const isActive = node.type === 'file' && node.path === activeFilePath;
  const isSelected = node.type === 'directory' && node.path === selectedFolder;

  return (
    <div className="tree-node-wrapper">
      <div
        className={`tree-node ${isActive ? 'active' : ''} ${isSelected ? 'selected-folder' : ''}`}
        style={{ paddingLeft: `${depth * INDENT_PX + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          if (node.type === 'file') onFileClick(node.path, node.name);
          else {
            onSelectFolder(node.path);
            toggleExpanded();
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {hasFolders ? (
          node.type === 'directory' ? (
            <span className="expand-icon">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
          ) : (
            <span className="expand-icon"></span>
          )
        ) : (
          <span className="expand-icon" style={{ width: '4px' }}></span>
        )}
        <span className="file-icon">
            {getIcon(node)}
        </span>
        {renaming ? (
          <input
            ref={renameInputRef}
            className="rename-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="node-name">{node.name}</span>
        )}
      </div>

      {contextMenu && createPortal(
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="context-menu-item" onClick={handleNewFile}>New File</div>
          <div className="context-menu-item" onClick={handleNewFolder}>New Folder</div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={startRename}>Rename</div>
          <div className="context-menu-separator" />
          <div className="context-menu-item danger" onClick={handleDelete}>Delete</div>
        </div>,
        document.body
      )}

      {expanded && node.type === 'directory' && (
        <div className="tree-children">
          {isCreatingHere && creatingItem?.type === 'folder' && (
            <InlineCreateInput
              type={creatingItem.type}
              depth={depth + 1}
              hasFolders={hasChildFolders}
              onSubmit={handleInlineCreate}
              onCancel={() => onSetCreating(null)}
            />
          )}
          {children.filter(c => c.type === 'directory').map((child) => (
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
            />
          ))}
          {isCreatingHere && creatingItem?.type === 'file' && (
            <InlineCreateInput
              type={creatingItem.type}
              depth={depth + 1}
              hasFolders={hasChildFolders}
              onSubmit={handleInlineCreate}
              onCancel={() => onSetCreating(null)}
            />
          )}
          {children.filter(c => c.type !== 'directory').map((child) => (
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
  onFileOpened?: (path: string, name: string) => void;
  newFileTrigger?: number;
  onFileDeleted?: (path: string, type: 'file' | 'directory') => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
}

export default function FileTree({ workspaceRoot, onOpenFolder, onFileClick, activeFilePath, autoSave, onAutoSaveChange, onFileOpened, newFileTrigger, onFileDeleted, onFileRenamed }: FileTreeProps) {
  const [rootNodes, setRootNodes] = useState<FileNode[]>([]);
  const [creatingItem, setCreatingItem] = useState<CreatingItem | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(workspaceRoot);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!newFileTrigger || !workspaceRoot) return;
    setCreatingItem({ type: 'file', parentPath: selectedFolder ?? workspaceRoot });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newFileTrigger]);

  useEffect(() => {
    if (contextMenu) {
      const handler = () => setContextMenu(null);
      window.addEventListener('click', handler);
      document.addEventListener('close-context-menus', handler as EventListener);
      return () => {
        window.removeEventListener('click', handler);
        document.removeEventListener('close-context-menus', handler as EventListener);
      };
    }
  }, [contextMenu]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedFolder(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const loadRoot = useCallback(async () => {
    if (!workspaceRoot) return;
    const items = await window.electronAPI.fs.readDirectory(workspaceRoot);
    setRootNodes(items);
  }, [workspaceRoot]);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  const handleSetCreating = (item: CreatingItem | null) => {
    setCreatingItem(item);
  };

  const hasRootFolders = rootNodes.some(n => n.type === 'directory');

  if (!workspaceRoot) {
    return (
      <div className="file-tree-panel">
        <div className="tree-header">
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>Explorer</span>
          <div className="tree-actions" />
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '10px' }}>No folder opened</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={onOpenFolder}
              style={{
                padding: '6px 12px',
                background: 'var(--accent)',
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                border: 'none',
              }}
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
        if ((e.target as HTMLElement).closest('.tree-node')) return;
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('close-context-menus'));
        setContextMenu({ x: e.clientX, y: e.clientY });
        setSelectedFolder(workspaceRoot);
      }}
    >
      <div className="tree-header" title={workspaceRoot}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>
          {workspaceRoot.split(/[/\\]/).pop()}
        </span>
        <div className="tree-actions">
          <button
            className="tree-action-btn"
            title="New File"
            onClick={(e) => { e.stopPropagation(); setCreatingItem({ type: 'file', parentPath: selectedFolder ?? workspaceRoot }); }}
          >
            <FilePlus2 size={18} />
          </button>
          <button
            className="tree-action-btn"
            title="New Folder"
            onClick={(e) => { e.stopPropagation(); setCreatingItem({ type: 'folder', parentPath: selectedFolder ?? workspaceRoot }); }}
          >
            <FolderPlus size={18} />
          </button>
        </div>
      </div>
      <div className="tree-content">
        {creatingItem && creatingItem.parentPath === workspaceRoot && creatingItem.type === 'folder' && (
          <InlineCreateInput
            type={creatingItem.type}
            depth={0}
            hasFolders={hasRootFolders}
            onSubmit={async (name) => {
              const fullPath = `${workspaceRoot}/${name}`;
              if (creatingItem.type === 'file') {
                await window.electronAPI.fs.createFile(fullPath);
                setCreatingItem(null);
                loadRoot();
                onFileOpened?.(fullPath, name);
              } else {
                await window.electronAPI.fs.createFolder(fullPath);
                setCreatingItem(null);
                loadRoot();
              }
            }}
            onCancel={() => setCreatingItem(null)}
          />
        )}
        {rootNodes.filter(n => n.type === 'directory').map((node) => (
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
          />
        ))}
        {creatingItem && creatingItem.parentPath === workspaceRoot && creatingItem.type === 'file' && (
          <InlineCreateInput
            type={creatingItem.type}
            depth={0}
            hasFolders={hasRootFolders}
            onSubmit={async (name) => {
              const fullPath = `${workspaceRoot}/${name}`;
              if (creatingItem.type === 'file') {
                await window.electronAPI.fs.createFile(fullPath);
                setCreatingItem(null);
                loadRoot();
                onFileOpened?.(fullPath, name);
              } else {
                await window.electronAPI.fs.createFolder(fullPath);
                setCreatingItem(null);
                loadRoot();
              }
            }}
            onCancel={() => setCreatingItem(null)}
          />
        )}
        {rootNodes.filter(n => n.type !== 'directory').map((node) => (
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
          />
        ))}
      </div>

      {contextMenu && createPortal(
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="context-menu-item" onClick={() => { setCreatingItem({ type: 'file', parentPath: workspaceRoot }); setContextMenu(null); }}>New File</div>
          <div className="context-menu-item" onClick={() => { setCreatingItem({ type: 'folder', parentPath: workspaceRoot }); setContextMenu(null); }}>New Folder</div>
        </div>,
        document.body
      )}
    </div>
  );
}
