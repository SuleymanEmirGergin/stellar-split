interface LogoProps {
  className?: string;
  size?: number;
  /** Use 'icon' for header/footer, 'hero' for landing CTA */
  variant?: 'icon' | 'hero';
}

export default function Logo({ className = '', size = 32, variant = 'icon' }: LogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 ${variant === 'hero' ? 'drop-shadow-md' : ''} ${className}`}
      aria-hidden
    />
  );
}
