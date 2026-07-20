import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const classFor: Record<Variant, string> = {
  primary: "btn",
  ghost: "btn btn--ghost",
  danger: "btn btn--danger",
};

export function Button({ variant = "primary", children, className, ...rest }: Props) {
  return (
    <button type="button" className={`${classFor[variant]}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </button>
  );
}
