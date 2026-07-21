import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { playSfx } from "../audio/sfx";

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

export function Button({ variant = "primary", children, className, onClick, ...rest }: Props) {
  // ทุกปุ่มมีเสียงแตะเหมือนกันหมด — ไม่ต้องไปใส่ทีละที่
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    playSfx("tap");
    onClick?.(event);
  }

  return (
    <button
      type="button"
      className={`${classFor[variant]}${className ? ` ${className}` : ""}`}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
}
