import { useEffect, useId, useMemo, useState } from 'react';
import { timeZoneOptions } from '../constants/timeZones.js';

export default function TimeZoneSelect({ value = '', onChange, placeholder = '', className = '' }) {
  const [inputValue, setInputValue] = useState(value);
  const generatedId = useId();
  const listId = `${generatedId}-timezones`;

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const filteredOptions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) {
      return timeZoneOptions;
    }
    return timeZoneOptions.filter((zone) => zone.toLowerCase().includes(query));
  }, [inputValue]);

  const commitValue = (newValue) => {
    setInputValue(newValue);
    if (timeZoneOptions.includes(newValue) && typeof onChange === 'function') {
      onChange(newValue);
    }
  };

  return (
    <div className={`timezone-select ${className}`.trim()}>
      <input
        type="search"
        list={listId}
        value={inputValue}
        onChange={(event) => commitValue(event.target.value)}
        onBlur={() => {
          if (!timeZoneOptions.includes(inputValue)) {
            setInputValue(value || '');
          }
        }}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {filteredOptions.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
    </div>
  );
}
