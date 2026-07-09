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
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="eyebrow text-brand-gray">
        {label}
      </label>
      <div className="relative">
        <LockIcon className="field-pill-icon" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="field-pill field-pill-with-action"
          placeholder="........"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={labelText}
          title={labelText}
          className="field-pill-reveal"
        >
          {visible ? (
            <EyeOffIcon className="h-[19px] w-[19px]" />
          ) : (
            <EyeIcon className="h-[19px] w-[19px]" />
          )}
        </button>
      </div>
    </div>
  );
}