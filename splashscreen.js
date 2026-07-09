/* =============================================
   SPLASH SCREEN — Duo Fitness Site Oficial
   ============================================= */
(function () {
  const splash = document.getElementById('splash');
  const video  = document.getElementById('splash-video');

  function esconderSplash() {
    splash.style.transition = 'opacity 0.8s ease';
    splash.style.opacity = '0';
    document.body.style.overflow = ''
    setTimeout(() => splash.remove(), 600);
  }

  // Se o vídeo já terminou quando o script carregou
  if (video.ended || video.paused) {
    esconderSplash();
    return;
  }

  video.addEventListener('ended', esconderSplash);
  video.addEventListener('error', esconderSplash);

  // Fallback baseado na duração real do vídeo
  video.addEventListener('loadedmetadata', () => {
    setTimeout(esconderSplash, (video.duration * 600) + 500);
  });

  // Fallback absoluto
  setTimeout(esconderSplash, 15000);
})();