const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('focusDesktop', {
  schedule: (events, namespace) => ipcRenderer.invoke('focus:schedule', events, namespace),
  authorizeCalendar: (clientId, clientSecret) => ipcRenderer.invoke('focus:calendar', clientId, clientSecret),
  saveText: (name, text) => ipcRenderer.invoke('focus:save', name, text),
  stopAlarm: () => ipcRenderer.invoke('focus:stop-alarm'),
  onAlarm: callback => {
    const handler = (_event, alarm) => callback(alarm);
    ipcRenderer.on('focus:alarm', handler);
    return () => ipcRenderer.removeListener('focus:alarm', handler);
  }
});
