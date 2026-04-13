/**
 * Verlyn Governance Framework v2.6.4
 * Last Updated: April 2026
 * Jurisdiction: State of California, United States
 */

export const LEGAL_TEXT = {
  terms: {
    title: 'Terms of Service',
    chapters: [
      {
        title: '1. ACCEPTANCE & GOVERNANCE',
        content: `By accessing or using the Verlyn Identity Ecosystem ("Verlyn", "the Platform", "the Service"), you agree to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and Verlyn. If you do not agree to these terms, you must immediately cease all use of the Platform. Verlyn reserves the right to update these terms at any time, and continued use after such changes constitutes acceptance.`
      },
      {
        title: '2. IDENTITY & ELIGIBILITY',
        content: `You must be at least 13 years of age to establish a Verlyn Identity. You agree to provide accurate, current, and complete information during the registration process. Verlyn utilizes a proprietary "Identity Intelligence" engine to verify handle uniqueness and security reputation. You are strictly prohibited from utilizing false identities or spoofing professional affiliations. If any admin, developer, or Verlyn agent notices any suspicious, brand-confusing, or impersonating name, we reserve the right to issue a permanent ban without prior warning. Verlyn reserves the right to suspend any account that fails our reputation-based verification protocols.`
      },
      {
        title: '3. ACCOUNT SECURITY & ACCESS',
        content: `You are solely responsible for maintaining the confidentiality of your encrypted session data and account credentials. All activities performed under your Verlyn Identity are your responsibility. You agree to immediately notify Verlyn of any unauthorized use or security breach. Verlyn incorporates "Zero-Trust" architecture; however, data integrity is a shared responsibility.`
      },
      {
        title: '4. CONTENT & INTELLECTUAL PROPERTY',
        content: `You retain all ownership rights to the content you create and publish on Verlyn. However, by submitting content, you grant Verlyn a worldwide, non-exclusive, royalty-free license to host, store, replicate, and distribute your content across our decentralized professional network for the purpose of operating the service. You represent that you have all necessary rights to grant this license.`
      },
      {
        title: '5. PROHIBITED CONDUCT',
        content: `Users of Verlyn are strictly prohibited from: (a) Engaging in automated scraping or data mining of our professional directory; (b) Impersonating high-profile identities or entities; (c) Transmitting malicious code, spam, or coordinated inauthentic behavior; (d) Utilizing the Service for any unlawful purpose as defined by the jurisdiction of California; (e) Bypassing security challenges, including our Reputation Engine and hCaptcha filters.`
      },
      {
        title: '6. TERMINATION',
        content: `Verlyn may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease. All provisions of the Terms which by their nature should survive termination shall survive.`
      },
      {
        title: '7. GOVERNING LAW',
        content: `These Terms shall be governed and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.`
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    chapters: [
      {
        title: '1. DATA COLLECTION & SIGNALS',
        content: `Verlyn collects information necessary to maintain a high-signal professional environment. This includes: (a) Identifiers such as email addresses, phone numbers, and full names; (b) Metadata including IP addresses, device signatures, and behavioral interaction signals used for our Reputation Engine; (c) Interaction data within professional threads.`
      },
      {
        title: '2. BIOMETRIC & IDENTITY PULSE',
        content: `To ensure absolute identity integrity, Verlyn utilizes an "Identity Pulse"—a specialized cryptographic signature derived from your interaction patterns and verified credentials. This pulse is used to distinguish human contributors from automated bot networks. This data is processed locally on your device whenever possible and is never shared with third-party advertising partners.`
      },
      {
        title: '3. PURPOSE OF PROCESSING',
        content: `We use your information to: (a) Authenticate your professional identity; (b) Prevent fraudulent or malicious activity; (c) Enhance the performance and speed of your messaging ecosystem; (d) Provide intelligent teammate and network suggestions based on your uploaded contact hashes.`
      },
      {
        title: '4. DATA RETENTION & SECURITY',
        content: `Verlyn utilizes AES-GCM 256-bit encryption for stored credentials. We retain your personal data only for as long as is necessary for the purposes set out in this Privacy Policy. You have the right to request an export of your digital footprint or the total deletion of your Verlyn Identity at any time.`
      },
      {
        title: '5. AI & MACHINE LEARNING',
        content: `Verlyn utilizes machine learning models to detect coordinated inauthentic behavior and to optimize the delivery of trending professional signals. These models are designed to operate on anonymized metadata to preserve the privacy of individual participants.`
      }
    ]
  },
  cookies: {
    title: 'Cookies & Storage Policy',
    chapters: [
      {
        title: '1. ESSENTIAL INFRASTRUCTURE',
        content: `Verlyn utilizes "Strictly Necessary" cookies and Local Storage keys to maintain your encrypted session. Without these technical markers, the Platform cannot function or maintain your authenticated state across browser restarts.`
      },
      {
        title: '2. PERFORMANCE & PREFERENCES',
        content: `We use "Functional Cookies" to remember your professional layout, theme preferences (including custom Identity Auras), and UI state. These cookies do not track your activity on non-Verlyn domains.`
      },
      {
        title: '3. SECURITY TOKENS',
        content: `To protect the ecosystem, we utilize transient cookies that store security challenges (e.g., hCaptcha validation tokens) and reputation-based clearance indicators. These ensure that malicious actors cannot easily replicate your authenticated session.`
      }
    ]
  }
};
