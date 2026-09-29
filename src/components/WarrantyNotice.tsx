const WARRANTY_TEXT =
  'This calculator and its results are provided "AS IS" and "AS AVAILABLE," without warranty of any kind, ' +
  'express or implied, including but not limited to warranties of accuracy, completeness, reliability, ' +
  'merchantability, fitness for a particular purpose, and non-infringement. Calculations may contain errors, rely ' +
  'on simplified assumptions, or become outdated (for example, tax rules and rates change). You are responsible for ' +
  'verifying any result before relying on it.';

export default function WarrantyNotice() {
  return (
    <div className="banner" role="note">
      <p>
        <strong>No warranty.</strong> {WARRANTY_TEXT}
      </p>
    </div>
  );
}
