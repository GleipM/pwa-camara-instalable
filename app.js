// ===== Referencias al DOM =====
const btnInstalar = document.getElementById('btn-instalar');
const btnPrepararCamara = document.getElementById('btn-preparar-camara');
const avisoPermiso = document.getElementById('aviso-permiso');
const btnConfirmarPermiso = document.getElementById('btn-confirmar-permiso');
const btnAlternarCamara = document.getElementById('btn-alternar-camara');
const btnApagarCamara = document.getElementById('btn-apagar-camara');
const visorVideo = document.getElementById('visor-camara');
const mensajeEstado = document.getElementById('mensaje-estado');

function actualizarMensajeEstado(texto) {
  mensajeEstado.textContent = texto;
}

// ===== 1. Service Worker (Promesas: .then / .catch) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registro) => {
        console.log('Service Worker registrado. Ámbito:', registro.scope);
      })
      .catch((error) => {
        console.error('Error al registrar el Service Worker:', error);
      });
  });
}

// ===== 2. Instalación =====
// Android / Chrome: beforeinstallprompt
let eventoInstalacionDiferido = null;

window.addEventListener('beforeinstallprompt', (event) => {
  // Evita que el mini-banner automático aparezca antes de tiempo
  event.preventDefault();
  eventoInstalacionDiferido = event;
  btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) return;

  eventoInstalacionDiferido.prompt();
  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') {
        btnInstalar.hidden = true;
      }
    })
    .catch((error) => {
      console.error('Error en la instalación:', error);
    })
    .finally(() => {
      eventoInstalacionDiferido = null; // el evento solo puede usarse una vez
    });
});

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true;
});

// iOS: Safari nunca dispara beforeinstallprompt -> guía manual
function verificarEntornoIOS() {
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const estaInstalada = window.navigator.standalone === true ||
                        window.matchMedia('(display-mode: standalone)').matches;

  // Si está en iPhone y aún la ve desde el navegador, mostrar instrucciones manuales
  if (esIOS && !estaInstalada) {
    const guiaIOS = document.getElementById('instrucciones-ios');
    if (guiaIOS) guiaIOS.hidden = false;
  }
}
verificarEntornoIOS();

// ===== 3. Cámara =====
let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal

function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop(); // libera el sensor
    });
    streamActual = null;
  }
}

function iniciarCamara(modo) {
  detenerCamaraActiva(); // WebKit exige liberar el sensor antes de pedir otro lente

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('Este navegador no soporta acceso a la cámara (se requiere HTTPS).');
    return Promise.resolve();
  }

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;
      actualizarMensajeEstado(`Cámara activa (${modo === 'environment' ? 'Trasera' : 'Frontal'})`);
    })
    .catch((error) => {
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    });
}

// Paso 1: el usuario pulsa "Solicitar Acceso a Cámara" -> aviso explicativo
btnPrepararCamara.addEventListener('click', () => {
  avisoPermiso.hidden = false;
});

// Paso 2: el usuario lee el motivo y confirma -> recién ahora se pide el permiso nativo
btnConfirmarPermiso.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

// Alternar lente: invierte el modo y vuelve a iniciar
btnAlternarCamara.addEventListener('click', () => {
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
  iniciarCamara(modoCamaraActual);
});

// Apagar cámara
btnApagarCamara.addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  actualizarMensajeEstado('Cámara apagada.');
});
