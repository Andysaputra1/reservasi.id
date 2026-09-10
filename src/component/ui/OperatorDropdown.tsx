import CustomDropdown from './CustomDropdown';
interface Props { label: string; value: string; options: string[]; onChange: (value: string) => void; }
export default function OperatorDropdown({ options, ...props }: Props) {
  return <CustomDropdown {...props} options={options.map(value => ({ value, city: value === 'All' ? 'Semua kapal' : value }))} />;
}
