// background.js

// Escuta mensagens do popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.target === 'background') {
    if (message.type === 'START_RECORDING') {
      startRecording(message.streamId);
    } else if (message.type === 'STOP_RECORDING') {
      stopRecording();
    }
  }
});

let creating; // Promise para evitar criação duplicada

async function setupOffscreenDocument(path) {
  // Verifica se já existe um contexto offscreen
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [path]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Cria o documento se não existir
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['USER_MEDIA'],
      justification: 'Recording tab audio for meeting transcription',
    });
    await creating;
    creating = null;
  }
}

async function startRecording(streamId) {
  await setupOffscreenDocument('offscreen.html');
  
  // Obtém o stream ID da aba ativa se não foi passado (segurança extra)
  const tab = await getActiveTab();
  
  // Precisamos pedir o streamId aqui no background para passar ao offscreen
  chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
    // Envia o streamId para o documento offscreen iniciar a gravação
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'START',
      data: streamId
    });
  });
}

async function stopRecording() {
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'STOP'
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}
