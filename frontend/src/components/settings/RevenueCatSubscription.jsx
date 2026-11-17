import { useRef, useState } from "react";
import "./revenuecat-subscription.css";

export default function RevenueCatSubscription({ purchases, onOpenLogin }) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshLock = useRef(false);
  const entitlement = purchases.customerInfo?.entitlements.active.premium;
  const product = purchases.monthly?.product;
  const disabled = purchases.busy || refreshing;

  async function refresh() {
    if (refreshLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    try { await purchases.refresh(); }
    finally { refreshLock.current = false; setRefreshing(false); }
  }

  return <section className="settings-section rc-subscription" aria-label="Subscription">
    <div className="settings-section-head">
      <div>
        <h2>Your subscription</h2>
        <p>Current plan: <strong>{!purchases.signedIn ? "Sign in to check" : !purchases.ready ? "Checking subscription…" : purchases.isPremium ? "Premium" : "Spark"}</strong></p>
      </div>
      {purchases.signedIn ? <button type="button" className="btn-ghost" disabled={disabled} onClick={() => void refresh()}>
        {refreshing ? "Refreshing…" : "Refresh subscription"}
      </button> : null}
    </div>
    {purchases.testMode ? <p className="settings-muted" role="note">Test Store mode — purchases are simulated and you won’t be charged.</p> : null}
    {purchases.error ? <p className="settings-error" role="alert">{purchases.error}</p> : null}
    <article className="plan-card highlight rc-premium-card">
      <h3>Kindling Premium</h3>
      <p>More AI and advanced learning tools for your studies.</p>
      {!purchases.isPremium ? <>
        <p className="plan-price"><strong className="plan-price-main">{product?.price?.formattedPrice || "View pricing"}</strong>{product ? " / month" : ""}</p>
        <p>Monthly subscription. Renews automatically until cancelled. Review any trial, introductory pricing, taxes, and renewal terms at checkout.</p>
      </> : <>
        <p>Your Premium entitlement is active.</p>
        {entitlement?.expirationDate ? <p>{entitlement.willRenew ? "Renews" : "Access until"} {new Date(entitlement.expirationDate).toLocaleDateString()}</p> : null}
      </>}
      <div className="rc-subscription-actions">
        {!purchases.signedIn ? <button type="button" className="btn-primary" onClick={onOpenLogin}>Sign in to subscribe</button> : !purchases.isPremium ? <>
          <button type="button" className="btn-primary" disabled={disabled} onClick={() => void purchases.presentPaywall()}>{purchases.busy ? "Checkout open…" : "View Premium paywall"}</button>
          {product ? <button type="button" className="btn-ghost" disabled={disabled} onClick={() => void purchases.purchaseMonthly()}>Subscribe monthly</button> : null}
        </> : null}
        {purchases.managementURL && !purchases.testMode ? <a className="btn-ghost" href={purchases.managementURL} target="_blank" rel="noopener noreferrer">Manage subscription</a> : null}
      </div>
    </article>
    <p className="settings-muted">Already subscribed? Sign in with the same Kindling account, then refresh your subscription. Web purchases are linked to your account.</p>
    {purchases.isPremium && !purchases.managementURL && !purchases.testMode ? <p className="settings-muted">Use the management link in your billing email, or manage your purchase in the App Store or Google Play where you subscribed.</p> : null}
  </section>;
}
