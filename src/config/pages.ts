import type { PagesConfig } from "../types";

// Secciones de la plantilla que no se usan quedan desactivadas (isActive: false).
export const PAGES: PagesConfig = {
    home: {
        title: "Sobre mí",
        subtitle: "",
        isActive: true,
    },
    blog: {
        title: "Blog",
        subtitle: "",
        isActive: false,
    },
    publications: {
        title: "Publicaciones",
        subtitle: "",
        isActive: false,
    },
    talks: {
        title: "Charlas",
        subtitle: "",
        isActive: false,
    },
    projects: {
        title: "Portafolio",
        subtitle: "Proyectos de mecatrónica, automatización e IA aplicada.",
        isActive: true,
    },
    teaching: {
        title: "Docencia",
        subtitle: "",
        isActive: false,
    },
    tags: {
        title: "Etiquetas",
        subtitle: "Proyectos por tema.",
        isActive: true,
    },
    cv: {
        title: "Currículum",
        subtitle: "Formación y experiencia",
        isActive: true,
    },
};
