import { useEffect, useState } from 'react';

interface ShareControlsProps {
  shareUrl: string;
  onReset: () => void;
}

export default function ShareControls({ shareUrl, onReset }: ShareControlsProps) {
  const [copied, setCopied] = useState(false);
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard.writeText(shareUrl).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <div className="share-controls">
      {canCopy && (
        <button type="button" className="secondary" onClick={copy}>
          Copy Scenario
        </button>
      )}
      <button type="button" className="secondary" onClick={onReset}>
        Reset
      </button>
      <span role="status" className="share-status">
        {copied ? 'Copied' : ''}
      </span>
    </div>
  );
}
