import { loginProcess } from './auth.js';
import { ui, sysLog, updateAuthUI } from './ui.js';
import { showLocalPreview } from './media.js';
import {
  setupCallHandlers,
  toggleCall,
  toggleLocalVideo,
  toggleLocalAudio,
} from './calls.js';
import { initAgentStatus } from './agentStatus.js';


const ERROR_MAP = {
  AuthResult: 'Usuario o contraseña incorrectos',
  InvalidCredentials: 'Credenciales no válidas',
  ConnectionNodeError: 'Error de conexión con el nodo',
  default: 'Ocurrió un error inesperado',
};

document.addEventListener('click', (e) => {
  console.log('[GLOBAL CLICK]', e.target);
});

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

    updateAuthUI('Sincronizando cámara...', 'text-emerald-400');

    await showLocalPreview();

    setTimeout(() => {
      if (ui.overlay) {
        ui.overlay.classList.add('opacity-0', 'pointer-events-none');
      }
      sysLog('Dashboard listo');
      initAgentStatus();
    }, 800);
  } else {
    const friendlyError = ERROR_MAP[result.error] || ERROR_MAP.default;
    sysLog(`Error de acceso: ${result.error}`, true);
    updateAuthUI(friendlyError, 'text-rose-500 font-bold');
    ui.loginBtn.disabled = false;
    ui.loginBtn.innerText = 'REINTENTAR';
  }
});


document.getElementById('callBtn')?.addEventListener('click', () => {
  const destination = document.getElementById('callTo')?.value.trim();
  toggleCall(destination);
});

document.getElementById('toggleMic')?.addEventListener('click', (e) => {
  const isActive = toggleLocalAudio();
  
  if (isActive) {
    e.currentTarget.classList.remove('bg-rose-600');
    e.currentTarget.classList.add('bg-slate-800');
    e.currentTarget.innerHTML = '🎤';
  } else {
    e.currentTarget.classList.remove('bg-slate-800');
    e.currentTarget.classList.add('bg-rose-600');
    e.currentTarget.innerHTML = '🔇';
  }
});