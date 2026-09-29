import { DefaultZIndexes, usePlotArea, useYAxisScale, ZIndexLayer } from 'recharts';
import { spreadLabels } from './spreadLabels';

export interface EndLabel {
  text: string;
  value: number;
  color: string;
}

// Firefox draws 13px text in an 18px box, taller than other browsers.
const LINE_HEIGHT = 19;
// Labels sit just above the end of their line, and at least this far inside the chart's top edge.
const ABOVE_LINE = 12;
const TOP_EDGE = 10;

// Draws each line's name at its right-hand end, spread apart so no two labels overlap.
export default function EndLabels({ labels }: { labels: EndLabel[] }) {
  const plot = usePlotArea();
  const scale = useYAxisScale();
  if (!plot || !scale) return null;

  const desired = labels.map((l) => (scale(l.value) ?? plot.y + plot.height) - ABOVE_LINE);
  const positions = spreadLabels(desired, LINE_HEIGHT, TOP_EDGE, plot.y + plot.height - LINE_HEIGHT / 2);

  return (
    <ZIndexLayer zIndex={DefaultZIndexes.label}>
      {labels.map((l, i) => (
        <text
          key={i}
          className="end-label"
          x={plot.x + plot.width - 4}
          y={positions[i]}
          textAnchor="end"
          dominantBaseline="central"
          fill={l.color}
          // A halo in the page colour keeps labels legible where they cross a line.
          stroke="var(--bg)"
          strokeWidth={4}
          strokeLinejoin="round"
          paintOrder="stroke"
          fontSize={13}
          fontWeight={600}
        >
          {l.text}
        </text>
      ))}
    </ZIndexLayer>
  );
}
