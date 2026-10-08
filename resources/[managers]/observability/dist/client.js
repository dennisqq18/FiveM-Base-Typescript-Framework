"use strict";
let dashboardOpen = false;
let refreshTimer = null;
function nui(message) {
    SendNuiMessage(JSON.stringify(message));
}
function stopRefresh() {
    if (refreshTimer)
        clearTimeout(refreshTimer);
    refreshTimer = null;
}
function requestSnapshot() {
    if (!dashboardOpen)
        return;
    emitNet('rumble:observability:requestSnapshot');
    stopRefresh();
    refreshTimer = setTimeout(requestSnapshot, 3000);
}
function openDashboard(initial) {
    dashboardOpen = true;
    SetNuiFocus(true, true);
    nui({ type: 'open', snapshot: initial !== null && initial !== void 0 ? initial : null });
    requestSnapshot();
}
function closeDashboard() {
    dashboardOpen = false;
    stopRefresh();
    SetNuiFocus(false, false);
    nui({ type: 'close' });
}
onNet('rumble:observability:open', (initial) => openDashboard(initial));
onNet('rumble:observability:snapshot', (data) => {
    if (!dashboardOpen)
        return;
    nui({ type: 'snapshot', snapshot: data });
});
onNet('rumble:observability:alert', (entry) => {
    var _a;
    const message = String((_a = entry === null || entry === void 0 ? void 0 : entry.message) !== null && _a !== void 0 ? _a : 'Performance alert');
    TriggerEvent('chat:addMessage', { color: [255, 115, 90], args: ['Rumble Monitor', message] });
    if (dashboardOpen)
        nui({ type: 'alert', alert: entry });
});
RegisterNuiCallbackType('close');
on('__cfx_nui:close', (_data, cb) => {
    closeDashboard();
    cb({ ok: true });
});
RegisterNuiCallbackType('refresh');
on('__cfx_nui:refresh', (_data, cb) => {
    if (dashboardOpen)
        emitNet('rumble:observability:requestSnapshot');
    cb({ ok: true });
});
on('onClientResourceStart', (resourceName) => {
    if (resourceName !== GetCurrentResourceName())
        return;
    TriggerEvent('chat:addSuggestion', '/perf', 'Open the Rumble performance dashboard.');
    TriggerEvent('chat:addSuggestion', '/slowqueries', 'Show the latest slow queries.');
    TriggerEvent('chat:addSuggestion', '/playerdiag', 'Player diagnostics: /playerdiag [source or permanent ID].');
});
on('onClientResourceStop', (resourceName) => {
    if (resourceName === GetCurrentResourceName())
        closeDashboard();
});
