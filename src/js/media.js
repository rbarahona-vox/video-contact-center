// js/media.js - VERSIÓN ULTRA AGRESIVA
import { VOX_CONFIG } from './config.js';
import { sysLog } from './ui.js';

export async function showLocalPreview() {
  console.log('MEDIA: ========== Iniciando preview de video local ==========');

  // El preview debe ir al PIP pequeño (remoteVideoContainer)
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

    // CRÍTICO: Iniciamos el monitor ANTES de llamar showLocalVideo
    const monitorInterval = setInterval(() => {
      moveOrphanVideosToPreview(container);
    }, 100);

    // Llamamos showLocalVideo
    await sdk.showLocalVideo(true);

    console.log('MEDIA: showLocalVideo ejecutado');
    
    // Esperamos un poco más y detenemos el monitor
    setTimeout(() => {
      clearInterval(monitorInterval);
      // Una última verificación
      moveOrphanVideosToPreview(container);
      console.log('MEDIA: Monitor de preview detenido');
    }, 2000);

    sysLog('📷 Cámara local inicializada');
    return true;
  } catch (e) {
    console.error('MEDIA: Error en showLocalPreview', e);
    sysLog('Error al iniciar preview de cámara', true);
    return false;
  }
}

function moveOrphanVideosToPreview(targetContainer) {
  const allVideos = document.querySelectorAll('video');
  const localContainer = document.getElementById('localVideoContainer');
  
  allVideos.forEach(video => {
    // Si el video no está en ninguno de los dos contenedores
    if (!targetContainer.contains(video) && !localContainer.contains(video)) {
      console.log('MEDIA: 🎯 Video huérfano detectado, moviendo a remoteVideoContainer (PIP)');
      
      // Limpiamos y movemos
      targetContainer.innerHTML = '';
      targetContainer.appendChild(video);
      
      // Aplicamos estilos agresivos
      video.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        position: relative !important;
        top: 0 !important;
        left: 0 !important;
        display: block !important;
      `;
      
      console.log('MEDIA: ✅ Video preview movido y estilizado');
    }
  });
}