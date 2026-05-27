const triagemButton = document.getElementById("triagemButton");
const secretZone = document.getElementById("secret-zone");
const triggerZone = document.getElementById("trigger-zone"); // Nova área invisível do topo
const painelButton = document.getElementById("painelButton");
const configButton = document.getElementById("configButton");
const browserSection = document.getElementById("browserSection");
const configSection = document.getElementById("configSection");
const backButton = document.getElementById("backButton");
const saveButton = document.getElementById("saveButton");
const statusText = document.getElementById("statusText");
const remoteView = document.getElementById("remoteView");
const painelInput = document.getElementById("painelTokenInput");
const triagemInput = document.getElementById("triagemTokenInput");
const kioskCheckbox = document.getElementById("kioskCheckbox");
const footer = document.querySelector("footer");
const headerBar = document.getElementById("adminHeader"); // Atualizado para ID do elemento flutuante

let currentPage = "triagem";
let clickCount = 0;
let clickTimeout;

// Sincroniza estritamente os inputs com o arquivo de configuração
async function loadSettings() {
  const settings = await window.electronAPI.getSettings();

  triagemInput.value = settings.triagemToken || "";
  painelInput.value = settings.painelToken || "";
  kioskCheckbox.checked = settings.kiosk === true;

  triagemInput.type = "password";
  painelInput.type = "password";
}

// Inicialização segura do app
// FORÇA O CARREGAMENTO INICIAL CORRETO
async function initApp() {
  await loadSettings();
  currentPage = "triagem";

  // Pequeno timeout de 200ms para garantir que a tag webview já renderizou no DOM antes de injetar a URL
  setTimeout(async () => {
    await loadPage(currentPage);
  }, 200);
}

async function loadPage(page) {
  currentPage = page;
  let url = "";

  if (page === "triagem") {
    url = await window.electronAPI.getTriagemUrl();
  } else if (page === "painel") {
    url = await window.electronAPI.getPainelUrl();
  }

  // CORREÇÃO: Força a atribuição do SRC e chama o .loadURL() caso ela já tenha inicializado, eliminando o looping da tela escura
  if (remoteView) {
    remoteView.setAttribute("src", url);
    if (typeof remoteView.loadURL === "function") {
      remoteView.loadURL(url);
    }
    statusText.textContent = `${page.charAt(0).toUpperCase() + page.slice(1)} carregando...`;
  }

  console.log(
    `[Renderer] Solicitando página: ${page} -> URL carregada na WebView:`,
    url,
  );

  highlightPageButton(page);
  showBrowser();
}

function showBrowser() {
  browserSection.classList.remove("hidden");
  configSection.classList.add("hidden");
}

function showConfig() {
  browserSection.classList.add("hidden");
  configSection.classList.remove("hidden");
}

async function loadPage(page) {
  currentPage = page;
  let url = "";

  if (page === "triagem") {
    url = await window.electronAPI.getTriagemUrl();
    if (remoteView.getAttribute("src") !== url) {
      remoteView.setAttribute("src", url);
      statusText.textContent = "Triagem carregando...";
    }
  } else if (page === "painel") {
    url = await window.electronAPI.getPainelUrl();
    if (remoteView.getAttribute("src") !== url) {
      remoteView.setAttribute("src", url);
      statusText.textContent = "Painel carregando...";
    }
  }

  console.log(
    `[Renderer] Solicitando página: ${page} -> URL carregada na WebView:`,
    url,
  );

  highlightPageButton(page);
  showBrowser();
}

function highlightPageButton(page) {
  [triagemButton, painelButton].forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
}

// LÓGICA DE ATIVAÇÃO: Três cliques na faixa invisível do topo revelam a barra flutuante por cima do site
function handleSecretActivation() {
  if (headerBar.style.opacity === "0" || headerBar.style.opacity === "") {
    clickCount++;
    clearTimeout(clickTimeout);

    if (clickCount === 3) {
      headerBar.style.opacity = "1";
      headerBar.style.pointerEvents = "auto"; // Ativa cliques nos botões do menu
      statusText.textContent = "Menu administrativo ativado.";
      clickCount = 0;
    } else {
      clickTimeout = setTimeout(() => {
        clickCount = 0;
      }, 800);
    }
  }
}

// EVENTOS DE DISPARO: Pode clicar tanto na zona invisível do topo quanto na logo "SGA" para fechar
triggerZone.addEventListener("click", handleSecretActivation);

secretZone.addEventListener("click", () => {
  // Se clicar em "SGA" com o menu aberto, ele recolhe e esconde
  if (headerBar.style.opacity === "1") {
    headerBar.style.opacity = "0";
    headerBar.style.pointerEvents = "none"; // Desativa cliques para não atrapalhar a WebView
    statusText.textContent = "Modo Kiosk Total ativo.";
    clickCount = 0;
  }
});

triagemButton.addEventListener("click", () => {
  loadPage("triagem");
  // Opcional: Fecha a barra após clicar para liberar visão completa do totem
  headerBar.style.opacity = "0";
  headerBar.style.pointerEvents = "none";
});

painelButton.addEventListener("click", () => {
  loadPage("painel");
  headerBar.style.opacity = "0";
  headerBar.style.pointerEvents = "none";
});

configButton.addEventListener("click", showConfig);

// VOLTAR: Limpa modificações temporárias e restaura o token antigo do banco
backButton.addEventListener("click", async () => {
  statusText.textContent = "Cancelando alterações...";
  await loadSettings();
  showBrowser();
});

// SALVAR: Aguarda gravação física do main process antes de atualizar a WebView
saveButton.addEventListener("click", async () => {
  const triagemToken = triagemInput.value.trim();
  const painelToken = painelInput.value.trim();
  const kiosk = kioskCheckbox.checked;

  statusText.textContent = "Salvando configurações...";

  const updatedSettings = await window.electronAPI.saveSettings({
    triagemToken,
    painelToken,
    kiosk,
    lastPage: currentPage,
  });

  // Atualiza os inputs locais com a resposta real gravada
  triagemInput.value = updatedSettings.triagemToken || "";
  painelInput.value = updatedSettings.painelToken || "";
  kioskCheckbox.checked = updatedSettings.kiosk === true;

  statusText.textContent = "Configurações salvas e aplicadas.";
  await loadPage(currentPage);
});

remoteView.addEventListener("did-finish-load", () => {
  statusText.textContent = `Página ${currentPage} carregada.`;
  // Tratamento do footer escondido caso necessário
  if (currentPage === "triagem" || currentPage === "painel") {
    if (footer) footer.style.display = "none";
  } else {
    if (footer) footer.style.display = "";
  }
});

remoteView.addEventListener("did-fail-load", () => {
  statusText.textContent = "Falha ao carregar o conteúdo remoto.";
});

// Inicializa a aplicação tratando possíveis erros
initApp().catch((error) => {
  console.error(error);
  statusText.textContent = "Erro ao carregar as configurações.";
});
