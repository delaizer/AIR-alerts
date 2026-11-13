const { contextBridge, ipcRenderer } = require("electron");
// У вікно передаємо лише вузький набір дій. Токен назад ніколи не повертається.
contextBridge.exposeInMainWorld("api", Object.freeze({
  init: () => ipcRenderer.invoke("init"),
  setSettings: (s) => ipcRenderer.invoke("set", s),
  unlock: (pin) => ipcRenderer.invoke("unlock", pin),
  setPin: (p) => ipcRenderer.invoke("pin", p),
  onState: (f) => ipcRenderer.on("state", (_, s) => f(s)),
  onLock: (f) => ipcRenderer.on("lock", (_, s) => f(s)),
  onBeep: (f) => ipcRenderer.on("beep", () => f()),
}));
