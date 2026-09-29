// Moves label positions apart so neighbours are at least `gap` apart and all stay within [min, max],
// displacing each group of clashing labels evenly about where they wanted to be.
// Returns positions in the same order as `desired`.
export function spreadLabels(desired: number[], gap: number, min: number, max: number): number[] {
  const order = desired.map((_, i) => i).sort((a, b) => desired[a] - desired[b]);
  const clusters: { top: number; size: number; sum: number }[] = [];
  const place = (c: { top: number; size: number; sum: number }) => {
    const top = c.sum / c.size - ((c.size - 1) * gap) / 2;
    c.top = Math.max(min, Math.min(top, max - (c.size - 1) * gap));
  };

  for (const i of order) {
    const cluster = { top: 0, size: 1, sum: desired[i] };
    place(cluster);
    clusters.push(cluster);
    while (clusters.length > 1) {
      const last = clusters[clusters.length - 1];
      const prev = clusters[clusters.length - 2];
      if (prev.top + prev.size * gap <= last.top) break;
      clusters.pop();
      prev.size += last.size;
      prev.sum += last.sum;
      place(prev);
    }
  }

  const positions: number[] = new Array(desired.length);
  let k = 0;
  for (const c of clusters) {
    for (let j = 0; j < c.size; j++) positions[order[k++]] = c.top + j * gap;
  }
  return positions;
}
