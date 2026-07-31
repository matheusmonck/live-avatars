import type { InputHTMLAttributes } from 'react';
export function Field({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field"><span>{label}</span><input {...rest} /></label>;
}
