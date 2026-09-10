import { useLanguage } from '../../i18n/LanguageContext';
import { useId } from 'react';
interface Props { label: string; value: string; options: string[]; onChange: (value: string) => void; }
export default function OperatorDropdown({ label, value, options, onChange }: Props) {
  const { t } = useLanguage();
  const id = useId();
  return <div className="custom-dropdown"><label htmlFor={id} className="dropdown-label">{t(label)}</label><select id={id} className="navbar-ferry-select" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{option === 'All' ? t('Semua kapal') : option}</option>)}</select></div>;
}
