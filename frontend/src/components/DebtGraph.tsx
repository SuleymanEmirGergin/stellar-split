import React from 'react';

interface Debt {
  from: string;
  to: string;
  amount: number;
}

interface Props {
  members: string[];
  debts: Debt[];
}

export const DebtGraph: React.FC<Props> = ({ members, debts }) => {
  const size = 300;
  const radius = 100;
  const centerX = size / 2;
  const centerY = size / 2;

  // Position members in a circle
  const memberPositions = members.reduce((acc, m, i) => {
    const angle = (i / members.length) * 2 * Math.PI;
    acc[m] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
    return acc;
  }, {} as Record<string, { x: number; y: number }>);

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-muted/10 rounded-2xl border border-border overflow-hidden">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        {/* Arrows for debts */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-primary/40" />
          </marker>
        </defs>

        {debts.map((debt, i) => {
          const from = memberPositions[debt.from];
          const to = memberPositions[debt.to];
          if (!from || !to) return null;
          // Amount is in stroops (1 XLM = 10^7); show as XLM for label and line weight
          const amountXlm = debt.amount / 10_000_000;

          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth={Math.min(2 + amountXlm / 5, 6)}
                className="text-primary/20"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 5}
                fontSize="10"
                fontWeight="bold"
                className="fill-primary/60"
                textAnchor="middle"
              >
                {amountXlm >= 1 ? amountXlm.toFixed(1) : amountXlm.toFixed(2)} XLM
              </text>
            </g>
          );
        })}

        {/* Member circles */}
        {members.map((m, i) => {
          const pos = memberPositions[m];
          return (
            <g key={i}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r="20"
                className="fill-card stroke-border"
                strokeWidth="2"
              />
              <text
                x={pos.x}
                y={pos.y}
                fontSize="10"
                fontWeight="black"
                className="fill-foreground"
                textAnchor="middle"
                dy=".3em"
              >
                {m.substring(0, 2).toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
        Interaktif Borç Ağı
      </p>
    </div>
  );
};
