import { VOX_CONFIG } from './config.js';
import { sysLog } from './ui.js';

let currentCall = null;
let isMicActive = true;
let isCamActive = true;

export function setupCallHandlers() {
  const sdk = VoxImplant.getInstance();

  sdk.on(VoxImplant.Events.IncomingCall, (e) => {
    console.log('[CALLS] IncomingCall recibido', e);
    try {
      console.log('[CALLS] IncomingCall ID:', e.call && e.call.id && e.call.id());
    } catch (_) {}

    sysLog('¡Llamada entrante detectada!');
    currentCall = e.call;
    handleCallEvents(currentCall);
  });
}

function handleCallEvents(call) {
  if (!call) {
    console.warn('[CALLS] handleCallEvents llamado sin call');
    return;
  }

  console.log('[CALLS] handleCallEvents inicializado para call');
  try {
    console.log('[CALLS] ID llamada:', call.id && call.id());
  } catch (_) {}

  // VIDEO LOCAL
  call.on(VoxImplant.CallEvents.LocalVideoStreamAdded, (event) => {
    console.log('[CALLS] LocalVideoStreamAdded', event);

    const localContainer =
      document.getElementById(VOX_CONFIG.LOCAL_VIDEO_ID) ||
      document.getElementById('localVideoContainer');

    if (!localContainer) {
      console.warn('[CALLS] No se encontró contenedor de video local');
      return;
    }

    localContainer.innerHTML = '';
    event.videoStream.render(localContainer);

    sysLog('📷 Video local del agente renderizado (LocalVideoStreamAdded)');
  });

  // ENDPOINTS REMOTOS
  try {
    if (typeof call.getEndpoints === 'function') {
      const existingEndpoints = call.getEndpoints();
      console.log('[CALLS] Endpoints existentes en la llamada:', existingEndpoints.length);
      existingEndpoints.forEach(attachEndpointHandlers);
    } else {
      console.warn('[CALLS] call.getEndpoints no está disponible en este SDK');
    }
  } catch (err) {
    console.error('[CALLS] Error al consultar endpoints existentes:', err);
  }

  call.on(VoxImplant.CallEvents.EndpointAdded, (e) => {
    console.log('[CALLS] EndpointAdded', e);
    sysLog('Cliente detectado en el canal');
    attachEndpointHandlers(e.endpoint);
  });

  // ESTADO
  call.on(VoxImplant.CallEvents.Connected, () => {
    console.log('[CALLS] Evento Connected');
    sysLog('Llamada establecida correctamente');
    call.sendVideo(true);
  });

  call.on(VoxImplant.CallEvents.Disconnected, () => {
    console.log('[CALLS] Evento Disconnected');
    sysLog('Llamada finalizada');
    currentCall = null;
    resetRemoteUI();
  });

  call.on(VoxImplant.CallEvents.Failed, (e) => {
    console.log('[CALLS] Evento Failed', e);
    sysLog(`Error en la llamada: ${e.reason}`, true);
    currentCall = null;
    resetRemoteUI();
  });
}

function attachEndpointHandlers(endpoint) {
  if (!endpoint) {
    console.warn('[CALLS] attachEndpointHandlers llamado sin endpoint');
    return;
  }

  try {
    console.log('[CALLS] attachEndpointHandlers para endpoint, id:', endpoint.id && endpoint.id());
  } catch (_) {}

  endpoint.on(VoxImplant.EndpointEvents.RemoteVideoStreamAdded, (ev) => {
    console.log('[CALLS] RemoteVideoStreamAdded', ev);

    const remoteContainer =
      document.getElementById(VOX_CONFIG.REMOTE_VIDEO_ID) ||
      document.getElementById('remoteVideoContainer');

    if (!remoteContainer) {
      console.warn('[CALLS] No se encontró contenedor de video remoto');
      return;
    }

    remoteContainer.innerHTML = '';
    ev.videoStream.render(remoteContainer);

    sysLog('🎥 Video del cliente renderizado (RemoteVideoStreamAdded)');
  });
}

export async function toggleCall(destination = '') {
  if (currentCall) {
    const state = currentCall.state && currentCall.state();
    console.log('[CALLS] toggleCall con llamada existente. Estado actual:', state);

    if (state === VoxImplant.CallState.ALERTING || state === 'ALERTING') {
      sysLog('Abriendo canal de video...');

      const callSettings = {
        video: {
          sendVideo: true,
          receiveVideo: true,
        },
      };

      try {
        console.log('[CALLS] currentCall.answer() con settings de video', callSettings);
        currentCall.answer(callSettings);
      } catch (e) {
        console.error('[CALLS] Error al hacer answer():', e);
        sysLog('Error al contestar la llamada', true);
      }

    } else {
      sysLog('Terminando sesión...');
      try {
        currentCall.hangup();
      } catch (e) {
        console.error('[CALLS] Error al colgar la llamada:', e);
      }
    }

  } else if (destination) {
    const sdk = VoxImplant.getInstance();
    const callSettings = {
      video: {
        sendVideo: true,
        receiveVideo: true,
      },
    };

    console.log('[CALLS] Iniciando llamada saliente a', destination, 'con settings', callSettings);

    try {
      currentCall = sdk.call(destination, callSettings);
      handleCallEvents(currentCall);
    } catch (e) {
      console.error('[CALLS] Error al iniciar llamada saliente:', e);
      sysLog('No se pudo iniciar la llamada', true);
    }
  } else {
    console.warn('[CALLS] toggleCall llamado sin currentCall y sin destino');
  }
}

export function toggleLocalAudio() {
  if (currentCall) {
    isMicActive = !isMicActive;
    console.log('[CALLS] toggleLocalAudio ->', isMicActive);

    try {
      currentCall.sendAudio(isMicActive);
    } catch (e) {
      console.error('[CALLS] Error en sendAudio:', e);
    }

    return isMicActive;
  }
  return true;
}

export function toggleLocalVideo() {
  if (currentCall) {
    isCamActive = !isCamActive;
    console.log('[CALLS] toggleLocalVideo ->', isCamActive);

    try {
      currentCall.sendVideo(isCamActive);
    } catch (e) {
      console.error('[CALLS] Error en sendVideo:', e);
    }

    return isCamActive;
  }
  return true;
}

function resetRemoteUI() {
  const remoteContainer =
    document.getElementById(VOX_CONFIG.REMOTE_VIDEO_ID) ||
    document.getElementById('remoteVideoContainer');

  if (remoteContainer) {
    remoteContainer.innerHTML = `
      <div class="text-center">
        <div class="text-5xl mb-4 opacity-10">📞</div>
        <p class="font-mono text-xs uppercase tracking-widest text-slate-500">
          Esperando conexión
        </p>
      </div>`;
  }
}