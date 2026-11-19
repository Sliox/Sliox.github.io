import type { SocialLink } from "../types";

// Para mostrar un enlace, pon tu dato real en href y cambia isActive a true.
export const SOCIALS: SocialLink[] = [
    {
        name: "Github",
        href: "https://github.com/Sliox",
        linkTitle: "GitHub de Nicolás Barrionuevo",
        isActive: true,
    },
    {
        name: "Mail",
        href: "mailto:tu-correo@ejemplo.cl", // TODO: tu correo
        linkTitle: "Enviar un correo a Nicolás",
        isActive: false,
    },
    {
        name: "LinkedIn",
        href: "https://www.linkedin.com/in/tu-usuario/", // TODO: tu LinkedIn
        linkTitle: "Nicolás Barrionuevo en LinkedIn",
        isActive: false,
    },
];

export const SOCIAL_ICONS: Record<string, string> = {
    Github: "Github",
    Mail: "Mail",
    LinkedIn: "LinkedIn",
    Linkedin: "LinkedIn",
    RSS: "RSS",
};
