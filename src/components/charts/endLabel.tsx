interface LabelPosition {
  x?: number | string;
  y?: number | string;
  index?: number;
}

export function endLabel(text: string, lastIndex: number, color: string) {
  return function EndLabel({ x, y, index }: LabelPosition) {
    if (index !== lastIndex || x === undefined || y === undefined) return <g />;
    return (
      <text x={Number(x)} y={Number(y)} dx={-4} dy={-8} textAnchor="end" fill={color} fontSize={13} fontWeight={600}>
        {text}
      </text>
    );
  };
}
