export default function LegalPage({ kind, onBack, onSupport }) {
  const isPrivacy = kind === "privacy";
  return (
    <article className="legal-page">
      <button type="button" className="btn-ghost" onClick={onBack}>← Back to Kindling</button>
      <p className="eyebrow">Kindling beta · Draft for review</p>
      <h1>{isPrivacy ? "Privacy notice" : "Terms of use"}</h1>
      <div className="legal-draft-note" role="note">
        This is a plain-language beta draft, not a final legal agreement. Kindling must complete jurisdiction-specific legal review and confirm its operating details before inviting an external cohort.
      </div>
      {isPrivacy ? <PrivacyContent onSupport={onSupport} /> : <TermsContent onSupport={onSupport} />}
      <p className="legal-updated">Draft updated October 13, 2026</p>
    </article>
  );
}

function PrivacyContent({ onSupport }) {
  return (
    <div className="legal-copy">
      <h2>What Kindling handles</h2>
      <p>Kindling stores account details and learning information needed to provide tutoring, such as profile preferences, subjects, lesson activity, saved conversations, mastery progress, and optional homework uploads. The browser may also store lesson history and preferences on this device.</p>
      <p>If you contact support, Kindling stores your category, subject, message, and optional reply address in a staff-only queue. Signed-in requests are associated with the account. The support inbox receives a ticket reference and category when the inbox is configured; the message itself stays in the staff queue.</p>
      <h2>AI tutoring providers</h2>
      <p>Lesson text and, when you ask for homework help, relevant uploaded material may be sent to Google Gemini. Depending on the selected route, the request uses a learner-provided API key or Kindling’s server-held key. Provider processing is also subject to the provider’s terms and privacy practices.</p>
      <h2>Access, retention, and choices</h2>
      <p>Kindling staff with operational access may review account or support data to provide the service and resolve problems. A 30-day homework image retention setting exists, but the scheduled purge must be verified for the deployed storage before it can be relied on. Account learning data remains until account deletion or operator removal. Support requests may remain in the staff queue after account deletion, without the account association; ask support to remove a request when appropriate. Deletion does not erase copies already stored in a browser or a third-party provider.</p>
      <p>Signed-in learners can request an account export or deletion through the authenticated account API or Help & feedback. Optional progress emails are sent only when the learner enables the digest and chooses a recipient.</p>
      <h2>Contact</h2>
      <p>For a privacy question, use <button type="button" className="linkish" onClick={onSupport}>Help & feedback</button>. Do not include passwords, payment-card details, or sensitive personal information.</p>
    </div>
  );
}

function TermsContent({ onSupport }) {
  return (
    <div className="legal-copy">
      <h2>Using Kindling</h2>
      <p>Kindling is a learning aid that helps learners practice and understand school subjects. Use it respectfully, keep account credentials private, and follow your school’s rules for AI-assisted work. Do not use the service to harm others or to submit someone else’s private information.</p>
      <h2>Learning and safety</h2>
      <p>AI explanations and answers can be incomplete or wrong. Check important work with a teacher or trusted source. Kindling is a tutor, not a counselor, emergency service, or substitute for a teacher or guardian. Do not use the lesson or support form to seek emergency help.</p>
      <h2>Accounts, plans, and beta service</h2>
      <p>Each account represents one learner and one seat. Paid beta plans use an invoice and are activated after staff confirm payment. Bring-your-own-key model use may be billed directly by the chosen AI provider. Features and availability may change while Kindling is in beta.</p>
      <h2>Questions</h2>
      <p>If something is not working or you have a question about these draft terms, use <button type="button" className="linkish" onClick={onSupport}>Help & feedback</button>. The support form is not an emergency channel.</p>
    </div>
  );
}
