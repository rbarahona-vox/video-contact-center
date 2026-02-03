// js/main.js

import { loginProcess } from './auth.js';
import { ui, sysLog, updateAuthUI } from './ui.js';
import { showLocalPreview } from './media.js';
import {
  setupCallHandlers,
  toggleCall,
  toggleLocalVideo,
  toggleLocalAudio,
} from './calls.js';

const ERROR_MAP = {
  AuthResult: 'Usuario o contraseña incorrectos',
  InvalidCredentials: 'Credenciales no válidas',
  ConnectionNodeError: 'Error de conexión con el nodo',
  default: 'Ocurrió un error inesperado',
};

ui.loginBtn.addEventListener('click', async () => {
  const user = document.getElementById('username')?.value.trim();
  const pass = document.getElementById('password')?.value;

  if (!user || !pass) {
    updateAuthUI('Por favor, rellena todos los campos', 'text-rose-500 font-bold');
    return;
  }

  ui.loginBtn.disabled = true;
  updateAuthUI('Validando cuenta...', 'text-blue-400 animate-pulse');

  const result = await loginProcess(user, pass);

  if (result.success) {
    sysLog('Autenticación exitosa');
    setupCallHandlers();

    if (ui.displayUser) ui.displayUser.innerText = result.user;

    if (ui.indicator)
      ui.indicator.className =
        'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50';
    if (ui.statusText) ui.statusText.innerText = 'ONLINE';

    updateAuthUI('Sincronizando cámara...', 'text-emerald-400');

    // Preview local (flotante). El PIP se pintará con LocalVideoStreamAdded.
    await showLocalPreview();

    setTimeout(() => {
      if (ui.overlay) {
        ui.overlay.classList.add('opacity-0', 'pointer-events-none');
      }
      sysLog('Dashboard listo');

      activarSmartQueue();
    }, 800);
  } else {
    const friendlyError = ERROR_MAP[result.error] || ERROR_MAP.default;
    sysLog(`Error de acceso: ${result.error}`, true);
    updateAuthUI(friendlyError, 'text-rose-500 font-bold');
    ui.loginBtn.disabled = false;
    ui.loginBtn.innerText = 'REINTENTAR';
  }
});

async function activarSmartQueue() {
  const sdk = VoxImplant.getInstance();
  const state = sdk.getClientState();

  if (state !== 'LOGGED_IN' && state !== 'CONNECTED') {
    setTimeout(activarSmartQueue, 2000);
    return;
  }

  try {
    sysLog('Sincronizando con SmartQueues...');

    await sdk.setOperatorACDStatus('READY');

    sysLog('Estado: ONLINE (Ready)');
    console.log('ACD: ¡Estado READY confirmado con string hardcodeado!');

    if (ui.indicator)
      ui.indicator.className =
        'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50';
    if (ui.statusText) ui.statusText.innerText = 'ONLINE';
  } catch (err) {
    console.error('DETALLE ERROR ACD:', err);
    sysLog('Fallo al activar cola. Revisa el rol de Operador.', true);
  }
}

document.getElementById('callBtn')?.addEventListener('click', () => {
  const destination = document.getElementById('callTo')?.value.trim();
  toggleCall(destination);
});

document.getElementById('toggleMic')?.addEventListener('click', (e) => {
  const active = toggleLocalAudio();
  e.currentTarget.classList.toggle('bg-slate-700', !active);
  e.currentTarget.classList.toggle('bg-rose-600', active);
});

document.getElementById('toggleCam')?.addEventListener('click', (e) => {
  const active = toggleLocalVideo();
  e.currentTarget.classList.toggle('bg-slate-700', !active);
  e.currentTarget.classList.toggle('bg-rose-600', active);
});