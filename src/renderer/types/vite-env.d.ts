/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string;
  readonly VITE_APPWRITE_PROJECT_ID: string;
  readonly VITE_APPWRITE_DB_NAME: string;
  readonly VITE_APPWRITE_COLLECTION_TEAMS: string;
  readonly VITE_APPWRITE_COLLECTION_SESSIONS: string;
  readonly VITE_APPWRITE_COLLECTION_ACTIVITY_LOGS: string;
  readonly VITE_APPWRITE_COLLECTION_REPORTS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}
