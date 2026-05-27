const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const Store = require("electron-store");
const { execFile } = require("child_process");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log"); // <-- Adicionada biblioteca de log profissional

// Configuração do Logger para interceptar o Auto-Updater e salvar em arquivo no Totem
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
autoUpdater.autoDownload = true; // Garante o download automático do .exe ao detectar a versão nova

app.commandLine.appendSwitch("disable-features", "OverscrollHistoryNavigation");

// Limpa config corrompida antes de inicializar o store
const configPath = path.join(app.getPath("userData"), "sga-app-settings.json");
if (fs.existsSync(configPath)) {
  try {
    JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    log.error("Config corrompida detectada, removendo...");
    fs.unlinkSync(configPath);
  }
}

const store = new Store({
  name: "sga-app-settings",
  defaults: {
    triagemToken: "",
    painelToken: "",
    kiosk: true,
    lastPage: "triagem",
  },
});

let mainWindow;
let printServerProcess = null;

// Impede abrir o app duas vezes no totem
const additionalData = { myKey: "sga-totem" };
const isFirstInstance = app.requestSingleInstanceLock(additionalData);

if (!isFirstInstance) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function startPrintServer() {
  const printSrvPath = app.isPackaged
    ? path.join(process.resourcesPath, "..", "SGAPrintSrv.exe")
    : path.join(__dirname, "..", "SGAPrintSrv.exe");

  if (fs.existsSync(printSrvPath)) {
    log.info(`[Main] Iniciando servidor de impressão em: ${printSrvPath}`);
    printServerProcess = execFile(printSrvPath, (error) => {
      if (error && !error.killed) {
        log.error("[Main] Erro no servidor de impressão:", error);
      }
    });
  } else {
    log.error(
      `[Main] SGAPrintSrv.exe não encontrado no caminho: ${printSrvPath}`,
    );
  }
}

function stopPrintServer() {
  if (printServerProcess) {
    log.info("[Main] Finalizando processo do servidor de impressão...");
    printServerProcess.kill();
    printServerProcess = null;
  }
}

function registerKioskShortcuts() {
  globalShortcut.register("Control+Shift+Q", () => {
    log.info("Fechando app via atalho de emergência.");
    app.exit(0);
  });

  globalShortcut.register("CommandOrControl+Escape", () => {
    log.info("Menu Iniciar bloqueado.");
  });
  globalShortcut.register("Alt+Tab", () => {
    log.info("Alt+Tab bloqueado.");
  });
  globalShortcut.register("Alt+F4", () => {
    log.info("Alt+F4 bloqueado no totem.");
  });
  globalShortcut.register("CommandOrControl+W", () => {
    log.info("Ctrl+W bloqueado.");
  });
  globalShortcut.register("CommandOrControl+R", () => {
    log.info("F5/Ctrl+R bloqueado.");
  });
  globalShortcut.register("F5", () => {
    log.info("F5 bloqueado.");
  });
  globalShortcut.register("F11", () => {
    log.info("F11 bloqueado.");
  });
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    log.info("DevTools bloqueado.");
  });
}

function unregisterKioskShortcuts() {
  globalShortcut.unregister("Control+Shift+Q");
  globalShortcut.unregister("CommandOrControl+Escape");
  globalShortcut.unregister("Alt+Tab");
  globalShortcut.unregister("Alt+F4");
  globalShortcut.unregister("CommandOrControl+W");
  globalShortcut.unregister("CommandOrControl+R");
  globalShortcut.unregister("F5");
  globalShortcut.unregister("F11");
  globalShortcut.unregister("CommandOrControl+Shift+I");
}

async function buildWindow() {
  const kioskEnabled = store.get("kiosk", true);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    fullscreen: kioskEnabled,
    kiosk: kioskEnabled,
    fullscreenable: true,
    frame: !kioskEnabled,
    autoHideMenuBar: true,
    movable: !kioskEnabled,
    resizable: !kioskEnabled,
    skipTaskbar: kioskEnabled,
    minimizable: !kioskEnabled,
    maximizable: !kioskEnabled,
    closable: !kioskEnabled,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webviewTag: true,
      devTools: !kioskEnabled,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  if (kioskEnabled) {
    mainWindow.setAlwaysOnTop(true, "screen-saver");
  }

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.webContents.on("did-fail-load", () => {
    if (store.get("kiosk", true)) {
      log.warn("Falha ao carregar, tentando novamente em 5s...");
      setTimeout(() => {
        if (mainWindow) mainWindow.reload();
      }, 5000);
    }
  });

  mainWindow.once("ready-to-show", () => {
    setTimeout(() => {
      if (kioskEnabled) {
        mainWindow.setKiosk(true);
        mainWindow.setFullScreen(true);
        mainWindow.setMenuBarVisibility(false);
        mainWindow.setSkipTaskbar(true);
        mainWindow.setMinimizable(false);
        mainWindow.setMaximizable(false);
        mainWindow.setClosable(false);
        mainWindow.setMovable(false);
        mainWindow.setResizable(false);
        mainWindow.setAlwaysOnTop(true, "screen-saver");

        unregisterKioskShortcuts();
        registerKioskShortcuts();
      }

      mainWindow.show();
      mainWindow.focus();
    }, 1000);
  });

  mainWindow.on("close", (e) => {
    const kioskIsActive = store.get("kiosk", true);
    if (kioskIsActive) {
      e.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  autoUpdater.on("update-available", (info) => {
    log.info(
      `[AutoUpdate] Uma nova versão (${info.version}) foi detectada. Iniciando download...`,
    );
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info(
      `[AutoUpdate] Download concluído com sucesso para a versão: ${info.version}`,
    );

    // Abre o modal nativo informando sobre o reinício necessário
    dialog
      .showMessageBox({
        type: "info",
        title: "Atualização do Sistema",
        message: `Uma nova versão (${info.version}) foi baixada com sucesso. O sistema precisa reiniciar para aplicar as mudanças.`,
        buttons: ["Atualizar Agora", "Mais Tarde"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          log.info(
            "[AutoUpdate] O usuário escolheu reiniciar. Forçando quitAndInstall...",
          );
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (err) => {
    log.error("[AutoUpdate] Falha no processo de verificação automática:", err);
  });
}

app.whenReady().then(() => {
  startPrintServer();
  buildWindow();
  setupAutoUpdater(); // Inicializa os ouvintes do atualizador avançado

  // Checa se existem atualizações na inicialização após 5 segundos
  setTimeout(() => {
    log.info("[AutoUpdate] Verificando novas atualizações no repositório...");
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);

  // Mantém um looping checando novas versões de hora em hora caso o Totem fique ligado direto
  setInterval(
    () => {
      log.info("[AutoUpdate] Checando atualizações de rotina...");
      autoUpdater.checkForUpdatesAndNotify();
    },
    1000 * 60 * 60 * 1,
  );

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      buildWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopPrintServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  stopPrintServer();
  globalShortcut.unregisterAll();
});

ipcMain.handle("get-settings", () => store.store);

ipcMain.handle("save-settings", async (event, settings) => {
  store.set(settings);

  if (mainWindow && typeof settings.kiosk === "boolean") {
    mainWindow.setKiosk(settings.kiosk);
    mainWindow.setFullScreen(settings.kiosk);
    mainWindow.setMenuBarVisibility(!settings.kiosk);
    mainWindow.setSkipTaskbar(settings.kiosk);
    mainWindow.setMinimizable(!settings.kiosk);
    mainWindow.setMaximizable(!settings.kiosk);
    mainWindow.setClosable(!settings.kiosk);

    if (settings.kiosk) {
      mainWindow.setAlwaysOnTop(true, "screen-saver");
      mainWindow.setMovable(false);
      mainWindow.setResizable(false);

      unregisterKioskShortcuts();
      registerKioskShortcuts();
    } else {
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setMovable(true);
      mainWindow.setResizable(true);
      unregisterKioskShortcuts();
    }
  }

  return store.store;
});

ipcMain.handle("get-triagem-url", () => {
  const token = store.get("triagemToken", "").trim();

  if (token.startsWith("http://") || token.startsWith("https://")) {
    return token;
  }

  let url = "https://sga-sociiz.netlify.app/triagem";
  if (token) {
    url += `?token=${encodeURIComponent(token)}`;
  }
  return url;
});

ipcMain.handle("get-painel-url", () => {
  const token = store.get("painelToken", "").trim();

  if (token.startsWith("http://") || token.startsWith("https://")) {
    return token;
  }

  let url = "https://sga-sociiz.netlify.app/painel";
  if (token) {
    url += `?token=${encodeURIComponent(token)}`;
  }
  return url;
});
