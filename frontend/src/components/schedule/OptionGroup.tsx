interface OptionGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  /** Selected values. Single-select callers pass zero or one element. */
  selected: T[];
  /**
   * Fires with the pressed value. The caller decides whether that replaces
   * the selection or toggles membership in it.
   */
  onSelect: (value: T) => void;
}

/**
 * A segmented row of buttons shared by every ranking control, so start time,
 * preferred days, and gap mode read as one kind of control rather than three.
 */
export function OptionGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: OptionGroupProps<T>) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.value)}
              className={`cursor-pointer rounded-md border px-2 py-1 text-xs font-medium transition ${
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
