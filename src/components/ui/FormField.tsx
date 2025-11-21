"use client";

import { ReactNode, useMemo } from "react";
import { X } from "lucide-react";

const baseField = "flex flex-col gap-1 text-sm";
const baseLabel = "text-[11px] font-semibold text-muted-foreground";
const baseHelper = "text-[11px] text-muted-foreground";
const shell =
  "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 shadow-sm outline-none focus-within:border-primary focus-within:ring-1 focus-within:ring-primary";
const inputClass = "h-8 w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none";

export type CommonFieldProps = {
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  trailing?: ReactNode;
};

export type TextFieldProps = CommonFieldProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password";
};

export function TextField({
  label,
  helperText,
  errorText,
  required,
  value,
  onChange,
  placeholder,
  trailing,
  type = "text",
}: TextFieldProps) {
  return (
    <label className={baseField}>
      {label && (
        <span className={baseLabel}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </span>
      )}
      <div className={`${shell} ${errorText ? "border-red-400 focus-within:ring-red-400" : ""}`}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
        {value && !required && (
          <X
            className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.preventDefault();
              onChange("");
            }}
          />
        )}
        {trailing}
      </div>
      {helperText && <span className={baseHelper}>{helperText}</span>}
      {errorText && <span className="text-[11px] text-red-500">{errorText}</span>}
    </label>
  );
}

export type NumberFieldProps = CommonFieldProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowNegative?: boolean;
  unit?: string;
};

function formatNumber(value: string, allowNegative?: boolean) {
  const sanitized = value
    .replace(/[^\d-]/g, "")
    .replace(/(?!^)-/g, "")
    .replace(/^(-?)(\d+).*$/, "$1$2");
  if (!sanitized) return "";
  if (!allowNegative && sanitized.startsWith("-")) return sanitized.slice(1);
  const negative = sanitized.startsWith("-");
  const digits = sanitized.replace(/-/g, "");
  const withComma = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? `-${withComma}` : withComma;
}

export function NumberField({
  label,
  helperText,
  errorText,
  required,
  value,
  onChange,
  placeholder,
  allowNegative,
  unit,
  trailing,
}: NumberFieldProps) {
  const formatted = useMemo(() => formatNumber(value, allowNegative), [value, allowNegative]);

  return (
    <label className={baseField}>
      {label && (
        <span className={baseLabel}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </span>
      )}
      <div className={`${shell} ${errorText ? "border-red-400 focus-within:ring-red-400" : ""}`}>
        <input
          inputMode="numeric"
          pattern="[0-9,\-]*"
          value={formatted}
          placeholder={placeholder}
          className={inputClass}
          onChange={(e) => onChange(formatNumber(e.target.value, allowNegative))}
        />
        {(unit || trailing) && (
          <span className="text-[11px] text-muted-foreground">{unit || trailing}</span>
        )}
      </div>
      {helperText && <span className={baseHelper}>{helperText}</span>}
      {errorText && <span className="text-[11px] text-red-500">{errorText}</span>}
    </label>
  );
}

export type SelectFieldProps = CommonFieldProps & {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
};

export function SelectField({
  label,
  helperText,
  errorText,
  required,
  value,
  onChange,
  options,
  placeholder,
}: SelectFieldProps) {
  return (
    <label className={baseField}>
      {label && (
        <span className={baseLabel}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${shell} h-10 text-sm ${errorText ? "border-red-400 focus:border-red-400 focus:ring-red-400" : ""}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helperText && <span className={baseHelper}>{helperText}</span>}
      {errorText && <span className="text-[11px] text-red-500">{errorText}</span>}
    </label>
  );
}

export type TextAreaFieldProps = CommonFieldProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
};

export function TextAreaField({
  label,
  helperText,
  errorText,
  required,
  value,
  onChange,
  placeholder,
  minRows = 3,
}: TextAreaFieldProps) {
  return (
    <label className={baseField}>
      {label && (
        <span className={baseLabel}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </span>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${shell} text-sm`}
        rows={minRows}
        style={{ minHeight: `${minRows * 20}px` }}
      />
      {helperText && <span className={baseHelper}>{helperText}</span>}
      {errorText && <span className="text-[11px] text-red-500">{errorText}</span>}
    </label>
  );
}
