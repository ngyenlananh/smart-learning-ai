declare module "./i18n" {
  const i18n: {
    language: string;
    changeLanguage: (language: string) => Promise<unknown>;
  };
  export default i18n;
}

export {};
