import type { SiteConfig, ThemeConfig, SettingsConfig, UmamiAnalyticsConfig, AnalyticsConfig } from "../types";

export const SITE: SiteConfig = {
    website: "https://sliox.github.io/portafolio/",
    author: "Nicolás Barrionuevo",
    desc: "Portafolio de Nicolás Barrionuevo, estudiante de Técnico en Mecatrónica en INACAP Copiapó, orientado a la minería.",
    title: "Nicolás Barrionuevo",
    ogImage: "avatar.jpg",
    postPerPage: 5,
    favicon: "/favicon.svg",
    lang: "es",
};

export const THEME_CONFIG: ThemeConfig = {
    lightAndDark: true,
    themeLight: "light_default",
    themeDark: "dark_notepad",
};

export const SETTINGS: SettingsConfig = {
    showTagsInNavbar: false,
    showRSSInFooter: false,
    addDevToolsInProduction: false,
};

const umami: UmamiAnalyticsConfig = {
    websiteId: "", // e.g., 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    src: "https://cloud.umami.is/script.js", // Default Umami cloud script URL
}

export const ANALYTICS: AnalyticsConfig = {
    // Google Analytics 4 Measurement ID (e.g., 'G-XXXXXXXXXX')
    ga4Id: "",
    // Umami Analytics configuration
    umami: umami
};
