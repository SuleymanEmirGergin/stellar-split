interface Slice {
  label: string;
  value: number;
  color: string;
  icon: string;
}

interface Props {
  slices: Slice[];
  size?: number;
  title?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export default function DonutChart({ slices, size = 200, title }: Props) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.58;
  const strokeW = outerR - innerR;

  let cumDeg = 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* SVG donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((sl, i) => {
            const pct = sl.value / total;
            const sweep = pct * 360;
            const startDeg = cumDeg;
            const endDeg = cumDeg + sweep - (sweep < 360 ? 0.5 : 0);
            cumDeg += sweep;

            const path = arcPath(cx, cy, (outerR + innerR) / 2, startDeg, endDeg);
            return (
              <path
                key={i}
                d={path}
                fill="none"
                stroke={sl.color}
                strokeWidth={strokeW}
                strokeLinecap="round"
                className="transition-all duration-300"
                style={{ filter: 'drop-shadow(0 0 4px ' + sl.color + '44)' }}
              >
                <title>{sl.label}: {sl.value} ({(pct * 100).toFixed(1)}%)</title>
              </path>
            );
          })}
          {/* Center text */}
          <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground text-sm font-bold" style={{ fontSize: 13, fontWeight: 700 }}>
            {total}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 16, fontWeight: 600, fill: 'hsl(var(--primary) / 0.9)' }}>
            Toplam
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 flex-1 w-full">
        {title && <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{title}</div>}
        {slices.map((sl, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sl.color }} />
            <span className="flex-1 truncate text-foreground">{sl.icon} {sl.label}</span>
            <span className="font-mono font-semibold text-foreground">{sl.value}</span>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {((sl.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
