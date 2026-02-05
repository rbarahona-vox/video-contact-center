import { ui, sysLog } from './ui.js';

const sdk = VoxImplant.getInstance();

let currentStatus = null;
const ACD = VoxImplant.OperatorACDStatuses;

const ACD_LABELS = {
  [ACD.OFFLINE]: 'OFFLINE',
  [ACD.ONLINE]: 'ONLINE',
  [ACD.READY]: 'READY',
  [ACD.DND]: 'DND',
  [ACD.DIALING]: 'DIALING',
  [ACD.INSERVICE]: 'IN SERVICE',
  [ACD.AFTERSERVICE]: 'AFTER SERVICE',
  [ACD.BANNED]: 'BANNED',
};


const MANUAL_STATUSES = [
  ACD.OFFLINE,
  ACD.ONLINE,
  ACD.READY,
  ACD.DND,
];

const STATUS_TRANSITIONS = {
  OFFLINE: [ACD.ONLINE],
  ONLINE: [ACD.READY, ACD.DND, ACD.OFFLINE],
  READY: [ACD.DND, ACD.OFFLINE],
  DND: [ACD.ONLINE, ACD.OFFLINE],
};


function getAvailableStatuses(current) {
  const key = current.toUpperCase();
  return STATUS_TRANSITIONS[key] || [];
}


const AUTO_STATUSES = [
  ACD.DIALING,
  ACD.INSERVICE,
  ACD.AFTERSERVICE,
  ACD.BANNED,
];

/**
 * Inicializa listeners de estado ACD
 */
export function initAgentStatus() {
  // 1️⃣ Inicializar UI y listeners SIEMPRE
  makeStatusClickable();

  // 2️⃣ Intentar obtener estado ACD cuando esté listo
  sdk.getOperatorACDStatus()
    .then((initialStatus) => {
      if (initialStatus) {
        currentStatus = initialStatus;
        renderStatus(initialStatus);
        sysLog(`Estado SmartQueue inicial detectado: ${initialStatus}`);
      } else {
        currentStatus = ACD.OFFLINE;
        renderStatus(ACD.OFFLINE);
        sysLog('Estado SmartQueue inicial no disponible, usando OFFLINE');
      }
    })
    .catch((e) => {
      console.warn('ACD aún no disponible, usando OFFLINE temporal', e);
      currentStatus = ACD.OFFLINE;
      renderStatus(ACD.OFFLINE);
    });

  // 3️⃣ Escuchar cambios reales posteriores
  sdk.on(VoxImplant.Events.OperatorACDStatusChanged, (e) => {
    currentStatus = e.status;
    renderStatus(e.status);
    closeStatusMenu();
    sysLog(`Estado SmartQueue: ${e.status}`);
  });
}



/**
 * Actualiza el UI del badge superior
 */
function renderStatus(status) {
  if (!ui.statusText || !ui.indicator) return;

    ui.statusText.innerText = ACD_LABELS[status] || status;

  ui.indicator.className = 'w-2.5 h-2.5 rounded-full transition-all';

  switch (status) {
    case ACD.READY:
      ui.indicator.classList.add('bg-emerald-500');
      break;

    case ACD.ONLINE:
      ui.indicator.classList.add('bg-blue-500');
      break;

    case ACD.DND:
      ui.indicator.classList.add('bg-amber-500');
      break;

    case ACD.DIALING:
    case ACD.INSERVICE:
      ui.indicator.classList.add('bg-purple-500', 'animate-pulse');
      break;

    case ACD.AFTERSERVICE:
      ui.indicator.classList.add('bg-indigo-500', 'animate-pulse');
      break;

    case ACD.BANNED:
      ui.indicator.classList.add('bg-rose-700', 'animate-pulse');
      break;

    default:
      ui.indicator.classList.add('bg-slate-600');
  }
}


/**
 * Convierte el badge en botón con restricciones
 */
function makeStatusClickable() {
    console.log('[ACD] makeStatusClickable inicializado');

  const container = document.getElementById('connectionStatus');
  container.style.pointerEvents = 'auto';
container.style.zIndex = '9999';
container.style.position = 'relative';
  if (!container) {
    console.warn('[ACD] #connectionStatus no encontrado');
    return;
  }
  
  if (!container) return;

  container.style.cursor = 'pointer';

  container.addEventListener('click', (e) => {
      console.group('[ACD CLICK DEBUG]');
  console.log('currentStatus:', currentStatus);
  console.log('typeof currentStatus:', typeof currentStatus);
  console.log('STATUS_TRANSITIONS keys:', Object.keys(STATUS_TRANSITIONS));
  console.log(
    'STATUS_TRANSITIONS[currentStatus]:',
    STATUS_TRANSITIONS[currentStatus]
  );
  console.log(
    'getAvailableStatuses(currentStatus):',
    getAvailableStatuses(currentStatus)
  );
  console.groupEnd();

  console.log('[ACD CLICK] recibido', currentStatus);

    e.stopPropagation();

    if (!currentStatus) {
    sysLog('Estado ACD aún no disponible, espera un momento…');
    return;
    }


    if (AUTO_STATUSES.includes(currentStatus)) {
      sysLog(`Estado ${currentStatus}: cambio no permitido`, true);
      return;
    }

    toggleStatusMenu(container);
  });

document.addEventListener('click', (e) => {
  const menu = document.getElementById('acdStatusMenu');
  const container = document.getElementById('connectionStatus');

  if (!menu) return;

  // Si el click fue dentro del badge o del menú, NO cerrar
  if (container.contains(e.target) || menu.contains(e.target)) {
    return;
  }

  closeStatusMenu();
});
}

function toggleStatusMenu(container) {
     console.group('[ACD TOGGLE MENU]');
  console.log('container exists:', !!container);
  console.log('currentStatus:', currentStatus);
  console.log(
    'available options:',
    getAvailableStatuses(currentStatus)
  );
  console.groupEnd();
  const existing = document.getElementById('acdStatusMenu');
  if (existing) {
    existing.remove();
    return;
  }

  const options = getAvailableStatuses(currentStatus);
  if (!options.length) return;
  console.log('[ACD MENU] opciones:', options);

  const menu = document.createElement('div');
  menu.id = 'acdStatusMenu';
  menu.className =
  'absolute top-full right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[9999] text-[10px] font-mono';


  options.forEach((status) => {
    const item = document.createElement('div');
    item.className =
      'px-4 py-2 cursor-pointer hover:bg-slate-700 uppercase tracking-widest';
    item.innerText = ACD_LABELS[status] || status;

    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      await changeStatus(status);
      menu.remove();
    });

    menu.appendChild(item);
  });

  container.style.position = 'relative';
  container.appendChild(menu);
}

function closeStatusMenu() {
  const menu = document.getElementById('acdStatusMenu');
  if (menu) menu.remove();
}

async function changeStatus(next) {
  try {
    await sdk.setOperatorACDStatus(
    typeof next === 'string' ? next.toUpperCase() : String(next).toUpperCase()
    );
    // WebSDK v4 → repaint inmediato
    currentStatus = next;
    renderStatus(next);

    sysLog(`Estado cambiado a ${String(next).toUpperCase()}`);
  } catch (e) {
    console.error('Error cambiando estado:', e);
    sysLog(`No se pudo cambiar a ${next}`, true);
  }
}
