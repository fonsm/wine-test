import type { TFunction } from 'i18next';
import type { Language } from '../i18n';

interface LanguageSwitchProps {
  t: TFunction;
  language: Language;
  onChange: (language: Language) => void;
}

const OPTIONS = [
  { language: 'de', code: 'DE', nameKey: 'app:languageDe' },
  { language: 'en', code: 'EN', nameKey: 'app:languageEn' },
] as const;

/** DE | EN toggle. The visible code is part of each button's accessible name ("Deutsch (DE)"). */
export function LanguageSwitch({ t, language, onChange }: LanguageSwitchProps) {
  return (
    <div className="language-switch" role="group" aria-label={t('app:language')}>
      {OPTIONS.map((option) => (
        <button
          key={option.language}
          type="button"
          lang={option.language}
          aria-label={t(option.nameKey)}
          aria-pressed={option.language === language}
          onClick={() => {
            onChange(option.language);
          }}
        >
          {option.code}
        </button>
      ))}
    </div>
  );
}
