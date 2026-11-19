# Portafolio de Nicolás Barrionuevo

Sitio hecho con [Astro](https://astro.build) a partir de la plantilla
[Academic Portfolio Astro](https://github.com/rubzip/academic-portfolio-astro) (licencia MIT, ver `LICENSE`).
Se publica solo en **https://sliox.github.io/portafolio/** cada vez que haces `push` a `main`
(GitHub Actions, archivo `.github/workflows/deploy.yml`).

## Editar el contenido (no hace falta tocar código)

| Qué | Dónde |
|---|---|
| Nombre, carrera, institución y presentación ("Sobre mí") | `src/content/bio.md` |
| Proyectos (uno por archivo) | `src/content/projects/proyecto-0N.md` |
| Imágenes de los proyectos | `src/assets/proyectos/` |
| Currículum | `src/content/cv.md` |
| Enlaces (GitHub, correo, LinkedIn) | `src/config/social.ts` |
| Menú y títulos de página | `src/config/navigation.ts`, `src/config/pages.ts` |
| Colores (claro / oscuro) | `src/config/site.ts` → `THEME_CONFIG`, paletas en `src/config/themes.ts` |
| Foto de perfil | `public/avatar.jpg` |

Para agregar un proyecto, copia un `.md` de `src/content/projects/`, cámbiale el nombre y edítalo.

## Probar en tu computador

Requiere Node.js 22.12 o superior.

```bash
npm install
npm run dev
```

Abre la dirección que muestra la terminal (termina en `/portafolio/`).

## Cambios respecto de la plantilla

- Enlaces con la subcarpeta `/portafolio/` (`src/utils/url.ts → withBase`), para que funcionen en GitHub Pages.
- Textos en español y tema oscuro por defecto.
- Secciones de publicaciones, charlas, docencia y blog desactivadas en `src/config/pages.ts`.
- Intro animada de brazos robóticos: `public/js/robot-intro.js` y estilos al final de `src/styles/global.css`.

## Créditos

- Plantilla: Academic Portfolio Astro, © 2026 Rubén Gijón, licencia MIT.
- Imagen de perfil: "Robot Arm (NIH BioArt 457)", NIAID / Ryan Kissinger, dominio público
  ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Robot_Arm_(NIH_BioArt_457).png)).

## Pendiente

- Busca `TODO` y `[` en `src/content/` y reemplaza los textos provisorios.
- Activa correo y LinkedIn en `src/config/social.ts` con tus datos.
- Guarda tu CV como `public/cv.pdf` y descomenta el enlace en `src/content/cv.md`.
