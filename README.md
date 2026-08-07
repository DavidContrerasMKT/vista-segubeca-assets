# Assets — Funnel Segubeca (Vista Consulting)

Tipografías, imágenes, CSS y JS que sirven las dos páginas del funnel Segubeca
montado en ClickFunnels.

Este repo existe **solo para hostear archivos estáticos** vía GitHub Pages. El
código fuente de las páginas vive aparte, en `segubeca-funnel/`.

## URL base

```
https://davidcontrerasmkt.github.io/vista-segubeca-assets
```

Es el valor que reemplaza `{{BASE}}` en los bloques de ClickyFunnels
(`01-HEAD-CODE.html`, `02-LANDING-BODY.html`, `03-GRACIAS-BODY.html`).
**Sin diagonal al final.**

Comprobación rápida — esto debe abrir el logo:

```
https://davidcontrerasmkt.github.io/vista-segubeca-assets/img/Vista_Logo_Completo_Indigo.png
```

## Qué hay

| Carpeta | Contenido |
|---|---|
| `fonts/` | Brandon Grotesque (5 pesos) + Cormorant Garamond |
| `img/` | Logos Vista, retratos de los socios, portada de la guía |
| `css/` | `vista-funnel.css` — la hoja completa de las dos páginas |
| `js/` | `funnel.js` — popup, validación, acordeón, personalización |

`css/` y `js/` no hacen falta para la ruta de ClickFunnels, porque ahí el estilo
y el script van pegados en el head. Están por si algún día se hostean las
páginas completas fuera de CF.

`.nojekyll` desactiva el procesamiento de Jekyll en Pages: no hace falta y así
ningún archivo se filtra por reglas que no pedimos.

## CORS

GitHub Pages responde con `Access-Control-Allow-Origin: *`, así que las
tipografías cargan sin problema desde el dominio de ClickFunnels. Verificado.

## Nota de licencias

- **Cormorant Garamond** — SIL Open Font License. Se puede redistribuir.
- **Brandon Grotesque** — fuente comercial de HVD Fonts. Los `.otf` de este
  repo son **descargables por cualquiera**, lo que va más allá de servir una
  webfont para renderizar el sitio propio. Se subió así por decisión de Vista,
  siguiendo la práctica que ya existía en el sitio de referencia.

  Si algún día hay que cerrarlo: borrar los `.otf`, dejar solo Cormorant, y los
  titulares caen al fallback (Futura / Century Gothic). O convertir a WOFF2 bajo
  una licencia de webfont, que es el camino correcto.
