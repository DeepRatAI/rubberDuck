# Moderation Operations Runbook

RubberDuck moderation must protect users without creating public pile-ons. Reports are private, and the product must not expose public accusation counters.

## Daily Beta Review

1. Open `/admin/reports`.
2. Review unresolved reports by severity:
   - malicious code
   - harassment
   - spam
   - copyright
   - other
3. Check the reported entity in context.
4. Hide or restore content.
5. Mark the report resolved.
6. Open `/admin/users` when content review reveals repeated abuse, spam, malicious uploads, or account-level risk.

## Content Actions

- Restore: use when a report is invalid or content was incorrectly hidden.
- Hide: use for spam, abuse, malicious content, doxxing, or clear policy violations.
- Escalate: use when account-level enforcement, legal review, or security review is needed.

## Account-Level Enforcement

Use `/admin/users` for admin-only warnings, seven-day suspensions, bans, and restores. Each action writes `account_moderation_actions` plus an `audit_events` record. Suspensions set `users.banned=true` with `ban_expires`; expired suspensions are cleared when the user next authenticates. Bans set `users.banned=true` without an expiry.

Use account enforcement when:

- a user repeatedly posts spam or malicious links;
- reports show harassment, doxxing, or credential phishing;
- uploaded media or executable course content creates safety risk;
- a previously warned or suspended user resumes the same behavior.

Do not restrict your own account. Do not use account enforcement as a public signal; reporter identity and report volume remain private.

## Appeals

Before launch, configure a moderation/appeals email. Appeals should include:

- Account email or handle.
- Content URL.
- Explanation.
- Any relevant ownership/license proof.

## Safety Rules

- Never reveal reporter identity.
- Do not publish counts of reports.
- Treat executable code and links as potentially hostile.
- Do not click suspicious links outside a hardened browser/profile.
