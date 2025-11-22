"use client";

type SwitchProps = {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  onLabel?: string;
  offLabel?: string;
  disabled?: boolean;
};

export function Switch({
  label,
  description,
  checked,
  onChange,
  onLabel = "ON",
  offLabel = "OFF",
  disabled = false,
}: SwitchProps) {
  const toggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        checked
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 shadow-sm"
          : "border-border bg-card text-foreground shadow-sm"
      } ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary/60 hover:shadow"} `}
    >
      <div className="min-w-0 pr-3">
        {label && <div className="text-xs font-semibold leading-5">{label}</div>}
        {description && (
          <div className="text-[11px] leading-4 text-muted-foreground">{description}</div>
        )}
      </div>
      <span
        className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-muted"
        } ${disabled ? "opacity-70" : ""}`}
      >
        <span
          className={`pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : ""
          }`}
        />
        <span className="sr-only">{checked ? onLabel : offLabel}</span>
        <span
          className={`absolute left-2 text-[10px] font-semibold text-white transition-opacity ${
            checked ? "opacity-80" : "opacity-0"
          }`}
        >
          {onLabel}
        </span>
        <span
          className={`absolute right-2 text-[10px] font-semibold text-white transition-opacity ${
            checked ? "opacity-0" : "opacity-70"
          }`}
        >
          {offLabel}
        </span>
      </span>
    </button>
  );
}
