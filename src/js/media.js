// js/media.js - PARA USAR CON EL HACK CSS
import { VOX_CONFIG } from './config.js';
import { sysLog } from './ui.js';

export async function showLocalPreview() {
  console.log('MEDIA: Iniciando preview de video local');

  // Con el HACK CSS: remoteVideoContainer se VE pequeño
  // Así que queremos renderizar el preview ahí
  const container = document.getElementById('remoteVideoContainer');

  if (!container) {
    console.warn('MEDIA: No se encontró remoteVideoContainer para preview');
    return false;
  }

  try {
    const sdk = VoxImplant.getInstance();

    // Limpiamos el spinner
    const spinner = document.getElementById('localVideoSpinner');
    if (spinner) {
      spinner.remove();
    }

    container.innerHTML = '';

    // Llamamos showLocalVideo
    await sdk.showLocalVideo(true);

    console.log('MEDIA: showLocalVideo llamado, buscando video preview...');
    
    // Buscamos y movemos el video preview al contenedor correcto
    setTimeout(() => {
      const allVideos = document.querySelectorAll('video');
      const localContainer = document.getElementById('localVideoContainer');
      
      allVideos.forEach(video => {
        // Si el video no está en ninguno de los dos contenedores, es el preview
        if (!container.contains(video) && !localContainer.contains(video)) {
          console.log('MEDIA: ✅ Preview encontrado, moviendo a remoteVideoContainer (PIP visual)');
          container.appendChild(video);
          sysLog('📷 Preview local en PIP');
        }
      });
    }, 300);

    return true;
  } catch (e) {
    console.error('MEDIA: Error en showLocalPreview', e);
    sysLog('Error al iniciar preview de cámara', true);
    return false;
  }
}