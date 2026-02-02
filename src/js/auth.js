import { VOX_CONFIG } from './config.js';
import { sysLog, updateAuthUI } from './ui.js';

const sdk = VoxImplant.getInstance();

export async function loginProcess(userAlias, password) {
    const fullUsername = `${userAlias}@${VOX_CONFIG.APP_DOMAIN}`;
    
    try {
        let currentState = sdk.getClientState();
        sysLog(`Estado actual: ${currentState}`);

        // 1. INICIALIZACIÓN CRÍTICA
        if (currentState === null || currentState === "DISCONNECTED") {
            sysLog("Inicializando SDK para SmartQueue...");
            await sdk.init({ 
                node: VOX_CONFIG.ACCOUNT_NODE,
                showVideo: true,
                // ESTO HABILITA LA COMUNICACIÓN CON EL SERVIDOR DE SMARTQUEUES
                queueType: VoxImplant.QueueTypes.SmartQueue 
            });
        }

        // 2. CONEXIÓN AL NODO
        currentState = sdk.getClientState();
        if (currentState !== "CONNECTED" && currentState !== "LOGGING_IN" && currentState !== "LOGGED_IN") {
            sysLog("Estableciendo conexión...");
            await sdk.connect();
        }

        // 3. AUTENTICACIÓN
        sysLog(`Autenticando: ${userAlias}...`);
        await sdk.login(fullUsername, password);
        
        // El SDK a veces pasa a LOGGED_IN pero getClientState() tarda en reflejarlo
        sysLog("Autenticación exitosa");
        return { success: true, user: userAlias };

    } catch (e) {
        console.error("Detalle del error en auth:", e);
        
        // Manejo de sesiones ya activas para evitar bloqueos innecesarios
        if (e.message && (e.message.includes("already") || e.name === "ALREADY_LOGGED_IN")) {
            sysLog("Sesión ya activa, procediendo...");
            return { success: true, user: userAlias };
        }
        
        return { success: false, error: e.name || "Error de conexión" };
    }
}