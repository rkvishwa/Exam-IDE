let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function sendHeartbeat(): Promise<void> {
  const securityApi = window.electronAPI?.security;
  if (!securityApi) {
    return;
  }

  const nonce = await securityApi.requestNonce?.();
  if (!nonce) {
    return;
  }

  securityApi.sendHeartbeat(nonce);
}

export function startSecurityHeartbeat(): void {
  if (!window.electronAPI?.security || heartbeatTimer) {
    return;
  }

  void sendHeartbeat();
  heartbeatTimer = setInterval(() => {
    void sendHeartbeat();
  }, 5000);
}

export function stopSecurityHeartbeat(): void {
  if (!heartbeatTimer) {
    return;
  }

  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}
