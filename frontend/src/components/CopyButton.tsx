import { useState, useCallback, useRef } from 'react';

interface Props {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
  /** Called after successful copy (e.g. to show toast). */
  onCopy?: () => void;
}

export default function CopyButton({ text, className = '', size = 'sm', onCopy }: Props) {
  const [copied, setCopied] = useState(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      onCopy?.();
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      onCopy?.();
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [text, onCopy]);

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Kopyalandı!' : 'Kopyala'}
      className={`inline-flex items-center gap-1 rounded border transition-all duration-200 font-medium ${sizeClasses} ${
        copied
          ? 'bg-green-500/20 border-green-500/40 text-green-400 copy-just-copied'
          : 'bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
      } ${className}`}
    >
      {copied ? (
        <>
          <span className="text-[10px]">✓</span>
          <span>Kopyalandı</span>
        </>
      ) : (
        <>
          <span className="text-[10px]">⎘</span>
          <span>Kopyala</span>
        </>
      )}
    </button>
  );
}
