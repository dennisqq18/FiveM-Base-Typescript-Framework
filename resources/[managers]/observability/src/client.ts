let dashboardOpen = false;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function nui(message: Record<string, any>): void {
  SendNuiMessage(JSON.stringify(message));
}

function stopRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

function requestSnapshot(): void {
  if (!dashboardOpen) return;
  emitNet('rumble:observability:requestSnapshot');
  stopRefresh();
  refreshTimer = setTimeout(requestSnapshot, 3000);
}

function openDashboard(initial?: any): void {
  dashboardOpen = true;
  SetNuiFocus(true, true);
  nui({ type: 'open', snapshot: initial ?? null });
  requestSnapshot();
}

function closeDashboard(): void {
  dashboardOpen = false;
  stopRefresh();
  SetNuiFocus(false, false);
  nui({ type: 'close' });
}

onNet('rumble:observability:open', (initial: any) => openDashboard(initial));
onNet('rumble:observability:snapshot', (data: any) => {
  if (!dashboardOpen) return;
  nui({ type: 'snapshot', snapshot: data });
});
onNet('rumble:observability:alert', (entry: any) => {
  const message = String(entry?.message ?? 'Performance alert');
  TriggerEvent('chat:addMessage', { color: [255, 115, 90], args: ['Rumble Monitor', message] });
  if (dashboardOpen) nui({ type: 'alert', alert: entry });
});

RegisterNuiCallbackType('close');
on('__cfx_nui:close', (_data: any, cb: (response: any) => void) => {
  closeDashboard();
  cb({ ok: true });
});

RegisterNuiCallbackType('refresh');
on('__cfx_nui:refresh', (_data: any, cb: (response: any) => void) => {
  if (dashboardOpen) emitNet('rumble:observability:requestSnapshot');
  cb({ ok: true });
});

on('onClientResourceStart', (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;
  TriggerEvent('chat:addSuggestion', '/perf', 'Open the Rumble performance dashboard.');
  TriggerEvent('chat:addSuggestion', '/slowqueries', 'Show the latest slow queries.');
  TriggerEvent('chat:addSuggestion', '/playerdiag', 'Player diagnostics: /playerdiag [source or permanent ID].');
});

on('onClientResourceStop', (resourceName: string) => {
  if (resourceName === GetCurrentResourceName()) closeDashboard();
});
