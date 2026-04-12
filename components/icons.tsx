import { forwardRef } from "react";
import type { ReactElement, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  absoluteStrokeWidth?: boolean;
  size?: number | string;
};

type BaseIconProps = IconProps & {
  iconName: string;
};

const BaseIcon = forwardRef<SVGSVGElement, BaseIconProps>(function BaseIcon(
  {
    absoluteStrokeWidth = false,
    children,
    className,
    color = "currentColor",
    iconName,
    size = 24,
    strokeWidth = 2,
    ...rest
  },
  ref,
) {
  const numericSize = typeof size === "number" ? size : Number(size);
  const resolvedStrokeWidth =
    absoluteStrokeWidth && Number.isFinite(numericSize) && numericSize > 0
      ? (Number(strokeWidth) * 24) / numericSize
      : strokeWidth;
  const resolvedClassName = className
    ? `neenja-icon neenja-icon-${iconName} ${className}`
    : `neenja-icon neenja-icon-${iconName}`;
  const hasAccessibleLabel =
    rest["aria-label"] !== undefined || rest["aria-labelledby"] !== undefined || rest.role !== undefined;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={resolvedStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={resolvedClassName}
      {...(!hasAccessibleLabel ? { "aria-hidden": "true" } : {})}
      {...rest}
    >
      {children}
    </svg>
  );
});

function createIcon(iconName: string, children: ReactElement[]) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(props, ref) {
    return (
      <BaseIcon ref={ref} iconName={iconName} {...props}>
        {children}
      </BaseIcon>
    );
  });

  Icon.displayName = iconName;
  return Icon;
}

export const Check = createIcon("check", [
  <path key="check-path" d="M20 6 9 17l-5-5" />,
]);

export const ChevronDown = createIcon("chevron-down", [
  <path key="chevron-down-path" d="m6 9 6 6 6-6" />,
]);

export const Copy = createIcon("copy", [
  <rect key="copy-rect" width="14" height="14" x="8" y="8" rx="2" ry="2" />,
  <path key="copy-path" d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />,
]);

export const LockKeyhole = createIcon("lock-keyhole", [
  <circle key="lock-circle" cx="12" cy="16" r="1" />,
  <rect key="lock-rect" x="3" y="10" width="18" height="12" rx="2" />,
  <path key="lock-path" d="M7 10V7a5 5 0 0 1 10 0v3" />,
]);

export const Menu = createIcon("menu", [
  <path key="menu-path-top" d="M4 5h16" />,
  <path key="menu-path-middle" d="M4 12h16" />,
  <path key="menu-path-bottom" d="M4 19h16" />,
]);

export const Search = createIcon("search", [
  <path key="search-path" d="m21 21-4.34-4.34" />,
  <circle key="search-circle" cx="11" cy="11" r="8" />,
]);

export const X = createIcon("x", [
  <path key="x-path-left" d="M18 6 6 18" />,
  <path key="x-path-right" d="m6 6 12 12" />,
]);
