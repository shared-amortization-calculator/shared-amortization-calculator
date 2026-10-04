import { useEffect, useState } from 'react';

// A floating link for narrow screens (CSS hides it on wide ones), shown while
// the results are still below the viewport.
export default function JumpToResults({ targetId }: { targetId: string }) {
  const [resultsBelow, setResultsBelow] = useState(true);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setResultsBelow(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <a className="jump-to-results" href={`#${targetId}`} aria-label="Jump to results" hidden={!resultsBelow}>
      <span aria-hidden="true">↓ </span>Results
    </a>
  );
}
