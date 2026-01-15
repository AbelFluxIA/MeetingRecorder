// offscreen.js
let recorder;
let data = [];

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'START') {
    startRecording(message.data);
  } else if (message.type === 'STOP') {
    stopRecording();
  }
});

async function startRecording(streamId) {
  if (recorder?.state === 'recording') {
    throw new Error('Called startRecording while already recording.');
  }

  // Captura o stream de áudio usando o ID gerado no background
  const media = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: false // Queremos apenas áudio para o Whisper
  });

  // IMPORTANTE: Tocar o áudio de volta para o usuário ouvir a reunião
  // O tabCapture muta a aba original por padrão.
  const output = new AudioContext();
  const source = output.createMediaStreamSource(media);
  source.connect(output.destination);

  // Configura o MediaRecorder
  // Usamos mimeType suportado pelo Chrome
  recorder = new MediaRecorder(media, { mimeType: 'audio/webm' });

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      data.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(data, { type: 'audio/webm' });
    
    // 1. Salvar Localmente (Download)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `meeting-recording-${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click(); // Dispara o download
    
    // Limpeza
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // 2. Enviar para API
    uploadToBackend(blob);
    
    // Limpa o estado
    recorder = undefined;
    data = [];
    
    // Para as faixas de mídia para liberar o ícone de "gravando" na aba
    media.getTracks().forEach(t => t.stop());
  };

  recorder.start();
  console.log('Gravação iniciada no Offscreen');
}

function stopRecording() {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
    console.log('Gravação parada');
  }
}

async function uploadToBackend(blob) {
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  
  // Adicione metadados se necessário
  formData.append('timestamp', new Date().toISOString());

  try {
    // SUBSTITUA PELA SUA URL REAL DO BACKEND
    const response = await fetch('http://localhost:3000/api/upload-audio', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      console.log('Upload concluído com sucesso!');
      // Opcional: Avisar o popup ou background que o upload terminou
    } else {
      console.error('Erro no upload:', response.statusText);
    }
  } catch (error) {
    console.error('Erro de conexão com API:', error);
  }
}
