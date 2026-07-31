import type { ButtonHTMLAttributes } from 'react';
type Variant = 'primary' | 'ghost' | 'danger';
export function Button({ variant = 'ghost', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`btn btn-${variant}`} {...rest} />;
}
