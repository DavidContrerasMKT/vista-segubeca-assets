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

     En data-vsb-video va el video en CUALQUIER forma en que YouTube lo dé:
     el ID a secas, el enlace de compartir, el de la barra del navegador o el
     de embed. La página lo normaliza, así que no hay que armar la URL a mano
     —era el paso donde más fácil se equivoca uno— ni recordar cuál sirve.

       dQw4w9WgXcQ                                  (el ID solo)
       https://youtu.be/dQw4w9WgXcQ                 (compartir)
       https://www.youtube.com/watch?v=dQw4w9WgXcQ  (barra del navegador)
       https://www.youtube.com/embed/dQw4w9WgXcQ    (embed)
       https://vimeo.com/76979871                   (Vimeo también)

     El master es 4K: YouTube se encarga de las versiones y sirve hasta 2160p
     según la pantalla y la conexión de quien mira. Aquí no se fija calidad.
     ====================================================================== */
  var ID_YT = /^[A-Za-z0-9_-]{11}$/;

  /** Devuelve la URL de embed a partir de lo que se haya pegado. */
  function urlDeEmbed(valor) {
    var v = String(valor || '').trim();
    if (!v) return '';

    /* youtube-nocookie: no deja cookies de seguimiento mientras nadie le da
       clic, y el clic ya es consentimiento explícito. */
    var yt = function (id) { return 'https://www.youtube-nocookie.com/embed/' + id; };

    if (ID_YT.test(v)) return yt(v);

    var m = v.match(/(?:youtube\.com|youtube-nocookie\.com)\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/)
         || v.match(/youtube\.com\/.*[?&]v=([A-Za-z0-9_-]{11})/)
         || v.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (m) return yt(m[1]);

    m = v.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return 'https://player.vimeo.com/video/' + m[1];

    return v;   /* cualquier otro reproductor: se usa tal cual */
  }

  function arrancarVideo(box) {
    if (!box || box.querySelector('iframe')) return;

    var src = urlDeEmbed(box.getAttribute('data-vsb-video'));
    if (!src) return;

    /* playsinline: en iPhone, sin esto el video se apodera de la pantalla.
       rel=0 y modestbranding: al final no salen videos de la competencia. */
    var params = /vimeo\.com/.test(src)
      ? 'autoplay=1&dnt=1'
      : 'autoplay=1&rel=0&modestbranding=1&playsinline=1';

    var iframe = document.createElement('iframe');
    iframe.src = src + (src.indexOf('?') === -1 ? '?' : '&') + params;
    iframe.title = 'Video de Gilberto Gamboa — Segubeca';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    box.appendChild(iframe);
    box.style.cursor = 'default';
    box.removeAttribute('role');
    box.removeAttribute('tabindex');
  }

  document.addEventListener('click', function (e) {
    arrancarVideo(e.target.closest('.vsb-video'));
  });

  /* El contenedor es role="button": tiene que responder al teclado igual que
     al ratón, o para quien navega con Tab el video no existe. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var box = e.target.closest && e.target.closest('.vsb-video');
    if (!box) return;
    e.preventDefault();
    arrancarVideo(box);
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

     ▸ SI HAY QUE CAMBIAR UN EJEMPLO, SE CAMBIA AQUÍ.

     Cada regla reconoce el campo por el `name` que le pone CF O por el texto de
     su etiqueta. Hacen falta las dos vías: en los campos personalizados —los
     seis de la Proyección en la página 2— CF inventa el `name` (`custom_…`,
     `field_1`…) y no hay forma de saberlo de antemano. La etiqueta, en cambio,
     la escribe quien arma la página y es la del diseño.

     El ORDEN importa: gana la primera regla que casa, así que las específicas
     van antes. "Nombre del hij@" tiene que casar con la de hij@, no con la de
     nombre a secas.
     ====================================================================== */
  var EJEMPLOS_CF = [
    { etiqueta: /hij|niet/i,            name: /hijo.*nombre|nombre.*hijo/i, ejemplo: 'Emilia' },
    { etiqueta: /^su edad|edad de (?:su|l)/i, name: /hijo.*edad/i,          ejemplo: '4' },
    { etiqueta: /tu edad|edad actual/i, name: /titular.*edad|tu.*edad/i,    ejemplo: '38' },
    { etiqueta: /whats|tel[eé]f/i,      name: /phone|whats|tel/i,           ejemplo: '81 1234 5678' },
    { etiqueta: /correo|e-?mail/i,      name: /email|correo/i,              ejemplo: 'maria@correo.com' },
    { etiqueta: /nombre/i,              name: /^name$|nombre/i,             ejemplo: 'María Fernanda Gómez' },
  ];

  function ejemplosEnFormularioCF() {
    /* Se busca por los marcadores estructurales, no solo por #vista-form: ese
       CSS ID puede no existir (o estar mal puesto, y entonces lo quitamos en
       §8). Con esto los ejemplos funcionan sin depender de ningún ID. */
    var form = document.querySelector('#vista-form, .vsb-cf-form, .vsb-cf-card');
    if (!form) return;

    /* Los <select> no tienen placeholder: su "ejemplo" es la primera opción,
       y esa se escribe en ClickFunnels. */
    var campos = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"])');

    Array.prototype.forEach.call(campos, function (input) {
      var wrap = input.closest('.elFormItemWrapper, .elInputWrapper') || input.parentElement;
      var label = wrap ? wrap.querySelector('.elLabel, label') : null;
      var textoEtiqueta = label ? label.textContent.trim() : '';
      var nombre = input.getAttribute('name') || '';

      var regla = null;
      for (var i = 0; i < EJEMPLOS_CF.length && !regla; i++) {
        var r = EJEMPLOS_CF[i];
        if ((nombre && r.name.test(nombre)) || (textoEtiqueta && r.etiqueta.test(textoEtiqueta))) regla = r;
      }
      if (!regla) return;

      var ph = (input.placeholder || '').trim();
      var vacio = !ph;
      var duplicaEtiqueta = textoEtiqueta && ph.toLowerCase() === textoEtiqueta.toLowerCase();

      /* El campo de teléfono lo monta la librería intl-tel-input, que le pone
         sola un número de ejemplo del país ("222 123 4567"). Eso no duplica la
         etiqueta, así que las dos reglas de arriba lo dejaban pasar. Un
         placeholder hecho SOLO de dígitos y separadores es siempre ese ejemplo
         automático, nunca algo que alguien escribiría a mano — por eso se puede
         reemplazar sin miedo. Un texto con letras sí se respeta. */
      var esNumeroAutomatico = /^[\d\s()+.-]+$/.test(ph);

      if (vacio || duplicaEtiqueta || esNumeroAutomatico) {
        input.placeholder = regla.ejemplo;
      }
    });
  }

  /* ======================================================================
     7b · Etiqueta de los DESPLEGABLES, y obligatorio vs. opcional

     El elemento Select Box de ClickFunnels no tiene ajuste de etiqueta —igual
     que tampoco tiene el del placeholder—: solo Input Name y las opciones. El
     campo sale sin nada arriba y el formulario pierde el ritmo del diseño.

     Aquí se le pone una etiqueta con EL MISMO marcado que CF usa en los demás
     campos (.elLabel > .labelText > <label>), así que la pinta el mismo CSS y
     no hay una etiqueta que se vea distinta de las otras.

     El texto sale de ETIQUETAS_CF; si no casa ninguna regla, se usa el Input
     Name tal cual, que es lo que se escribió en ClickFunnels.

     Y de paso se marca cada campo como obligatorio u opcional. CF NO pone el
     atributo `required`: le pone al input la clase `required1`. Sin distinguir
     eso, el asterisco salía también en el único campo opcional de la página 2.
     ====================================================================== */
  var ETIQUETAS_CF = [
    { name: /ahorro|rango/i, texto: 'Ahorro mensual que tienes en mente' },
    /* Ciudad se quitó del formulario a pedido del cliente. La regla se queda
       por si algún día vuelve: cuesta una línea y ahorra el viaje de volver
       a averiguar por qué el desplegable sale sin etiqueta. */
    { name: /ciudad/i,       texto: 'Ciudad' },
  ];

  function etiquetaDeCF(texto, paraId) {
    var cont = document.createElement('div');
    cont.className = 'elLabel vsb-cf-etiqueta';
    var medio = document.createElement('div');
    medio.className = 'borderHolder labelText';
    var lab = document.createElement('label');
    lab.textContent = texto;
    if (paraId) lab.setAttribute('for', paraId);
    medio.appendChild(lab);
    cont.appendChild(medio);
    return cont;
  }

  function etiquetasYObligatoriosCF() {
    var form = document.querySelector('#vista-form, .vsb-cf-form, .vsb-cf-card');
    if (!form) return;

    var campos = form.querySelectorAll('select, input:not([type="hidden"]):not([type="submit"]):not([type="button"])');

    Array.prototype.forEach.call(campos, function (campo) {
      var wrap = campo.closest('.elFormItemWrapper, .elInputWrapper') || campo.parentElement;
      if (!wrap) return;

      /* ---- Etiqueta, solo si no hay ninguna (los desplegables) ----
         Ojo con el <label>: ClickFunnels ENVUELVE el <select> en un
         `label.elSelectLabel` vacío. Un simple querySelector('label') lo
         encontraba y daba el campo por etiquetado, así que no se inyectaba
         nada y el desplegable seguía sin título. Cuenta solo una etiqueta que
         tenga texto y que NO contenga al propio campo. */
      var yaTieneEtiqueta = !!wrap.querySelector('.elLabel') ||
        Array.prototype.some.call(wrap.querySelectorAll('label'), function (l) {
          return !l.contains(campo) && (l.textContent || '').trim() !== '';
        });

      if (campo.tagName === 'SELECT' && !yaTieneEtiqueta) {
        var clave = (campo.getAttribute('name') || '').trim();
        var texto = '';
        for (var i = 0; i < ETIQUETAS_CF.length && !texto; i++) {
          if (clave && ETIQUETAS_CF[i].name.test(clave)) texto = ETIQUETAS_CF[i].texto;
        }
        if (!texto) texto = clave;                     /* el Input Name, tal cual */
        if (texto) wrap.insertBefore(etiquetaDeCF(texto, campo.id), wrap.firstChild);
      }

      /* ---- Obligatorio u opcional ---- */
      var clases = String(campo.className);
      var obligatorio = campo.hasAttribute('required') || /\brequired1\b/.test(clases);
      /* A los <input> CF les pone `required0` cuando no son obligatorios, pero a
         los <select> no les pone nada: en un desplegable, que falte `required1`
         ya significa opcional. */
      var opcionalExplicito = !obligatorio &&
        (/\brequired0\b/.test(clases) || campo.tagName === 'SELECT');

      if (obligatorio) wrap.classList.add('vsb-cf-req');
      else if (opcionalExplicito) wrap.classList.add('vsb-cf-opt');
      /* Si CF no dice ni una cosa ni la otra, no se inventa nada: la etiqueta
         se queda limpia en lugar de arriesgar un "(opcional)" equivocado. */
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
       .vsb-cf-indigo   esa misma Row, cuando es la del bloque "Proyección" de
                        la página 2: la banda va indigo y no arena, y así el
                        color no depende de que alguien acierte con el selector
                        de color de ClickFunnels

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

        /* Página 2 · si el bloque "Proyección" está ARRIBA en la página, esta
           franja es la continuación de su banda indigo, no una franja arena.
           Se compara la posición en el documento en vez de exigir que las dos
           Rows sean hermanas: ClickFunnels envuelve cada Row a su manera. */
        var marcaProy = document.querySelector('[data-vsb-cf="proyeccion"]');
        if (marcaProy) {
          var rel = filaCampos.compareDocumentPosition(marcaProy);
          var vaAntes = !!(rel & Node.DOCUMENT_POSITION_PRECEDING);
          if (vaAntes || filaCampos.contains(marcaProy)) filaCampos.classList.add('vsb-cf-indigo');
        }
      }
      /* Una sola tarjeta. Si un ancestro ya está marcado, no se marca otra vez:
         antes se marcaban la columna externa (694px) Y una interna (582px), y
         se dibujaba una tarjeta crema dentro de otra. */
      if (colTarjeta && !colTarjeta.parentElement.closest('.vsb-cf-card')) {
        colTarjeta.classList.add('vsb-cf-card');
      }
    }

    /* Si el formulario aún no está dentro de ninguna columna, la del titular
       hace de tarjeta. Se resuelve a la columna HIJA DIRECTA de la fila del
       hero —no a la más cercana, que suele ser una interna— y solo si no hay
       ya una tarjeta marcada. */
    if (!document.querySelector('.vsb-cf-card')) {
      var titular = document.querySelector('.vsb-prehead, .vsb-display');
      var colTitular = null;
      if (filaHero && titular && filaHero.contains(titular)) {
        colTitular = Array.prototype.filter.call(filaHero.children, function (ch) {
          return /col-/.test(String(ch.className)) && ch.contains(titular);
        })[0];
      } else {
        colTitular = col(titular);
      }
      if (colTitular && colTitular !== colPortada) colTitular.classList.add('vsb-cf-card');
    }

    /* La nota legal se marca por su texto. El CSS no puede seleccionar por
       contenido, y hay que distinguirla de un posible subtítulo del titular:
       la nota lleva escudo, gris pizarra y 15.04px; el subtítulo, no. */
    var contenedor = document.querySelector('.vsb-cf-form, #vista-form');
    if (contenedor) {
      Array.prototype.forEach.call(contenedor.querySelectorAll('p, .elParagraph'), function (par) {
        if (/protegida|compartimos|terceros/i.test(par.textContent || '')) {
          par.classList.add('vsb-cf-nota');
        }
      });
    }
  }

  /* ======================================================================
     9b · Confirmación del envío: la banda verde de arriba

     El cliente pidió que la persona vea que sus datos salieron. La señal NO va
     en el botón: el de ClickFunnels es un <a href="#submit-form">, así que al
     enviar el navegador salta al inicio de la página y cualquier cosa que pase
     junto al botón queda fuera de pantalla. Por eso se muestra una banda verde
     fija arriba, que es justo donde queda mirando.

     Lo que la dispara es la RESPUESTA DE LA RED, no un temporizador a ciegas:
     decirle "listo" a alguien cuyo envío falló es peor que no decirle nada. Se
     observan los POST sin interceptarlos —se escucha `loadend` en cada XHR y se
     encadena al `fetch`, siempre devolviendo el original— y solo un 2xx la
     muestra.

     ▸ IMPORTANTE en ClickFunnels: el botón NO debe tener "On Submit Go To". Con
       una redirección configurada, CF cambia de página y no hay nada que ver.
     ====================================================================== */
  var ENVIO = { enCurso: false, boton: null, textoOriginal: '', reloj: null };

  function textoDelBoton(bt) {
    /* Ojo con el orden: el <i> del spinner de CF también lleva la clase
       .elButtonText y aparece ANTES del <span> de la etiqueta, así que un
       querySelector con lista separada por comas devolvía el spinner —oculto—
       y el texto del botón nunca cambiaba. Primero el selector exacto. */
    return bt.querySelector('.elButtonMainText') ||
           bt.querySelector('.elButtonText:not(.elButtonSpinner)') ||
           bt;
  }

  function marcarEnviando(bt) {
    ENVIO.enCurso = true;
    ENVIO.boton = bt;
    bt.setAttribute('aria-busy', 'true');

    /* Red de seguridad: si no llega ninguna respuesta, se libera el botón para
       poder reintentar. Nunca se da por bueno un envío que nadie confirmó. */
    ENVIO.reloj = setTimeout(function () {
      if (ENVIO.enCurso) restaurarBoton('[Vista] El envío no respondió en 20s: el botón queda libre para reintentar.');
    }, 20000);
  }

  function restaurarBoton(aviso) {
    if (!ENVIO.boton) return;
    clearTimeout(ENVIO.reloj);
    ENVIO.boton.removeAttribute('aria-busy');
    ENVIO.enCurso = false;
    ENVIO.boton = null;
    if (aviso) console.warn(aviso);
  }

  function marcarEnviado() {
    clearTimeout(ENVIO.reloj);
    if (ENVIO.boton) {
      /* Bloqueado para que nadie mande el formulario dos veces. */
      ENVIO.boton.classList.add('vsb-cf-enviado');
      ENVIO.boton.removeAttribute('aria-busy');
    }
    ENVIO.enCurso = false;
    mostrarAviso('enviado');
  }

  /* ---- El envío RECARGA la página ------------------------------------------
     Medido en vivo: el botón de CF apunta a `?page_action=mark_complete` y el
     <form> hace POST con action a la propia página. O sea que al enviar el
     navegador CARGA LA PÁGINA DE NUEVO — eso es lo que se veía como "me manda
     al inicio de la página", y por eso una banda encendida antes de irse no
     sobrevive: el documento donde vivía ya no existe.

     Así que la confirmación se decide al CARGAR:

       1. Si la URL trae `page_action=mark_complete`, el envío ocurrió. Es la
          señal buena: no depende de nada que hayamos guardado nosotros.
       2. Si no, sirve una marca en sessionStorage puesta al hacer clic. Cubre
          el caso de un POST que vuelva sin ese parámetro.

     La marca se BORRA SOLA a los 6 segundos si la página no se fue a ningún
     lado: si ClickFunnels frenó el envío por su propia validación, no queda una
     marca suelta que encienda la banda en la siguiente recarga.
     ------------------------------------------------------------------------ */
  var MARCA_ENVIO = 'vsbProyeccionEnviada';

  function apuntarEnvio() {
    try { sessionStorage.setItem(MARCA_ENVIO, String(Date.now())); } catch (err) {}
    setTimeout(function () {
      try { sessionStorage.removeItem(MARCA_ENVIO); } catch (err) {}
    }, 6000);
  }

  function avisoTrasRecarga() {
    var porURL = /[?&]page_action=mark_complete/.test(location.search);
    var porMarca = false;
    try {
      var t = Number(sessionStorage.getItem(MARCA_ENVIO) || 0);
      porMarca = t > 0 && (Date.now() - t) < 120000;   /* 2 min de margen */
      if (t) sessionStorage.removeItem(MARCA_ENVIO);
    } catch (err) {}

    if (!porURL && !porMarca) {
      /* Visita normal: el saludo de bienvenida, tres segundos y se va. */
      mostrarAviso('llegada');
      return;
    }
    mostrarAviso('enviado');

    /* Se limpia el parámetro para que un F5 no vuelva a felicitar a nadie. */
    if (porURL && window.history && history.replaceState) {
      var limpia = location.pathname +
        location.search.replace(/([?&])page_action=mark_complete&?/, '$1').replace(/[?&]$/, '') +
        location.hash;
      try { history.replaceState(null, '', limpia); } catch (err) {}
    }
  }

  /** Muestra la banda verde.
      variante: 'llegada' (al entrar a la página, se va sola) o
                'enviado'  (tras enviar la Proyección, se queda).
      El texto de cada una vive en el HTML, no aquí: así se cambia la copia sin
      tocar el JavaScript. */
  function mostrarAviso(variante) {
    variante = variante || 'enviado';
    var aviso = document.getElementById('vsb-aviso-proyeccion') ||
                document.querySelector('.vsb-aviso');
    if (!aviso || aviso.classList.contains('is-open')) return;

    aviso.classList.remove('is-llegada', 'is-enviado');
    aviso.classList.add('is-' + variante);
    aviso.hidden = false;
    /* Un fotograma de espera: si se quita `hidden` y se abre en el mismo, el
       navegador no tiene desde dónde animar y la banda aparece de golpe. */
    if (window.requestAnimationFrame) {
      requestAnimationFrame(function () { aviso.classList.add('is-open'); });
    } else {
      aviso.classList.add('is-open');
    }

    /* Tras la recarga la página ya está arriba. Esto solo hace falta si CF
       algún día envía sin recargar. */
    if (variante === 'enviado' && window.scrollY > 4) {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (err) { window.scrollTo(0, 0); }
    }

    /* La de llegada se retira sola: es un saludo, no un aviso permanente. La de
       la Proyección se queda, porque es el acuse de que sus datos salieron. */
    if (variante === 'llegada') {
      setTimeout(function () {
        aviso.classList.remove('is-open');
        /* `hidden` se pone al terminar la transición, no antes: si no, la banda
           desaparece de golpe en vez de recogerse. */
        setTimeout(function () {
          if (!aviso.classList.contains('is-open')) aviso.hidden = true;
        }, 420);
      }, 3000);
    }
  }

  /** ¿Están llenos los campos obligatorios que se ven? Si no, no se bloquea el
      botón: le toca a ClickFunnels marcar sus errores. */
  function obligatoriosCompletos(form) {
    var campos = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
    for (var i = 0; i < campos.length; i++) {
      var c = campos[i];
      if (c.offsetParent === null) continue;
      var obligatorio = c.hasAttribute('required') || /\brequired1\b/.test(String(c.className));
      if (obligatorio && !String(c.value || '').trim()) return false;
    }
    return true;
  }

  /** Un POST que terminó. Solo cuenta si hay un envío en curso. */
  function respuestaDeEnvio(url, estado) {
    if (!ENVIO.enCurso) return;
    /* Peticiones de terceros (píxel de Facebook, analítica) no son el envío. */
    var propia = !/^https?:\/\//i.test(url) ||
                 url.indexOf(location.origin) === 0 ||
                 /clickfunnels|myclickfunnels/i.test(url);
    if (!propia) return;
    if (estado >= 200 && estado < 400) marcarEnviado();
    else restaurarBoton('[Vista] El envío respondió ' + estado + '. El botón vuelve a su estado normal.');
  }

  function vigilarRed() {
    var XHR = window.XMLHttpRequest;
    if (XHR && XHR.prototype && !XHR.prototype.__vsbVigilado) {
      var abrir = XHR.prototype.open, enviar = XHR.prototype.send;
      XHR.prototype.open = function (metodo, url) {
        this.__vsbMetodo = String(metodo || '').toUpperCase();
        this.__vsbUrl = String(url || '');
        return abrir.apply(this, arguments);
      };
      XHR.prototype.send = function () {
        if (this.__vsbMetodo === 'POST') {
          var xhr = this;
          /* addEventListener, no onload: así no se pisa el manejador de CF. */
          xhr.addEventListener('loadend', function () {
            respuestaDeEnvio(xhr.__vsbUrl, xhr.status);
          });
        }
        return enviar.apply(this, arguments);
      };
      XHR.prototype.__vsbVigilado = true;
    }

    if (window.fetch && !window.fetch.__vsbVigilado) {
      var original = window.fetch;
      var envuelto = function (recurso, opciones) {
        var metodo = String((opciones && opciones.method) ||
                            (recurso && recurso.method) || 'GET').toUpperCase();
        var url = typeof recurso === 'string' ? recurso : ((recurso && recurso.url) || '');
        var promesa = original.apply(this, arguments);
        if (metodo === 'POST' && promesa && promesa.then) {
          promesa.then(
            function (r) { respuestaDeEnvio(url, r && r.status); },
            function () { respuestaDeEnvio(url, 0); }
          );
        }
        return promesa;   /* se devuelve tal cual: nada se traga ni se altera */
      };
      envuelto.__vsbVigilado = true;
      window.fetch = envuelto;
    }
  }

  document.addEventListener('click', function (e) {
    var bt = e.target.closest && e.target.closest('.elButton, button[type="submit"]');
    if (!bt || ENVIO.enCurso || bt.classList.contains('vsb-cf-enviado')) return;
    var form = bt.closest('#vista-form, .vsb-cf-form, .vsb-cf-card') ||
               document.querySelector('#vista-form, .vsb-cf-form, .vsb-cf-card');
    if (!form || !form.contains(bt)) return;
    if (!obligatoriosCompletos(form)) return;
    apuntarEnvio();
    marcarEnviando(bt);
  }, true);

  /* ======================================================================
     9 · Arranque
     ====================================================================== */
  function arrancar() {
    personalize();
    marcarEstructuraCF();
    ejemplosEnFormularioCF();
    etiquetasYObligatoriosCF();
    avisoTrasRecarga();
  }
  vigilarRed();   /* antes que nada: CF puede enviar en cuanto haya interacción */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

  /* ClickFunnels monta el campo de teléfono con una librería que reconstruye el
     input después de cargar, y al hacerlo le devuelve su placeholder. Dos
     pasadas más lo dejan bien; son idempotentes, así que no pisan nada. */
  function reintentar() {
    marcarEstructuraCF();
    ejemplosEnFormularioCF();
    etiquetasYObligatoriosCF();
  }
  setTimeout(reintentar, 600);
  setTimeout(reintentar, 1800);
})();
