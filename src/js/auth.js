import { VOX_CONFIG } from './config.js';
import { sysLog } from './ui.js';

const sdk = VoxImplant.getInstance();

export async function loginProcess(userAlias, password) {
  const fullUsername = `${userAlias}@${VOX_CONFIG.APP_DOMAIN}`;

  try {
    let currentState = sdk.getClientState();
    sysLog(`Estado actual: ${currentState}`);
    
    if (currentState === null || currentState === 'DISCONNECTED') {
      sysLog('Inicializando SDK para SmartQueue...');
      await sdk.init({
        node: VOX_CONFIG.ACCOUNT_NODE,
        micRequired: true,
        videoSupport: true,
        queueType: VoxImplant.QueueTypes.SmartQueue,
        progressTone: true,
      });
    }

    currentState = sdk.getClientState();
    if (
      currentState !== 'CONNECTED' &&
      currentState !== 'LOGGING_IN' &&
      currentState !== 'LOGGED_IN'
    ) {
      sysLog('Estableciendo conexión...');
      await sdk.connect();
    }

    sysLog(`Autenticando: ${userAlias}...`);
    await sdk.login(fullUsername, password);

    sysLog('Autenticación exitosa');
    return { success: true, user: userAlias };
  } catch (e) {
    console.error('Detalle del error en auth:', e);

    if (
      e.message &&
      (e.message.includes('already') || e.name === 'ALREADY_LOGGED_IN')
    ) {
      sysLog('Sesión ya activa, procediendo...');
      return { success: true, user: userAlias };
    }

    return { success: false, error: e.name || 'Error de conexión' };
  }
}