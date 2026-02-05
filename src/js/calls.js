
import { VOX_CONFIG } from './config.js';
import { sysLog } from './ui.js';
import { onCallEvent } from './agentStatus.js';


let currentCall = null;
let isMicActive = true;
let isCamActive = true;

function updateCallButton({ text, enabled, style }) {
  const btn = document.getElementById('callBtn');
  if (!btn) return;

  btn.innerText = text;
  btn.disabled = !enabled;

  btn.className =
    'px-10 py-3.5 rounded-2xl font-bold tracking-widest transition-all shadow-lg active:scale-95';

  if (!enabled) {
    btn.classList.add('bg-slate-700', 'text-slate-400', 'cursor-not-allowed');
  } else if (style === 'answer') {
    btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500', 'text-white');
  } else if (style === 'hangup') {
    btn.classList.add('bg-rose-600', 'hover:bg-rose-500', 'text-white');
  }
}

export function setupCallHandlers() {
  const sdk = VoxImplant.getInstance();

  sdk.on(VoxImplant.Events.IncomingCall, (e) => {
    onCallEvent('INCOMING_CALL');
    console.log('[CALLS] ========== IncomingCall recibido ==========');
    sysLog('¡Llamada entrante detectada!');
    currentCall = e.call;
    updateCallButton({
      text: 'RESPONDER LLAMADA',
      enabled: true,
      style: 'answer',
    });

    handleCallEvents(currentCall);
  });

  setInterval(relocateOrphanVideos, 200);

  updateCallButton({
    text: 'ESPERANDO LLAMADA',
    enabled: false,
  });
}

function handleCallEvents(call) {
  if (!call) return;

  console.log('[CALLS] handleCallEvents inicializado');

  call.on(VoxImplant.CallEvents.LocalVideoStreamAdded, (event) => {
    console.log('[CALLS] 📷 LocalVideoStreamAdded - IGNORADO (preview permanente activo)');
  });

  call.on(VoxImplant.CallEvents.RemoteVideoStreamAdded, (event) => {
    console.log('[CALLS] 🎥 RemoteVideoStreamAdded - VIDEO DEL CLIENTE');
    
    const mainContainer = document.getElementById('localVideoContainer');
    if (mainContainer) {
      mainContainer.innerHTML = '';
      event.videoStream.render(mainContainer);
      console.log('[CALLS] ✅ Video REMOTO en localVideoContainer (GRANDE)');
      sysLog('🎥 Video del cliente activo');
      
      setTimeout(() => {
        const video = mainContainer.querySelector('video');
        if (video) {
          video.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            position: relative !important;
          `;
        }
      }, 100);
    }
  });

  try {
    if (typeof call.getEndpoints === 'function') {
      call.getEndpoints().forEach(attachEndpointHandlers);
    }
  } catch (err) {
    console.error('[CALLS] Error con endpoints:', err);
  }

  call.on(VoxImplant.CallEvents.EndpointAdded, (e) => {
    attachEndpointHandlers(e.endpoint);
  });

  call.on(VoxImplant.CallEvents.Connected, () => {
    console.log('[CALLS] ✅ Connected');
    sysLog('Llamada establecida');
    updateCallButton({
      text: 'FINALIZAR LLAMADA',
      enabled: true,
      style: 'hangup',
    });
    onCallEvent('CALL_CONNECTED');
  });

  call.on(VoxImplant.CallEvents.Disconnected, async () => {
    console.log('[CALLS] Disconnected');
    sysLog('Llamada finalizada');
    currentCall = null;
    
    await onCallEvent('CALL_DISCONNECTED');
    resetUI();
    
    updateCallButton({
      text: 'ESPERANDO LLAMADA',
      enabled: false,
    });
  });

  call.on(VoxImplant.CallEvents.Failed, (e) => {
    console.log('[CALLS] Failed:', e.reason);
    sysLog(`Error: ${e.reason}`, true);
    currentCall = null;
    updateCallButton({
      text: 'ESPERANDO LLAMADA',
      enabled: false,
    });
    resetUI();
  });
}

function attachEndpointHandlers(endpoint) {
  if (!endpoint) return;

  endpoint.on(VoxImplant.EndpointEvents.RemoteVideoStreamAdded, (ev) => {
    console.log('[CALLS] 🎥 Endpoint RemoteVideoStreamAdded');
    
    const mainContainer = document.getElementById('localVideoContainer');
    if (mainContainer) {
      mainContainer.innerHTML = '';
      ev.videoStream.render(mainContainer);
      sysLog('🎥 Video remoto (endpoint)');
    }
  });
}

function relocateOrphanVideos() {
  const allVideos = document.querySelectorAll('video');
  const pipContainer = document.getElementById('remoteVideoContainer');
  const mainContainer = document.getElementById('localVideoContainer');

  if (!pipContainer || !mainContainer) return;

  const videosInPip = pipContainer.querySelectorAll('video').length;
  const videosInMain = mainContainer.querySelectorAll('video').length;

  allVideos.forEach(video => {
    const inPip = pipContainer.contains(video);
    const inMain = mainContainer.contains(video);

    if (!inPip && !inMain) {
      if (videosInPip === 0) {
        pipContainer.appendChild(video);
        video.style.cssText = `
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: relative !important;
        `;
      } else if (videosInMain === 0) {
        mainContainer.appendChild(video);
        video.style.cssText = `
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: relative !important;
        `;
      } else {
        video.remove();
      }
    }
  });
}

export async function toggleCall(destination = '') {
  if (currentCall) {
    const state = currentCall.state && currentCall.state();

    if (state === VoxImplant.CallState.ALERTING || state === 'ALERTING') {
      sysLog('Contestando...');
      try {
        currentCall.answer(null, {}, { sendVideo: true, receiveVideo: true });
      } catch (e) {
        console.error('[CALLS] Error al contestar:', e);
      }
    } else {
      sysLog('Finalizando...');
      try {
        currentCall.hangup();
      } catch (e) {
        console.error('[CALLS] Error al colgar:', e);
      }
    }
  } else if (destination) {
    const sdk = VoxImplant.getInstance();
    try {
      currentCall = sdk.call({
        number: destination,
        video: { sendVideo: true, receiveVideo: true },
      });
      handleCallEvents(currentCall);
    } catch (e) {
      console.error('[CALLS] Error al iniciar llamada:', e);
    }
  }
}

export function toggleLocalAudio() {
  if (!currentCall) return true;

  isMicActive = !isMicActive;

  try {
    const video = document.querySelector('video');
    if (!video || !video.srcObject) return isMicActive;

    const stream = video.srcObject;
    const audioTracks = stream.getAudioTracks();

    audioTracks.forEach(track => {
      track.enabled = isMicActive;
    });

    sysLog(isMicActive ? '🎤 Micrófono activado' : '🔇 Micrófono silenciado');
  } catch (e) {
    console.error('[CALLS] Error toggling audio track:', e);
  }

  return isMicActive;
}

export function toggleLocalVideo() {
  if (currentCall) {
    isCamActive = !isCamActive;
    try {
      currentCall.sendVideo(isCamActive);
    } catch (e) {
      console.error('[CALLS] Error sendVideo:', e);
    }
    return isCamActive;
  }
  return true;
}

function resetUI() {
  const mainContainer = document.getElementById('localVideoContainer');

  if (mainContainer) {
    mainContainer.innerHTML = `
      <div class="text-center flex items-center justify-center h-full">
        <div>
          <div class="text-5xl mb-4 opacity-10">📞</div>
          <p class="font-mono text-xs uppercase tracking-widest text-slate-500">
            Esperando conexión
          </p>
        </div>
      </div>`;
  }
}