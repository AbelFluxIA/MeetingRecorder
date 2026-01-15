document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const statusDiv = document.getElementById('status');

  // Recupera estado salvo (opcional, para persistir entre fechamentos do popup)
  chrome.storage.local.get(['isRecording'], (result) => {
    if (result.isRecording) {
      toggleButtons(true);
    }
  });

  btnStart.addEventListener('click', () => {
    chrome.runtime.sendMessage({ target: 'background', type: 'START_RECORDING' });
    toggleButtons(true);
    chrome.storage.local.set({ isRecording: true });
  });

  btnStop.addEventListener('click', () => {
    chrome.runtime.sendMessage({ target: 'background', type: 'STOP_RECORDING' });
    toggleButtons(false);
    chrome.storage.local.set({ isRecording: false });
  });

  function toggleButtons(isRecording) {
    if (isRecording) {
      btnStart.style.display = 'none';
      btnStop.style.display = 'block';
      statusDiv.textContent = 'Gravando...';
      statusDiv.style.color = 'red';
    } else {
      btnStart.style.display = 'block';
      btnStop.style.display = 'none';
      statusDiv.textContent = 'Processando e Enviando...';
      statusDiv.style.color = '#666';
      
      // Reseta o texto após alguns segundos
      setTimeout(() => {
         statusDiv.textContent = 'Pronto para gravar';
      }, 3000);
    }
  }
});
