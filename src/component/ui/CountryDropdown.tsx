import { useId } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function CountryDropdown({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  const id = useId();
  const { t } = useLanguage();
  return <div className="custom-dropdown">
    <label htmlFor={id} className="dropdown-label">{t(label)}</label>
    <select id={id} className="dropdown-trigger country-select" value={value} onChange={event => onChange(event.target.value)}>
      {['Indonesia', 'Singapura', 'Malaysia'].map(country => <option key={country} value={country}>{t(country)}</option>)}
    </select>
  </div>;
}
