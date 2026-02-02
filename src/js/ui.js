// js/ui.js

// Objeto UI que usaremos en el resto de módulos
export const ui = {
  overlay: null,
  loginBtn: null,
  initStatus: null,
  logs: null,
  displayUser: null,
  indicator: null,
  statusText: null,
};

/**
 * Mapea los elementos del DOM a las propiedades de `ui`.
 * Lo llamamos cuando el DOM está listo (o inmediatamente si ya lo está).
 */
function mapUIElements() {
  ui.overlay = document.getElementById('authOverlay');
  ui.loginBtn = document.getElementById('mainLoginBtn');
  ui.initStatus = document.getElementById('initStatus');
  ui.logs = document.getElementById('logConsole');
  ui.displayUser = document.getElementById('displayUser');
  ui.indicator = document.getElementById('statusIndicator');
  ui.statusText = document.getElementById('statusText');

  // Log de depuración básico para comprobar que se han encontrado
  console.log('[UI] Elementos mapeados:', {
    overlay: !!ui.overlay,
    loginBtn: !!ui.loginBtn,
    initStatus: !!ui.initStatus,
    logs: !!ui.logs,
    displayUser: !!ui.displayUser,
    indicator: !!ui.indicator,
    statusText: !!ui.statusText,
  });
}

// Nos aseguramos de mapear según el estado actual del documento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mapUIElements);
} else {
  mapUIElements();
}

/**
 * Escribe un mensaje en la consola de sistema del panel derecho.
 * @param {string} msg - Mensaje a mostrar
 * @param {boolean} [isError=false] - Si es error, pinta en rojo
 */
export function sysLog(msg, isError = false) {
  if (!ui.logs) {
    console.warn('[UI] sysLog llamado pero no existe #logConsole todavía');
    return;
  }

  const div = document.createElement('div');
  div.className = isError ? 'text-rose-400 font-bold' : 'text-emerald-500/80';
  div.innerHTML = `<span class="opacity-30">[${new Date().toLocaleTimeString()}]</span> &gt; ${msg}`;

  ui.logs.appendChild(div);
  ui.logs.scrollTop = ui.logs.scrollHeight;
}

/**
 * Actualiza el texto y estilo del mensaje de estado en el overlay de login.
 * @param {string} message - Texto a mostrar
 * @param {string} [colorClass="text-blue-400"] - Clases Tailwind extra de color/estilo
 */
export function updateAuthUI(message, colorClass = 'text-blue-400') {
  if (!ui.initStatus) {
    console.warn('[UI] updateAuthUI llamado pero no existe #initStatus todavía');
    return;
  }

  // Reset básico y luego añadimos las clases específicas
  ui.initStatus.className = 'text-sm mt-4 transition-all duration-300';
  ui.initStatus.classList.add(...colorClass.split(' '));
  ui.initStatus.innerText = message;
}