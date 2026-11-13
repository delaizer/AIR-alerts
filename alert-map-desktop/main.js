const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, nativeTheme, safeStorage, session } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pathToFileURL } = require("url");

if (!app.requestSingleInstanceLock()) { app.quit(); return; }

const API = "https://api.alerts.in.ua/v1/alerts/active.json";
const OBL = ["Волинська область","Рівненська область","Житомирська область","м. Київ","Чернігівська область","Сумська область","Харківська область","Луганська область",
"Львівська область","Тернопільська область","Хмельницька область","Київська область","Черкаська область","Полтавська область","Дніпропетровська область","Донецька область",
"Закарпатська область","Івано-Франківська область","Чернівецька область","Вінницька область","Кіровоградська область","Запорізька область",
"Одеська область","Миколаївська область","Херсонська область","Автономна Республіка Крим"];
const N = OBL.length;
const LN = ["Спокійно", "Підвищена увага", "Повітряна тривога", "Критична небезпека"];
const ADV = ["", "Стежте за повідомленнями.", "Прямуйте в укриття.", "Негайно в укриття й не виходьте до відбою."];
const INDEX = pathToFileURL(path.join(__dirname, "renderer", "index.html")).href;

const F = (n) => path.join(app.getPath("userData"), n);
const readJson = (n, d) => { try { return { ...d, ...JSON.parse(fs.readFileSync(F(n), "utf8")) }; } catch { return d; } };
const writeJson = (n, v) => { try { fs.writeFileSync(F(n), JSON.stringify(v), { mode: 0o600 }); } catch {} };

let S = { region: 11, interval: 30, autostart: true, token: "", pin: "" };
let T = { mode: "demo", levels: Array(N).fill(0), since: Array(N).fill(Date.now()), log: [], hist: [], updated: null, error: "" };
let win, tray, quitting = false, timer, memToken = "";

// ---------- токен: лише в зашифрованому вигляді (або тільки в пам’яті)
const getToken = () => {
  if (memToken) return memToken;
  try { if (S.token.startsWith("e:")) return (memToken = safeStorage.decryptString(Buffer.from(S.token.slice(2), "base64"))); } catch {}
  return "";
};
function setToken(t) {
  memToken = t; S.token = "";
  if (!t) return null;
  if (safeStorage.isEncryptionAvailable()) { S.token = "e:" + safeStorage.encryptString(t).toString("base64"); return null; }
  return "Системне шифрування недоступне: токен діятиме лише до закриття застосунку.";
}

// ---------- PIN (scrypt), блокування налаштувань
const hashPin = (pin, salt) => crypto.scryptSync(pin, salt, 32);
function storePin(pin) { const salt = crypto.randomBytes(16); S.pin = salt.toString("hex") + ":" + hashPin(pin, salt).toString("hex"); }
function checkPin(pin) {
  try { const [s, h] = S.pin.split(":"); return crypto.timingSafeEqual(hashPin(pin, Buffer.from(s, "hex")), Buffer.from(h, "hex")); } catch { return false; }
}
let fails = 0, until = 0, unlockedUntil = 0, lockTimer;
const isLocked = () => !!S.pin && Date.now() >= unlockedUntil;
const lockInfo = () => ({ locked: isLocked(), hasPin: !!S.pin });
const send = (ch, d) => { if (win && !win.isDestroyed()) win.webContents.send(ch, d); };
function unlock() { unlockedUntil = Date.now() + 5 * 60000; clearTimeout(lockTimer); lockTimer = setTimeout(() => send("lock", lockInfo()), 5 * 60000 + 500); }
function relock() { unlockedUntil = 0; clearTimeout(lockTimer); send("lock", lockInfo()); }
function tryPin(pin) {
  if (Date.now() < until) return { ok: false, error: `Забагато спроб. Зачекайте ${Math.ceil((until - Date.now()) / 1000)} с.` };
  if (typeof pin === "string" && /^\d{4,8}$/.test(pin) && checkPin(pin)) { fails = 0; return { ok: true }; }
  if (++fails >= 5) { fails = 0; until = Date.now() + 60000; return { ok: false, error: "Забагато спроб. Зачекайте 60 с." }; }
  return { ok: false, error: "Неправильний PIN." };
}

// ---------- дані
function toLevels(alerts) {
  const lv = Array(N).fill(0);
  if (!Array.isArray(alerts)) return lv;
  for (const a of alerts.slice(0, 5000)) {
    if (!a || typeof a !== "object") continue;
    const ob = typeof a.location_oblast === "string" ? a.location_oblast : "", title = typeof a.location_title === "string" ? a.location_title : "";
    let i = OBL.indexOf(ob);
    if (i < 0 && /Севастопол/.test(title)) i = N - 1;
    if (i < 0) continue;
    let v = 1;
    if (a.alert_type === "air_raid") v = a.location_type === "oblast" || a.location_type === "city" ? 2 : 1;
    else if (a.alert_type === "nuclear" || a.alert_type === "chemical") v = 3;
    lv[i] = Math.max(lv[i], v);
  }
  return lv;
}

function push() {
  send("state", T);
  if (tray) {
    const l = T.levels[S.region] || 0;
    tray.setImage(nativeImage.createFromPath(path.join(__dirname, "assets", `tray-${l}.png`)));
    tray.setToolTip(`Мапа Тривог — ${OBL[S.region]}: ${LN[l]}${T.mode === "offline" ? " (немає зв’язку)" : ""}`);
  }
}

function notify(i, o, v) {
  if (v >= 2 && v > o) {
    new Notification({ title: `${LN[v]}: ${OBL[i]}`, body: ADV[v], urgency: "critical" }).show();
    if (win && !win.isDestroyed()) { win.show(); win.flashFrame(true); send("beep"); }
  } else if (v < 2 && o >= 2) {
    new Notification({ title: `Відбій: ${OBL[i]}`, body: "Загроза минула." }).show();
  }
}

function apply(lv, mode) {
  const now = Date.now(), old = T.levels;
  lv.forEach((v, i) => {
    if (v === old[i]) return;
    T.since[i] = now;
    T.log.unshift({ t: now, s: `${OBL[i]}: ${LN[v]}`, v });
    if (i === S.region) notify(i, old[i], v);
  });
  T.log = T.log.slice(0, 40);
  T.levels = lv; T.mode = mode; T.updated = now; T.error = "";
  T.hist.push(lv.filter((x) => x >= 2).length); T.hist = T.hist.slice(-60);
  if (mode === "live") writeJson("cache.json", { levels: T.levels, since: T.since, updated: T.updated });
  push();
}

function demoTick() {
  const lv = [...T.levels];
  for (let i = 0; i < N; i++) if (lv[i] && Math.random() < 0.16) lv[i]--;
  if (Math.random() < 0.55) { const i = Math.floor(Math.random() * N); lv[i] = Math.min(3, lv[i] + 1 + (Math.random() < 0.3 ? 1 : 0)); }
  apply(lv, "demo");
}

async function poll() {
  const tok = getToken();
  if (!tok) return demoTick();
  try {
    const r = await fetch(API, { headers: { Authorization: "Bearer " + tok, Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(10000) });
    if (r.status === 401 || r.status === 403) throw new Error("Токен не підійшов (код " + r.status + ").");
    if (!r.ok) throw new Error("Помилка сервера тривог (код " + r.status + ").");
    const txt = await r.text();
    if (txt.length > 2e6) throw new Error("Відповідь сервера занадто велика.");
    const j = JSON.parse(txt);
    if (!j || !Array.isArray(j.alerts)) throw new Error("Невідомий формат відповіді сервера.");
    apply(toLevels(j.alerts), "live");
  } catch (e) {
    T.mode = "offline";
    T.error = /^(Токен|Помилка|Відповідь|Невідомий)/.test(e.message) ? e.message : "Немає зв’язку з сервером тривог.";
    push();
  }
}

function schedule() {
  clearTimeout(timer);
  const run = async () => { await poll(); timer = setTimeout(run, getToken() ? S.interval * 1000 : 3000); };
  run();
}

// ---------- вікно й захист
function hardenSession() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  ses.setPermissionCheckHandler(() => false);
  ses.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(file|data|devtools):/.test(d.url) })); // вікно не має виходу в мережу
}
app.on("web-contents-created", (_, c) => {
  c.on("will-attach-webview", (e) => e.preventDefault());
  c.on("will-navigate", (e) => e.preventDefault());
  c.setWindowOpenHandler(() => ({ action: "deny" }));
});

function createWindow(hidden) {
  win = new BrowserWindow({
    width: 1100, height: 800, minWidth: 700, minHeight: 600, show: !hidden,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#000000" : "#f2f2f7", title: "Мапа Тривог",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true,
      allowRunningInsecureContent: false, spellcheck: false, devTools: !app.isPackaged,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  win.on("focus", () => win.flashFrame(false));
  win.on("hide", relock);
  win.on("close", (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

function applyAutostart() {
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!S.autostart, args: ["--hidden"] });
}

// ---------- IPC: перевірка відправника й даних
const handle = (ch, fn) => ipcMain.handle(ch, (e, p) => {
  let ok = false;
  try { ok = e.senderFrame && e.senderFrame.url.split("#")[0] === INDEX; } catch {}
  if (!ok) return { ok: false, error: "Відхилено." };
  return fn(p && typeof p === "object" ? p : {}, p);
});

handle("init", () => ({
  settings: { region: S.region, interval: S.interval, autostart: S.autostart, hasToken: !!getToken(), ...lockInfo() },
  state: T,
}));

handle("set", (p) => {
  const touchesSecrets = "token" in p || "interval" in p || "autostart" in p;
  if (touchesSecrets && isLocked()) return { ok: false, error: "locked", ...lockInfo() };
  let warn = null;
  if (Number.isInteger(p.region) && p.region >= 0 && p.region < N) S.region = p.region;
  if ("interval" in p) { if (![15, 30, 60].includes(p.interval)) return { ok: false, error: "Невірний інтервал." }; S.interval = p.interval; }
  if ("autostart" in p) { if (typeof p.autostart !== "boolean") return { ok: false, error: "Невірне значення." }; S.autostart = p.autostart; applyAutostart(); }
  if ("token" in p) {
    if (typeof p.token !== "string") return { ok: false, error: "Невірний токен." };
    const t = p.token.trim();
    if (t && !/^[\w.\-]{10,256}$/.test(t)) return { ok: false, error: "Схоже, токен введено неправильно." };
    warn = setToken(t);
  }
  if (p.test === true) new Notification({ title: "Перевірка сигналу", body: "Сповіщення працюють." }).show();
  writeJson("settings.json", S);
  if ("token" in p || "interval" in p) schedule();
  push();
  return { ok: true, warn, hasToken: !!getToken(), ...lockInfo() };
});

handle("unlock", (_, pin) => {
  const r = tryPin(pin);
  if (r.ok) unlock();
  return { ...r, ...lockInfo() };
});

handle("pin", (p) => {
  if (S.pin) { const r = tryPin(p.current); if (!r.ok) return r; }
  if (p.next === "") { if (!S.pin) return { ok: false, error: "PIN не задано." }; S.pin = ""; }
  else if (typeof p.next === "string" && /^\d{4,8}$/.test(p.next)) { storePin(p.next); unlock(); }
  else return { ok: false, error: "PIN має містити 4–8 цифр." };
  writeJson("settings.json", S);
  send("lock", lockInfo());
  return { ok: true, ...lockInfo() };
});

app.on("second-instance", () => { if (win) { win.show(); win.focus(); } });
app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", () => {}); // працюємо у треї

app.whenReady().then(() => {
  hardenSession();
  S = readJson("settings.json", S);
  if (!/^\d+$/.test(String(S.region)) || S.region >= N) S.region = 11;
  if (![15, 30, 60].includes(S.interval)) S.interval = 30;
  const c = readJson("cache.json", null);
  if (c && Array.isArray(c.levels) && c.levels.length === N && c.levels.every((x) => Number.isInteger(x) && x >= 0 && x <= 3)) {
    T.levels = c.levels;
    if (Array.isArray(c.since) && c.since.length === N && c.since.every(Number.isFinite)) T.since = c.since;
    if (Number.isFinite(c.updated)) T.updated = c.updated;
    if (getToken()) T.mode = "offline";
  }
  createWindow(process.argv.includes("--hidden"));
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "assets", "tray-0.png")));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Відкрити карту", click: () => { win.show(); win.focus(); } },
    { type: "separator" },
    { label: "Вихід", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("click", () => { win.show(); win.focus(); });
  applyAutostart();
  schedule();
});
