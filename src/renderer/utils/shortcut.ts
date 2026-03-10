export const isMac = navigator.userAgent.toLowerCase().includes('mac');

export function formatKey(key: string): string {
    if (!isMac) return key;

    switch (key.toLowerCase()) {
        case 'ctrl':
        case 'control':
            return 'Cmd';
        case 'alt':
            return 'Option';
        case 'windows':
        case 'win':
            return 'Cmd';
        default:
            return key;
    }
}

export function formatShortcut(shortcutString: string): string {
    if (!isMac) return shortcutString;

    // Replace common Windows modifier keys with their Mac equivalents.
    // E.g. "Ctrl+B" -> "Cmd+B", "Ctrl+Alt+Enter" -> "Cmd+Option+Enter"
    return shortcutString
        .replace(/\bCtrl\b/gi, 'Cmd')
        .replace(/\bControl\b/gi, 'Cmd')
        .replace(/\bAlt\b/gi, 'Option')
        .replace(/\bWin\b/gi, 'Cmd')
        .replace(/\bWindows\b/gi, 'Cmd');
}
