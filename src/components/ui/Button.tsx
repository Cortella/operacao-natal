import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "promo" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Mostra o indicador de carregamento e bloqueia o clique. */
  loading?: boolean;
  children: ReactNode;
  className?: string;
};

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };

type AsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  "aria-label"?: string;
};

export type ButtonProps = AsButton | AsLink;

const variantClass: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "btn-secondary",
  promo: "btn-promo",
  outline: "btn-outline",
};

const sizeClass: Record<ButtonSize, string> = { sm: "btn-sm", md: "", lg: "btn-lg" };

/** Botão base do Design System. Renderiza um link quando recebe `href`. */
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", fullWidth, loading, children, className } = props;
  const classes = cn(
    "btn",
    variantClass[variant],
    sizeClass[size],
    fullWidth && "w-full",
    className,
  );

  if (props.href !== undefined) {
    const external = /^https?:\/\//.test(props.href);
    const linkProps = {
      className: classes,
      target: props.target,
      rel: props.rel ?? (props.target === "_blank" ? "noopener noreferrer" : undefined),
      "aria-label": props["aria-label"],
    };
    return external ? (
      <a href={props.href} {...linkProps}>
        {children}
      </a>
    ) : (
      <Link href={props.href} {...linkProps}>
        {children}
      </Link>
    );
  }

  const {
    variant: _variant,
    size: _size,
    fullWidth: _fullWidth,
    loading: _loading,
    children: _children,
    className: _className,
    href: _href,
    disabled,
    type = "button",
    ...rest
  } = props;
  void [_variant, _size, _fullWidth, _loading, _children, _className, _href];

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

type Preset = Omit<AsButton, "variant"> | Omit<AsLink, "variant">;

/** Ação principal: fundo vermelho. */
export function PrimaryButton(props: Preset) {
  return <Button {...(props as ButtonProps)} variant="primary" />;
}

/** Ação secundária: fundo verde. */
export function SecondaryButton(props: Preset) {
  return <Button {...(props as ButtonProps)} variant="secondary" />;
}

/** Destaque promocional: fundo dourado. */
export function PromoButton(props: Preset) {
  return <Button {...(props as ButtonProps)} variant="promo" />;
}
