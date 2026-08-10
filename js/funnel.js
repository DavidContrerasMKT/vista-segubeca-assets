/* ==========================================================================
   VISTA CONSULTING — Funnel Segubeca
   Comportamiento de las dos páginas: popup, validación, acordeón,
   personalización del nombre y carga diferida del video.

   Escrito con delegación de eventos en `document`, así que funciona igual
   si el HTML se inyecta después de que carga el script — que es exactamente
   lo que pasa dentro de ClickFunnels.
   ========================================================================== */
(function () {
  'use strict';

  if (window.__vsbInit) return;   // idempotente: ClickFunnels puede cargar el script dos veces
  window.__vsbInit = true;

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* ======================================================================
     1 · Popup del formulario
     ====================================================================== */
  var lastFocused = null;

  function openModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';

    var first = modal.querySelector('input:not([type="hidden"]), select, textarea');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-vsb-open]');
    if (opener) {
      e.preventDefault();
      openModal(opener.getAttribute('data-vsb-open'));
      return;
    }
    // Cerrar: botón de cierre o clic en el velo
    var closer = e.target.closest('[data-vsb-close]');
    if (closer) {
      e.preventDefault();
      closeModal(closer.closest('.vsb-modal'));
    }
  });

  document.addEventListener('keydown', function (e) {
    var modal = document.querySelector('.vsb-modal.is-open');
    if (!modal) return;

    if (e.key === 'Escape') { closeModal(modal); return; }

    // Focus trap
    if (e.key === 'Tab') {
      var items = Array.prototype.filter.call(
        modal.querySelectorAll(FOCUSABLE),
        function (el) { return el.offsetParent !== null; }
      );
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ======================================================================
     2 · Validación
     ====================================================================== */
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  function fieldOf(input) { return input.closest('.vsb-field'); }

  function setError(input, message) {
    var field = fieldOf(input);
    if (!field) return;
    field.classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    var slot = field.querySelector('.vsb-error');
    if (slot && message) slot.textContent = message;
  }

  function clearError(input) {
    var field = fieldOf(input);
    if (!field) return;
    field.classList.remove('has-error');
    input.removeAttribute('aria-invalid');
  }

  /** Devuelve el mensaje de error, o null si el campo es válido. */
  function validate(input) {
    var value = (input.value || '').trim();
    var required = input.hasAttribute('required');
    var kind = input.getAttribute('data-vsb-validate') || input.type;

    if (!value) return required ? (input.getAttribute('data-vsb-msg') || 'Este campo es obligatorio.') : null;

    if (kind === 'email' && !RE_EMAIL.test(value)) {
      return 'Revisa tu correo, parece que falta algo.';
    }
    if (kind === 'tel' || kind === 'whatsapp') {
      var digits = value.replace(/\D/g, '');
      if (digits.length < 10) return 'Escribe tu WhatsApp a 10 dígitos (lada incluida).';
      if (digits.length > 13) return 'Ese número tiene dígitos de más.';
    }
    if (kind === 'name' && value.length < 2) {
      return 'Escribe tu nombre completo.';
    }
    return null;
  }

  // Limpia el error en cuanto el usuario corrige, y revalida al salir del campo.
  document.addEventListener('input', function (e) {
    var input = e.target;
    if (!input.classList || !input.classList.contains('vsb-input')) return;
    var field = fieldOf(input);
    if (field && field.classList.contains('has-error') && !validate(input)) clearError(input);
  });

  document.addEventListener('blur', function (e) {
    var input = e.target;
    if (!input.classList || !input.classList.contains('vsb-input')) return;
    if (!(input.value || '').trim() && !input.hasAttribute('required')) { clearError(input); return; }
    var msg = validate(input);
    if (msg) setError(input, msg); else clearError(input);
  }, true);

  /* ======================================================================
     3 · Envío
     ====================================================================== */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.classList || !form.classList.contains('vsb-form')) return;

    var inputs = Array.prototype.slice.call(form.querySelectorAll('.vsb-input'));
    var firstBad = null;

    inputs.forEach(function (input) {
      var msg = validate(input);
      if (msg) { setError(input, msg); if (!firstBad) firstBad = input; }
      else clearError(input);
    });

    if (firstBad) {
      e.preventDefault();
      firstBad.focus();
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Guarda el nombre para saludar al lead en la página 2.
    var nameField = form.querySelector('[name="nombre"]');
    if (nameField) {
      var firstName = nameField.value.trim().split(/\s+/)[0];
      try { sessionStorage.setItem('vsbNombre', firstName); } catch (err) {}
    }

    // Estado de carga. El submit real lo hace el `action` del <form>
    // (o ClickFunnels, si la ruta B del README es la que estás usando).
    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.classList.add('is-loading');

    // Sin `action` configurado: no hay a dónde enviar. Avisamos en consola
    // en lugar de recargar la página y perder los datos capturados.
    if (!form.getAttribute('action')) {
      e.preventDefault();
      if (btn) btn.classList.remove('is-loading');
      console.warn('[Vista] El formulario no tiene `action`. Conéctalo a ClickFunnels o a tu endpoint — ver clickfunnels/CLICKFUNNELS-GUIDE.md');
      var url = form.getAttribute('data-vsb-next');
      if (url) {
        var q = nameField ? '?nombre=' + encodeURIComponent(nameField.value.trim().split(/\s+/)[0]) : '';
        window.location.href = url + q;
      }
    }
  });

  /* ======================================================================
     4 · Acordeón de preguntas frecuentes
     ====================================================================== */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.vsb-faq-q');
    if (!btn) return;

    var item = btn.closest('.vsb-faq-item');
    var isOpen = item.classList.contains('is-open');

    // Una abierta a la vez: el bloque debe leerse corto, como pide el documento.
    var group = item.closest('.vsb-faq');
    if (group) {
      group.querySelectorAll('.vsb-faq-item.is-open').forEach(function (other) {
        if (other === item) return;
        other.classList.remove('is-open');
        var b = other.querySelector('.vsb-faq-q');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }

    item.classList.toggle('is-open', !isOpen);
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  /* ======================================================================
     5 · Personalización del nombre en la página 2
     Prioridad: ?nombre= en la URL  >  sessionStorage  >  texto por defecto.
     ClickFunnels puede inyectar el nombre del contacto directo en el HTML;
     si lo haces así, quita el atributo data-vsb-name del span.
     ====================================================================== */
  function personalize() {
    var slots = document.querySelectorAll('[data-vsb-name]');
    if (!slots.length) return;

    var name = '';
    try {
      var param = new URLSearchParams(window.location.search).get('nombre');
      if (param) name = param;
      if (!name) name = sessionStorage.getItem('vsbNombre') || '';
    } catch (err) {}

    name = (name || '').trim().replace(/[<>]/g, '').slice(0, 40);
    if (!name) return;   // sin nombre, se queda el texto de respaldo del HTML

    // Capitaliza sin destruir acentos.
    name = name.charAt(0).toLocaleUpperCase('es-MX') + name.slice(1);

    slots.forEach(function (slot) {
      slot.textContent = slot.getAttribute('data-vsb-name-prefix') === 'coma'
        ? ', ' + name
        : name;
    });

    // Rellena de una vez el WhatsApp/nombre del 2º formulario si existe.
    var pre = document.querySelector('[data-vsb-prefill="nombre"]');
    if (pre && !pre.value) pre.value = name;
  }

  /* ======================================================================
     6 · Video: se inserta el iframe solo al hacer clic.
     Pega la URL de embed en data-vsb-video del contenedor .vsb-video.
     YouTube:  https://www.youtube.com/embed/ID
     Vimeo:    https://player.vimeo.com/video/ID
     ====================================================================== */
  document.addEventListener('click', function (e) {
    var box = e.target.closest('.vsb-video');
    if (!box) return;

    var src = box.getAttribute('data-vsb-video');
    if (!src || box.querySelector('iframe')) return;

    var sep = src.indexOf('?') === -1 ? '?' : '&';
    var iframe = document.createElement('iframe');
    iframe.src = src + sep + 'autoplay=1&rel=0';
    iframe.title = 'Video de Gilberto Gamboa — Segubeca';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    box.appendChild(iframe);
    box.style.cursor = 'default';
  });

  /* ======================================================================
     7 · Ejemplos dentro de los campos del formulario NATIVO de ClickFunnels

     El diseño pide etiqueta ARRIBA del campo y un EJEMPLO dentro, en gris
     claro. En el plan de CF que estamos usando eso no se puede configurar: el
     editor solo expone "Label Text" y usa ESE MISMO texto como placeholder, así
     que la etiqueta y el ejemplo salían idénticos ("Nombre" / "Nombre").

     Aquí se rellenan los ejemplos, pero SIN pisar a ClickFunnels: solo se
     escribe el placeholder si está vacío o si es un duplicado de la etiqueta,
     que es la huella de esa limitación. Si algún día CF sí permite escribirlo
     y pones otro texto, este código lo respeta y no hace nada.

     ▸ SI HAY QUE CAMBIAR UN EJEMPLO, SE CAMBIA AQUÍ. Las claves son el atributo
       `name` que pone ClickFunnels a cada campo.
     ====================================================================== */
  var EJEMPLOS_CF = {
    name:         'María Fernanda Gómez',
    email:        'maria@correo.com',
    phone_number: '81 1234 5678',
    // Página 2 · formulario de Proyección, si algún día se arma nativo en CF
    hijo_nombre:  'Emilia',
  };

  function ejemplosEnFormularioCF() {
    var form = document.getElementById('vista-form');
    if (!form) return;

    Object.keys(EJEMPLOS_CF).forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      if (!input || input.type === 'hidden') return;

      var wrap = input.closest('.elFormItemWrapper, .elInputWrapper') || input.parentElement;
      var label = wrap ? wrap.querySelector('.elLabel, label') : null;
      var textoEtiqueta = label ? label.textContent.trim().toLowerCase() : '';
      var ph = (input.placeholder || '').trim();

      var vacio = !ph;
      var duplicaEtiqueta = textoEtiqueta && ph.toLowerCase() === textoEtiqueta;

      /* El campo de teléfono lo monta la librería intl-tel-input, que le pone
         sola un número de ejemplo del país ("222 123 4567"). Eso no duplica la
         etiqueta, así que las dos reglas de arriba lo dejaban pasar. Un
         placeholder hecho SOLO de dígitos y separadores es siempre ese ejemplo
         automático, nunca algo que alguien escribiría a mano — por eso se puede
         reemplazar sin miedo. Un texto con letras sí se respeta. */
      var esNumeroAutomatico = /^[\d\s()+.-]+$/.test(ph);

      if (vacio || duplicaEtiqueta || esNumeroAutomatico) {
        input.placeholder = EJEMPLOS_CF[name];
      }
    });
  }

  /* ======================================================================
     8 · Marcar la estructura de ClickFunnels por CONTENIDO, no por CSS ID

     Pedir que se pongan CSS IDs a mano en la Row y la columna correctas resultó
     poco fiable: en el editor de CF es fácil seleccionar la Row creyendo que es
     la columna, y al primer descuido la tarjeta crema se dibuja alrededor de la
     portada en vez del formulario. Pasó tres veces.

     Así que el CSS ya no depende de eso. Aquí se etiqueta la estructura a partir
     de lo que cada contenedor CONTIENE, que es la única señal fiable:

       .vsb-cf-hero     la Row que contiene la portada
       .vsb-cf-card     la columna que contiene el titular o el formulario
       .vsb-cf-form     el <form> nativo de CF de verdad
       .vsb-cf-formrow  la Row del formulario, cuando va en una Row propia

     Los CSS ID siguen funcionando si están bien puestos: esto es adicional, no
     un reemplazo. Y funciona con el formulario dentro de la tarjeta o en su
     propia fila, sin tener que reacomodar nada en ClickFunnels.
     ====================================================================== */
  function marcarEstructuraCF() {
    var enCF = document.querySelector('.row, [class*="col-"]');
    if (!enCF) return;   // página suelta: no hay nada que marcar

    var col = function (el) { return el && el.closest('[class*="col-"]'); };
    var fila = function (el) { return el && el.closest('.row'); };

    /* ---- Primero: quitar los CSS ID que estén en el elemento equivocado ----
       Un `vista-hero-section` puesto en una columna recibe el estilo de FILA
       (ancho 100%, franja arena) y hace que las dos columnas se apilen. Y un
       `vista-card` en la columna de la portada dibuja la tarjeta crema
       alrededor de la portada.

       Como el marcado por contenido de abajo ya no necesita ningún ID, lo más
       seguro es retirar los que están mal puestos en lugar de pelear con ellos.
       Los que estén bien puestos se quedan tal cual. */
    var portadaTmp = document.querySelector('.vsb-guia-3d, .vsb-guia-img');
    var formTmp = null;
    var todosForms = document.querySelectorAll('form');
    for (var f = 0; f < todosForms.length; f++) {
      if (todosForms[f].querySelector('input[type="text"], input[type="email"], input[type="tel"]')) {
        formTmp = todosForms[f]; break;
      }
    }
    var esFila = function (el) { return el && el.classList.contains('row'); };
    var esColumna = function (el) { return el && /col-/.test(String(el.className)); };

    var reglas = [
      // id,                   debe ser…                                         debe contener…
      ['vista-hero-section',   esFila,    portadaTmp],
      ['vista-form-section',   esFila,    formTmp],
      ['vista-card',           esColumna, formTmp || document.querySelector('.vsb-display')],
      ['vista-form',           function (el) { return el && el.tagName === 'FORM'; }, null],
    ];

    reglas.forEach(function (r) {
      var el = document.getElementById(r[0]);
      if (!el) return;
      var tipoOk = r[1](el);
      var contieneOk = r[2] ? el.contains(r[2]) : true;
      // La fila del hero no debe ser también la del formulario suelto.
      if (r[0] === 'vista-form-section' && portadaTmp && el.contains(portadaTmp)) contieneOk = false;
      if (!tipoOk || !contieneOk) {
        el.removeAttribute('id');
        if (window.console && console.info) {
          console.info('[Vista] Quité el CSS ID "' + r[0] +
            '" porque estaba en el elemento equivocado. El estilo ahora se aplica por estructura, no hace falta ningún ID.');
        }
      }
    });

    /* La Row del hero es la que lleva la portada de la guía. */
    var portada = document.querySelector('.vsb-guia-3d, .vsb-guia-img');
    var filaHero = fila(portada);
    if (filaHero) filaHero.classList.add('vsb-cf-hero');
    var colPortada = col(portada);
    if (colPortada) colPortada.classList.add('vsb-cf-cover-col');

    /* La tarjeta se localiza por los CAMPOS VISIBLES, no por el <form>.
       Motivo: ClickFunnels deja el <form> como un contenedor OCULTO con sus 43
       inputs de seguimiento, fuera de las filas, y coloca los campos visibles
       aparte en la estructura de la página. Buscar "el form con campos
       visibles" no encontraba nada, y la tarjeta nunca se marcaba. */
    var campos = Array.prototype.filter.call(
      document.querySelectorAll('input'),
      function (i) {
        return i.offsetParent !== null &&
               ['text', 'email', 'tel', 'number'].indexOf(i.type) !== -1;
      });

    if (campos.length) {
      /* Ancestro común de los campos: sirve de contenedor del formulario. */
      var comun = campos[0];
      while (comun && !campos.every(function (c) { return comun.contains(c); })) {
        comun = comun.parentElement;
      }
      if (comun) comun.classList.add('vsb-cf-form');

      /* La tarjeta es la columna HIJA DIRECTA de la fila que contiene los
         campos — no la columna más cercana, que en CF suele ser una interna
         de 705px dentro de otra de 902px. */
      var filaCampos = fila(campos[0]);
      var colTarjeta = null;

      if (filaHero && filaHero.contains(campos[0])) {
        colTarjeta = Array.prototype.filter.call(filaHero.children, function (ch) {
          return /col-/.test(String(ch.className)) && ch.contains(campos[0]);
        })[0];
      } else if (filaCampos) {
        colTarjeta = Array.prototype.filter.call(filaCampos.children, function (ch) {
          return /col-/.test(String(ch.className)) && ch.contains(campos[0]);
        })[0] || col(campos[0]);
        /* Formulario en su propia fila: se pinta como franja con tarjeta al centro. */
        filaCampos.classList.add('vsb-cf-formrow');
      }
      if (colTarjeta) colTarjeta.classList.add('vsb-cf-card');
    }

    /* La columna del titular también es tarjeta: cubre el caso de que el
       formulario todavía no se haya movido dentro. */
    var titular = document.querySelector('.vsb-prehead, .vsb-display');
    var colTitular = col(titular);
    if (colTitular && colTitular !== colPortada) colTitular.classList.add('vsb-cf-card');
  }

  /* ======================================================================
     9 · Arranque
     ====================================================================== */
  function arrancar() {
    personalize();
    marcarEstructuraCF();
    ejemplosEnFormularioCF();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

  /* ClickFunnels monta el campo de teléfono con una librería que reconstruye el
     input después de cargar, y al hacerlo le devuelve su placeholder. Dos
     pasadas más lo dejan bien; son idempotentes, así que no pisan nada. */
  function reintentar() { marcarEstructuraCF(); ejemplosEnFormularioCF(); }
  setTimeout(reintentar, 600);
  setTimeout(reintentar, 1800);
})();
