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
      console.warn('[Vista] El formulario no tiene `action`. Conéctalo a ClickFunnels o a tu endpoint — ver clickfunnels/GUIA-CLICKFUNNELS.md');
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
     7 · Arranque
     ====================================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', personalize);
  } else {
    personalize();
  }
})();
