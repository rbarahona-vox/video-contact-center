// js/calls.js - VERSIÓN ULTRA SIMPLIFICADA Y AGRESIVA

import { VOX_CONFIG } from './config.js';
import { sysLog } from './ui.js';

let currentCall = null;
let isMicActive = true;
let isCamActive = true;

export function setupCallHandlers() {
  const sdk = VoxImplant.getInstance();

  sdk.on(VoxImplant.Events.IncomingCall, (e) => {
    console.log('[CALLS] ========== IncomingCall recibido ==========');
    sysLog('¡Llamada entrante detectada!');
    currentCall = e.call;
    handleCallEvents(currentCall);
  });

  // Monitor continuo más agresivo
  setInterval(relocateOrphanVideos, 200);
}

function handleCallEvents(call) {
  if (!call) return;

  console.log('[CALLS] handleCallEvents inicializado');

  // LocalVideoStreamAdded: MI video → debe ir al PIP PEQUEÑO (remoteVideoContainer)
  call.on(VoxImplant.CallEvents.LocalVideoStreamAdded, (event) => {
    console.log('[CALLS] 📷📷📷 LocalVideoStreamAdded - MI VIDEO 📷📷📷');
    
    const pipContainer = document.getElementById('remoteVideoContainer');
    if (pipContainer) {
      pipContainer.innerHTML = '';
      event.videoStream.render(pipContainer);
      console.log('[CALLS] ✅ Video LOCAL renderizado en remoteVideoContainer (PIP)');
      sysLog('📷 Mi video activo');
      
      // Forzar estilo
      setTimeout(() => {
        const video = pipContainer.querySelector('video');
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

  // RemoteVideoStreamAdded: video del CLIENTE → debe ir a PANTALLA GRANDE (localVideoContainer)
  call.on(VoxImplant.CallEvents.RemoteVideoStreamAdded, (event) => {
    console.log('[CALLS] 🎥🎥🎥 RemoteVideoStreamAdded - VIDEO DEL CLIENTE 🎥🎥🎥');
    
    const mainContainer = document.getElementById('localVideoContainer');
    if (mainContainer) {
      mainContainer.innerHTML = '';
      event.videoStream.render(mainContainer);
      console.log('[CALLS] ✅ Video REMOTO renderizado en localVideoContainer (GRANDE)');
      sysLog('🎥 Video del cliente activo');
      
      // Forzar estilo
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
  });

  call.on(VoxImplant.CallEvents.Disconnected, () => {
    console.log('[CALLS] Disconnected');
    sysLog('Llamada finalizada');
    currentCall = null;
    resetUI();
  });

  call.on(VoxImplant.CallEvents.Failed, (e) => {
    console.log('[CALLS] Failed:', e.reason);
    sysLog(`Error: ${e.reason}`, true);
    currentCall = null;
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

/**
 * Busca videos huérfanos y los mueve a sus contenedores
 */
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

    // Si el video está huérfano (fuera de ambos contenedores)
    if (!inPip && !inMain) {
      console.warn('[CALLS] 🚨 VIDEO HUÉRFANO DETECTADO 🚨');
      console.log('[CALLS] Videos en PIP:', videosInPip, 'Videos en Main:', videosInMain);
      
      // Si no hay videos en el PIP, este huérfano va ahí (es el preview o video local)
      if (videosInPip === 0) {
        console.log('[CALLS] ➡️ Moviendo huérfano a PIP (remoteVideoContainer)');
        pipContainer.appendChild(video);
        video.style.cssText = `
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: relative !important;
        `;
      }
      // Si no hay videos en la pantalla principal, este huérfano va ahí
      else if (videosInMain === 0) {
        console.log('[CALLS] ➡️ Moviendo huérfano a PANTALLA GRANDE (localVideoContainer)');
        mainContainer.appendChild(video);
        video.style.cssText = `
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          position: relative !important;
        `;
      }
      // Si ambos contenedores ya tienen video, eliminamos el huérfano
      else {
        console.log('[CALLS] 🗑️ Eliminando video huérfano redundante');
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
  if (currentCall) {
    isMicActive = !isMicActive;
    try {
      currentCall.sendAudio(isMicActive);
    } catch (e) {
      console.error('[CALLS] Error sendAudio:', e);
    }
    return isMicActive;
  }
  return true;
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
  const pipContainer = document.getElementById('remoteVideoContainer');

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

  if (pipContainer) {
    pipContainer.innerHTML = `
      <div id="localVideoSpinner" class="flex flex-col items-center animate-pulse justify-center h-full">
        <div class="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>`;
  }

  // Eliminar todos los videos huérfanos
  const allVideos = document.querySelectorAll('video');
  allVideos.forEach(video => {
    if (!mainContainer.contains(video) && !pipContainer.contains(video)) {
      console.log('[CALLS] Removiendo video huérfano en reset');
      video.remove();
    }
  });
}