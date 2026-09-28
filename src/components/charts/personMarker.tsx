const SHAPES = ['circle', 'square', 'triangle'] as const;
const MARKERS_PER_LINE = 6;

interface DotPosition {
  cx?: number;
  cy?: number;
  index?: number;
}

// Markers are staggered per person so identical lines still show every person's shape.
export function personMarker(personIndex: number, lastIndex: number, color: string) {
  const every = Math.max(1, Math.round(lastIndex / MARKERS_PER_LINE));
  const offset = Math.round((every * personIndex) / SHAPES.length);
  const shape = SHAPES[personIndex];
  return function PersonMarker({ cx, cy, index }: DotPosition) {
    if (cx === undefined || cy === undefined || index === undefined || (index + offset) % every !== 0) {
      return <g />;
    }
    const className = `person-marker person-marker--${shape}`;
    if (shape === 'circle') return <circle className={className} cx={cx} cy={cy} r={5} fill={color} />;
    if (shape === 'square') {
      return <rect className={className} x={cx - 5} y={cy - 5} width={10} height={10} fill={color} />;
    }
    return (
      <polygon className={className} points={`${cx},${cy - 6} ${cx + 6},${cy + 5} ${cx - 6},${cy + 5}`} fill={color} />
    );
  };
}
