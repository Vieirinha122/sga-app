const rcedit = require("rcedit");
const path = require("path");
const fs = require("fs");

// Altere para o caminho exato onde o Electron Forge gera o seu executável
const exePath = path.join(__dirname, "out", "sga-app-win32-x64", "sga-app.exe");

async function forceAdmin() {
  if (!fs.existsSync(exePath)) {
    console.error(
      `[Admin Injector] Erro: O executável não foi encontrado em: ${exePath}`,
    );
    console.error('Certifique-se de rodar o "npm run package" primeiro.');
    process.exit(1);
  }

  console.log(
    "[Admin Injector] Injetando manifesto de Administrador no .exe...",
  );

  try {
    await rcedit(exePath, {
      "requested-execution-level": "requireAdministrator",
    });
    console.log(
      "[Admin Injector] Sucesso! O executável agora exigirá privilégios de Administrador automaticamente.",
    );
  } catch (err) {
    console.error("[Admin Injector] Falha ao injetar permissão:", err);
  }
}

forceAdmin();
