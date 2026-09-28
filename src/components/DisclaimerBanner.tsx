import { useState } from 'react';

const STORAGE_KEY = 'disclaimerDismissed';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveDismissed(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Storage is blocked; the banner will show again next visit.
  }
}

interface DisclaimerBannerProps {
  onDismiss: () => void;
}

export default function DisclaimerBanner({ onDismiss }: DisclaimerBannerProps) {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;

  return (
    <div className="banner page" role="region" aria-label="Disclaimer">
      <p className="banner__title">Before you start</p>
      <p>
        <strong>For informational and educational purposes only.</strong> Shared Amortization Calculator is a
        calculation tool. Its outputs are estimates based on the inputs and assumptions you provide. They are not
        financial, investment, tax, accounting, or legal advice, and nothing in this project is a recommendation to
        buy, sell, or hold any financial product or to take any particular course of action. Consult a qualified
        professional before making financial decisions.
      </p>
      <button
        type="button"
        onClick={() => {
          saveDismissed();
          setDismissed(true);
          onDismiss();
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
