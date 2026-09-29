export default function DisclaimerBanner() {
  return (
    <div className="page">
      <div className="banner" role="region" aria-label="Disclaimer">
        <p className="banner__title">Before you start</p>
        <p>
          <strong>For informational and educational purposes only.</strong> Mortgage Split is a
          calculation tool. Its outputs are estimates based on the inputs and assumptions you provide. They are not
          financial, investment, tax, accounting, or legal advice, and nothing in this project is a recommendation to
          buy, sell, or hold any financial product or to take any particular course of action. Consult a qualified
          professional before making financial decisions.
        </p>
        <p>
          <strong>Privacy.</strong> This app performs all calculations in your browser. No inputs are sent to or
          stored on any server.
        </p>
      </div>
    </div>
  );
}
