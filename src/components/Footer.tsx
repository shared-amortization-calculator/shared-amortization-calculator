const SOURCE_URL = 'https://github.com/shared-amortization-calculator/shared-amortization-calculator';
const LICENSE_URL = 'https://www.gnu.org/licenses/agpl-3.0.html';

export default function Footer() {
  return (
    <footer className="site-footer page">
      <p>
        Copyright © 2026 Oliver Gorwits. Free software under the <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">AGPL-3.0</a>.{' '}
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Source code</a>
      </p>
    </footer>
  );
}
