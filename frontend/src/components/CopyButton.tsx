import { useState, useCallback } from 'react';

interface Props {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function CopyButton({ text, className = '', size = 'sm' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Kopyalandı!' : 'Kopyala'}
      className={`inline-flex items-center gap-1 rounded border transition-all duration-200 font-medium ${sizeClasses} ${
        copied
          ? 'bg-green-500/20 border-green-500/40 text-green-400'
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
