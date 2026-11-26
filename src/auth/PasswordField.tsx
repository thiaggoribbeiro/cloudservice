import { useState, type ChangeEvent } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "../components/ui/icons";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  const labelText = visible ? "Ocultar senha" : "Mostrar senha";

  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <LockIcon className="field-pill-icon h-[18px] w-[18px]" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="field-pill field-pill-with-action"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={labelText}
          title={labelText}
          className="field-pill-reveal"
        >
          {visible ? (
            <EyeOffIcon className="h-[18px] w-[18px]" />
          ) : (
            <EyeIcon className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    </div>
  );
}