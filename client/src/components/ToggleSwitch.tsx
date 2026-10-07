import Switch from "@mui/material/Switch";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name, e.g. the setting's title. */
  inputLabel: string;
  disabled?: boolean;
  testId?: string;
};

/**
 * An MUI switch whose input (the element that is clicked, disabled and
 * announced) carries the test id and an explicit aria-checked.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  inputLabel,
  disabled = false,
  testId,
}) => (
  <Switch
    checked={checked}
    disabled={disabled}
    onChange={(e) => onChange(e.target.checked)}
    slotProps={{
      input: {
        "aria-label": inputLabel,
        "aria-checked": checked,
        ...(testId ? { "data-testid": testId } : {}),
      } as React.InputHTMLAttributes<HTMLInputElement>,
    }}
  />
);
