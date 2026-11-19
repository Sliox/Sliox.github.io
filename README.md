# Portafolio de Nicolás Barrionuevo

HTML, CSS y JS sin dependencias ni paso de compilación. Se puede abrir con doble clic en `index.html`.

```
index.html            Sobre mí + proyectos destacados (con la animación de los brazos)
portafolio.html       Todos los proyectos
cv.html               Currículum
proyectos/            Una página por proyecto
css/style.css         Estilos (tema "mint" de la plantilla; oscuro por defecto)
js/main.js            Tema, menú en móvil, botón "Contacto", año del pie
js/robot-intro.js     Animación de los brazos robóticos
img/                  Avatar, favicon e imágenes de proyectos
files/                Pon aquí tu cv.pdf
```

La cabecera y la barra lateral se repiten en cada página: si cambias tu bio o tus enlaces, cámbialos en todas.

## Pendiente
- Busca `TODO` y `[` en los `.html` y reemplaza los textos provisorios.
- Correo y LinkedIn están comentados en la barra lateral: descoméntalos con tus datos.
- Cambia `img/proyecto-0N.svg` por fotos reales.
- El perfil no tiene foto (como Minimal Mistakes sin avatar). Para poner una, agrega antes de `author__content` en cada página:
  `<div class="author__avatar"><img src="img/tu-foto.jpg" alt="Nicolás Barrionuevo" width="175" height="175"></div>`
- Guarda tu CV como `files/cv.pdf`.
