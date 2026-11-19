// Antepone la subcarpeta del sitio (astro.config.mjs → base) a una ruta interna.
// Ej.: con base "/portafolio", withBase("/cv") → "/portafolio/cv".
// Sin esto, los enlaces absolutos de la plantilla se rompen en GitHub Pages
// cuando el sitio no está en la raíz del dominio.
export function withBase(path: string): string {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    if (!path.startsWith("/")) return path;
    return `${base}${path}` || "/";
}

// Compara rutas ignorando la barra final.
export function samePath(a: string, b: string): boolean {
    const clean = (p: string) => p.replace(/\/+$/, "") || "/";
    return clean(a) === clean(b);
}
