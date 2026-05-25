# RubberDuck Legal and Community Drafts

These drafts are operational product drafts, not legal advice. Before public launch, final wording should be reviewed against the jurisdiction and business entity that will operate RubberDuck.

## Recommended Launch Defaults

- Jurisdiction: choose the jurisdiction of the operating entity before launch. If there is no entity yet, keep this as "to be determined" in public drafts.
- Minimum age: 16+ unless counsel chooses a stricter market-specific threshold.
- Legal email: create a role inbox such as `legal@<final-domain>` before launch.
- Moderation email: create a role inbox such as `moderation@<final-domain>` before launch.
- Admin emails: keep `ADMIN_EMAILS` as a comma-separated allowlist in server-side env.

## Terms of Service Draft

Effective date: to be set before public launch.

RubberDuck is an open developer network for publishing technical posts, building courses, running learning exercises, and collaborating around software projects.

By using RubberDuck, users agree to:

- provide accurate account information and keep credentials secure;
- publish only content they have the right to share;
- avoid malware, credential theft, exploit instructions targeting real systems without defensive context, spam, harassment, impersonation, and illegal content;
- respect other users' privacy and intellectual property;
- use executable course cells for learning, demonstration, and reproducible technical work rather than abuse, evasion, or unauthorized access;
- accept that browser-side Python execution and notebook exports are educational tools and not guaranteed production runtimes;
- accept that RubberDuck may remove content, limit accounts, or preserve records when needed for safety, security, abuse investigation, legal compliance, or platform integrity.

Users retain ownership of their content. By posting content on RubberDuck, users grant RubberDuck a non-exclusive license to host, display, process, reproduce, and distribute that content as needed to operate the service.

RubberDuck may provide links, RSS content, embeds, and integrations with third-party services. RubberDuck is not responsible for third-party services, their availability, their terms, or their content.

RubberDuck is provided "as is" during MVP development. To the maximum extent allowed by applicable law, RubberDuck disclaims warranties and limits liability for indirect, incidental, consequential, special, exemplary, or punitive damages.

## Privacy Policy Draft

Effective date: to be set before public launch.

RubberDuck collects the minimum data needed to operate a developer social network and learning platform:

- account data such as name, email, avatar, provider identifiers, and session records;
- profile data such as handle, bio, location, links, stack, interests, seniority, work status, availability, privacy settings, badges, followers, and course activity;
- product content such as posts, comments, reports, courses, course sections, media metadata, notebook metadata, saves, Thanks, and progress;
- runtime telemetry for course exercises such as pass/fail status, viewed sections, and completion events;
- operational telemetry such as logs, analytics events, error data, IP-derived security signals, device/browser metadata, and abuse-prevention events.

RubberDuck uses this data to:

- authenticate users and maintain sessions;
- show profiles, feeds, courses, notifications, recommendations, and completion state;
- enforce privacy settings;
- prevent abuse and investigate reports;
- improve product quality, reliability, performance, accessibility, and security;
- comply with legal obligations.

RubberDuck does not expose downvote, dislike, rejection, or negative public counters. Reports are private moderation signals.

Users may configure profile-field visibility as public, followers-only, or private where the product exposes that setting. Some operational data must remain available to administrators for safety, security, compliance, debugging, and abuse investigation.

Third-party processors may include hosting, database, object storage, analytics, error monitoring, email, OAuth providers, and security providers. Exact processors should be listed before launch.

## Code of Conduct

RubberDuck exists for serious technical learning, collaboration, and open development.

Expected behavior:

- be precise, constructive, and technically grounded;
- help others debug and learn without humiliation;
- disclose conflicts of interest when promoting tools, courses, services, or projects;
- use tags, categories, and course metadata honestly;
- share reproducible context when asking for help;
- respect consent, privacy, attribution, and licensing.

Unacceptable behavior:

- harassment, threats, hate, or sustained personal attacks;
- doxxing or sharing private information without consent;
- spam, engagement manipulation, or deceptive promotion;
- malicious code, credential capture, phishing, exploit deployment against real targets, or evasion content without defensive educational framing;
- plagiarism or copyright abuse;
- abuse of reports, follows, comments, or course submissions;
- attempts to bypass platform safety, privacy, or rate limits.

Enforcement actions may include warnings, content removal, feature limits, temporary suspension, permanent suspension, and escalation to providers or authorities when required.

## Moderation Policy

RubberDuck moderation is designed to avoid public dogpiling. Negative public counters are intentionally excluded. Reports are private by default.

Report categories:

- spam
- malicious code
- harassment
- copyright
- other

Moderation process:

- reports are stored privately with reporter, entity type, reason, details, timestamp, and resolution status;
- moderators review context, linked content, user history, and technical risk;
- urgent safety or security issues may be acted on before contacting the affected user;
- non-urgent content disputes should prefer clarification, edit requests, attribution fixes, or scoped removal;
- enforcement should be proportional, documented, and reversible when reasonable;
- repeat abuse, evasion, or serious harm may justify account-level action.

Appeals:

- create an appeals inbox before launch;
- require users to identify the content or account action being appealed;
- preserve moderation records for auditability and abuse prevention;
- avoid discussing reporter identity or private moderation signals.

Runtime and course safety:

- browser-side exercises are sandboxed for MVP but still treated as untrusted code;
- future server/GPU runtimes must enforce isolation, quotas, timeouts, output limits, package policy, and audit logs;
- content that teaches offensive techniques must be clearly defensive, authorized, and bounded.
