# SGA App

Aplicação desktop Electron para exibir os painéis do SGA em Windows.

## Características

- Browser interno para `https://sga-sociiz.netlify.app/triagem` e `https://sga-sociiz.netlify.app/painel`
- Tela cheia com modo kiosk para bloquear menu iniciar / taskbar
- Configurações locais para salvar token de triagem
- Controle de modo tela cheia (kiosk) e retorno ao Windows quando desligado

## Instalação

1. Abra um terminal em `C:\Users\Arthu\sga-app`
2. Execute:

```powershell
npm install
```

## Uso

- `npm start` — inicia em modo de desenvolvimento
- `npm run package` — empacota o app para Windows
- `npm run make` — gera instalador `squirrel` e ZIP

## Observações sobre empacotamento

Este projeto usa o Electron Forge para simplificar a criação e empacotamento. Para gerar o EXE, execute `npm run make`.

> Se você quiser uma entrega em um único arquivo EXE puro, a alternativa mais adequada no futuro é `electron-builder` com o maker `portable`. Mas, para um fluxo simples e rápido, `electron-forge` é a melhor escolha inicial.

## Configurações

- `Token de triagem`: valor enviado na URL de triagem
- `Modo tela cheia / kiosk`: bloqueia o Windows quando ativado

## Nota

A aplicação controla o modo kiosk do Electron, mas o bloqueio completo do Windows depende do sistema operacional. Use o modo kiosk para reduzir a exposição ao menu iniciar e à barra de tarefas.
