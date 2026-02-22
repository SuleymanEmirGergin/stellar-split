import { useEffect, useRef } from 'react';

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
  rotate: number;
  shape: 'rect' | 'circle';
}

const COLORS = [
  '#f59e0b', '#10b981', '#6366f1', '#ec4899',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
  '#f97316', '#a3e635',
];

function makeParticles(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 8,
    duration: 2.5 + Math.random() * 2,
    delay: Math.random() * 1.2,
    rotate: Math.random() * 720 - 360,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));
}

interface Props {
  active: boolean;
}

export default function Confetti({ active }: Props) {
  const particles = useRef<ConfettiParticle[]>(makeParticles(70));

  useEffect(() => {
    if (active) {
      particles.current = makeParticles(70);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[500] overflow-hidden">
      {particles.current.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-20px',
            width: p.shape === 'rect' ? p.size : p.size,
            height: p.shape === 'rect' ? p.size * 0.5 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            opacity: 0,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
            '--rotate': `${p.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(var(--rotate)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
