// js/calls.js - SOLUCIÓN DEFINITIVA: position relative + CSS ultra-agresivo

import { VOX_CONFIG } from './config.js';
import { sysLog } from './ui.js';

let currentCall = null;
let isMicActive = true;
let isCamActive = true;
let pendingLocalVideo = false;
let pendingRemoteVideo = false;

export function setupCallHandlers() {
  const sdk = VoxImplant.getInstance();

  // CRÍTICO: Asegurar que los contenedores tengan position relative
  ensureContainersReady();

  sdk.on(VoxImplant.Events.IncomingCall, (e) => {
    console.log('[CALLS] IncomingCall recibido', e);
    sysLog('¡Llamada entrante detectada!');
    currentCall = e.call;
    handleCallEvents(currentCall);
  });

  // Monitor para gestionar videos
  setInterval(manageVideos, 300);
}

/**
 * CRÍTICO: Asegurar que los contenedores tengan el CSS correcto
 */
function ensureContainersReady() {
  const localContainer = document.getElementById('localVideoContainer');
  const remoteContainer = document.getElementById('remoteVideoContainer');

  if (localContainer) {
    localContainer.style.position = 'relative';
    localContainer.style.overflow = 'hidden';
    console.log('[CALLS] ✅ localVideoContainer configurado con position: relative');
  }

  if (remoteContainer) {
    remoteContainer.style.position = 'relative';
    remoteContainer.style.overflow = 'hidden';
    console.log('[CALLS] ✅ remoteVideoContainer configurado con position: relative');
  }
}

/**
 * Busca y mueve videos huérfanos a sus contenedores correctos
 */
function manageVideos() {
  const allVideos = document.querySelectorAll('video');
  const localContainer = document.getElementById('localVideoContainer');
  const remoteContainer = document.getElementById('remoteVideoContainer');

  if (!localContainer || !remoteContainer) return;

  allVideos.forEach(video => {
    const inLocal = localContainer.contains(video);
    const inRemote = remoteContainer.contains(video);

    // Si el video no está en ninguno de los dos contenedores, es huérfano
    if (!inLocal && !inRemote) {
      console.log('[CALLS] 🔍 Video huérfano detectado');
      
      // Decidir a dónde moverlo según qué está pendiente
      if (pendingRemoteVideo) {
        // Video remoto va al contenedor GRANDE (localVideoContainer)
        console.log('[CALLS] 🎥 Moviendo video REMOTO a localVideoContainer (GRANDE)');
        localContainer.innerHTML = '';
        localContainer.appendChild(video);
        forceVideoIntoContainer(video);
        pendingRemoteVideo = false;
        sysLog('🎥 Video remoto en pantalla grande');
      } else if (pendingLocalVideo) {
        // Video local va al contenedor PEQUEÑO (remoteVideoContainer)
        console.log('[CALLS] 📷 Moviendo video LOCAL a remoteVideoContainer (PIP)');
        remoteContainer.innerHTML = '';
        remoteContainer.appendChild(video);
        forceVideoIntoContainer(video);
        pendingLocalVideo = false;
        sysLog('📷 Video local en PIP');
      }
    }
  });
}

/**
 * Fuerza el video a quedarse dentro del contenedor
 */
function forceVideoIntoContainer(video) {
  // CSS ULTRA AGRESIVO para mantener el video dentro
  video.style.cssText = `
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: cover !important;
    background: #0f172a !important;
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
  `;
  
  console.log('[CALLS] ✅ CSS ultra-agresivo aplicado al video');
  console.log('[CALLS] Video parent:', video.parentElement?.id);
}

function handleCallEvents(call) {
  if (!call) return;

  console.log('[CALLS] ========== handleCallEvents inicializado ==========');

  // LocalVideoStreamAdded: video local va al PIP (remoteVideoContainer - que se ve pequeño)
  call.on(VoxImplant.CallEvents.LocalVideoStreamAdded, (event) => {
    console.log('[CALLS] 📷 LocalVideoStreamAdded disparado');
    
    // Marcar que esperamos un video local
    pendingLocalVideo = true;
    
    // Renderizar sin contenedor
    event.videoStream.render();
    console.log('[CALLS] render() llamado para video LOCAL (sin contenedor)');
  });

  // RemoteVideoStreamAdded: video remoto va a la pantalla principal (localVideoContainer - que se ve grande)
  call.on(VoxImplant.CallEvents.RemoteVideoStreamAdded, (event) => {
    console.log('[CALLS] 🎥🎥🎥 RemoteVideoStreamAdded disparado 🎥🎥🎥');
    
    // Marcar que esperamos un video remoto
    pendingRemoteVideo = true;
    
    // Renderizar sin contenedor
    event.videoStream.render();
    console.log('[CALLS] render() llamado para video REMOTO (sin contenedor)');
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
    pendingLocalVideo = false;
    pendingRemoteVideo = false;
    resetUI();
  });

  call.on(VoxImplant.CallEvents.Failed, (e) => {
    console.log('[CALLS] Failed:', e.reason);
    sysLog(`Error: ${e.reason}`, true);
    currentCall = null;
    pendingLocalVideo = false;
    pendingRemoteVideo = false;
    resetUI();
  });
}

function attachEndpointHandlers(endpoint) {
  if (!endpoint) return;

  endpoint.on(VoxImplant.EndpointEvents.RemoteVideoStreamAdded, (ev) => {
    console.log('[CALLS] 🎥 Endpoint RemoteVideoStreamAdded disparado');
    pendingRemoteVideo = true;
    ev.videoStream.render();
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
  const remote = document.getElementById('remoteVideoContainer');
  const local = document.getElementById('localVideoContainer');

  if (local) {
    local.innerHTML = `
      <div class="text-center flex items-center justify-center h-full">
        <div>
          <div class="text-5xl mb-4 opacity-10">📞</div>
          <p class="font-mono text-xs uppercase tracking-widest text-slate-500">
            Esperando conexión
          </p>
        </div>
      </div>`;
  }

  if (remote) {
    remote.innerHTML = `
      <div id="localVideoSpinner" class="flex flex-col items-center animate-pulse justify-center h-full">
        <div class="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>`;
  }

  // Limpiar cualquier video huérfano
  const allVideos = document.querySelectorAll('video');
  allVideos.forEach(video => {
    if (!local.contains(video) && !remote.contains(video)) {
      video.remove();
    }
  });
}