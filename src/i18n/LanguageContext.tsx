import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import english from './en.json';

type Language = 'id' | 'en';
const messages: Record<string, string> = english;
const LanguageContext = createContext({
  language: 'id' as Language,
  setLanguage: (_language: Language) => {},
  t: (text: string): string => text,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem('reservasi-language') === 'en' ? 'en' : 'id'; }
    catch { return 'id'; }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem('reservasi-language', language); } catch { /* Storage may be disabled. */ }
  }, [language]);
  const t = (text: string) => language === 'en' ? messages[text] ?? text : text;
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
