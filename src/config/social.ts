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
        href: "mailto:antoniobarrionuevosantander@gmail.com",
        linkTitle: "Enviar un correo a Nicolás",
        isActive: true,
    },
    {
        name: "LinkedIn",
        // TODO: cuando crees tu perfil, reemplaza por https://www.linkedin.com/in/TU-USUARIO/
        href: "https://www.linkedin.com/",
        linkTitle: "Nicolás Barrionuevo en LinkedIn",
        isActive: true,
    },
];

export const SOCIAL_ICONS: Record<string, string> = {
    Github: "Github",
    Mail: "Mail",
    LinkedIn: "LinkedIn",
    Linkedin: "LinkedIn",
    RSS: "RSS",
};
