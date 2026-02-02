// js/media.js
import { VOX_CONFIG } from './config.js';
import { sysLog } from './ui.js';

export async function showLocalPreview() {
  console.log('MEDIA: Iniciando preview de video local');

  // Usamos el ID configurado o el fallback del HTML
  const containerId = VOX_CONFIG.LOCAL_VIDEO_ID || 'localVideoContainer';
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn('MEDIA: No se encontró contenedor para la preview local:', containerId);
    return false;
  }

  try {
    const sdk = VoxImplant.getInstance();

    // Limpiamos cualquier contenido previo
    container.innerHTML = '';

    // Quitamos el spinner si está presente
    const spinner = document.getElementById('localVideoSpinner');
    if (spinner) {
      spinner.remove();
    }

    // WebSDK: muestra el video local en el contenedor indicado
    // Firma habitual: showLocalVideo(boolean, elementId)
    await sdk.showLocalVideo(true, containerId);

    console.log('MEDIA: Preview local renderizada en', containerId);
    sysLog('Cámara local preparada');
    return true;
  } catch (e) {
    console.error('MEDIA: Fallo crítico en showLocalPreview', e);
    sysLog('No se pudo iniciar la vista previa de la cámara', true);
    return false;
  }
}