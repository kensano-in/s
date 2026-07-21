/**
 * VERLYN — Legal & Compliance Framework v1.0.0
 * Comprehensive, international-grade policy text for zero-knowledge social platforms.
 * 
 * Used to populate the /agreements page and to compute the legal audit hashes.
 */

export const LEGAL_VERSION = '1.0.0';
export const LEGAL_HASH = '8f4e2c9a1d7f3e5b6c8a0d9e7f5a3c2b1d0e9f8a7c6b5a4f3e2d1c0b9a8f7e6d';

export interface LegalDoc {
  id: string;
  title: string;
  category: string;
  content: string;
}

export const LEGAL_DOCUMENTS: LegalDoc[] = [
  {
    id: 'tos',
    title: 'Platform Access Agreement',
    category: 'Access Control',
    content: `
1. PRIVATE INVITATION-ONLY TESTING PROGRAM
1.1. Access to the Verlyn Advance Access program is strictly restricted to designated invitees and early testers.
1.2. Participation in this testing program is a privilege, not a right. Any access granted is temporary, non-exclusive, revocable, and non-transferable.
1.3. Verlyn Inc. ("Verlyn") reserves the absolute right, at its sole discretion, to suspend, revoke, restrict, or permanently terminate access to the Platform, its APIs, and associated services at any time, for any reason, and without prior notice or explanation.
1.4. You acknowledge that Verlyn owes no compensation, damages, or remedies of any kind in the event that your access is suspended, restricted, or terminated.
    `.trim()
  },
  {
    id: 'privacy',
    title: 'Privacy & Encryption Notice',
    category: 'Privacy',
    content: `
2. ZERO-KNOWLEDGE ARCHITECTURE & PRIVACY POLICY
2.1. Verlyn operates on a zero-knowledge design. All message contents, media attachments, and text communications are encrypted client-side using industry-leading protocols prior to transmission.
2.2. Verlyn does not possess, store, or have any technical ability to access your private cryptographic keys. Consequently, Verlyn cannot access, view, read, or decrypt the raw contents of your private messages under any circumstances.
2.3. Users retain full ownership and control over their own content. However, to operate, protect, and secure the Platform, Verlyn processes and retains routing metadata, authentication tokens, rate-limiting logs, and technical operational parameters.
2.4. Abuse detection systems and platform security protocols operate independently of message contents wherever possible, using metadata signatures, rate indicators, and platform activity patterns.
    `.trim()
  },
  {
    id: 'community',
    title: 'Community Standards',
    category: 'Code of Conduct',
    content: `
3. PROHIBITED BEHAVIORS AND USER STANDARDS
3.1. As a condition of access, you agree to comply with Verlyn's standards of platform integrity. You are strictly prohibited from engaging in the following actions:
3.1.1. Coordinated harassment, doxxing, stalking, or threatening other users.
3.1.2. Disseminating spam, unsolicited marketing material, scams, phishing links, or financial fraud.
3.1.3. Uploading, distributing, or embedding malicious code, viruses, trojans, or exploit tools.
3.1.4. Impersonating other individuals, entities, or Verlyn representatives.
3.1.5. Utilizing automated systems, scrapers, bots, or scripts to automate abusive behavior or harvest platform data.
3.1.6. Attempting to reverse engineer, decompile, or exploit bugs in Verlyn's binary files or proprietary client code.
3.1.7. Circumventing administrative blocks, IP blocks, account suspensions, or geographic routing rules.
3.1.8. Interfering with, degrading, or disabling Platform availability (including denial-of-service attacks).
3.2. Violating any of these standards will immediately result in permanent restriction or account termination.
    `.trim()
  },
  {
    id: 'abuse',
    title: 'Zero-Tolerance Abuse Policy',
    category: 'Safety',
    content: `
4. ZERO-TOLERANCE COMPLIANCE
4.1. Verlyn maintains a strict zero-tolerance enforcement stance against severe categories of abuse. The following activities will lead to immediate, irreversible account termination, IP blocks, and direct reporting to competent law enforcement agencies:
4.1.1. The distribution, storage, or facilitation of Child Sexual Abuse Material (CSAM) or Child Sexual Exploitation and Abuse (CSAE).
4.1.2. Facilitating or promoting acts of terrorism, violent extremism, human trafficking, or slavery.
4.1.3. Coordinated financial fraud, money laundering, identity theft, or operating illegal marketplaces.
4.1.4. Distributing self-propagating malware, ransomware, phishing toolkits, or credential harvest templates.
4.2. In the event of a violation of Section 4.1, Verlyn will preserve all related session metadata and submit it to the appropriate judicial or regulatory authorities.
    `.trim()
  },
  {
    id: 'research',
    title: 'Security Research Policy',
    category: 'Security',
    content: `
5. SECURITY RESEARCH AND DISCLOSURE RULES
5.1. Verlyn welcomes responsible security research conducted in good faith. However, all research activities must adhere to the following constraints:
5.1.1. Active penetration testing, automated vulnerability scanning, and fuzzing of production APIs without written authorization are strictly prohibited.
5.1.2. Researchers shall not perform session hijacking, authentication bypass testing, or credential stuffing attacks against production instances.
5.1.3. Bypassing rate limiters, API tampering, and privilege escalation testing on live production infrastructure is prohibited.
5.2. Researchers must disclose any discovered vulnerability directly and privately to security@verlyn.in. Under no circumstances should vulnerabilities be made public prior to a patch being coordinated and deployed.
    `.trim()
  },
  {
    id: 'ip',
    title: 'Intellectual Property Protection',
    category: 'Legal',
    content: `
6. OWNERSHIP OF PLATFORM ASSETS
6.1. All rights, title, and interest in and to the Verlyn Platform, including but not limited to software binaries, client source code, backend systems, database schemas, animations, user interface designs, logo designs, trademarks, API code, and custom cryptographic libraries, are the exclusive property of Verlyn.
6.2. You are granted a limited, personal, revocable, and non-transferable license to access the Platform solely for early testing purposes.
6.3. Any unauthorized reproduction, redistribution, decompilation, modification, or commercial exploitation of any Verlyn proprietary asset is strictly prohibited and will be prosecuted to the maximum extent of the law.
    `.trim()
  },
  {
    id: 'account',
    title: 'Account Security Responsibilities',
    category: 'Security',
    content: `
7. ACCOUNT PROTECTION REQUIREMENTS
7.1. You are solely responsible for safeguarding your account access credentials, database keys, and multi-factor authentication (MFA) tokens.
7.2. You must implement robust access controls on any device used to connect to the Platform and prevent unauthorized third parties from accessing your session.
7.3. You agree to immediately report any suspected account compromise, session leakage, or unauthorized code reuse to security@verlyn.in.
7.4. Verlyn reserves the right to temporarily suspend, lock, or invalidate accounts that display signs of credential compromise or anomalous login signatures.
    `.trim()
  },
  {
    id: 'enforcement',
    title: 'Enforcement & Access Revocation',
    category: 'Access Control',
    content: `
8. PLATFORM REMEDIES AND ENFORCEMENT
8.1. To preserve the stability, security, and integrity of the Platform, Verlyn reserves the right, at its sole discretion, to execute the following enforcement actions immediately and without liability:
8.1.1. Suspending access to specific features, routes, or interfaces.
8.1.2. Freezing, suspending, or permanently deleting user accounts.
8.1.3. Invalidating or revoking outstanding invitation codes.
8.1.4. Requiring additional security validation, identity verification, or MFA enrollment.
8.2. Users whose access has been terminated are prohibited from registering new accounts or attempting to re-enter the Platform under any pseudonym.
    `.trim()
  },
  {
    id: 'processing',
    title: 'Data Processing Rules',
    category: 'Privacy',
    content: `
9. SCOPE OF TECHNICAL DATA PROCESSING
9.1. To deliver a secure, encrypted social platform, Verlyn processes technical metadata. By accepting these terms, you consent to the processing of:
9.1.1. Account credentials and hashed email signatures.
9.1.2. Technical invitation logs, activation history, and registration timestamps.
9.1.3. Cryptographic session identifiers, rotating JWT nonces, and user-agent hashes.
9.1.4. Security logs, authentication event details, network routing IP hashes, and rate-limiting indicators.
9.1.5. Anonymized crash logs and platform diagnostic telemetry.
9.2. All data collection is strictly limited to operating, securing, testing, and protecting the Platform.
    `.trim()
  },
  {
    id: 'compliance',
    title: 'Legal Compliance',
    category: 'Legal',
    content: `
10. GENERAL LEGAL COMPLIANCE
10.1. You agree to use the Platform in strict compliance with all local, state, federal, and international laws, export regulations, and sanctions regimes.
10.2. You represent and warrant that you are not located in a country subject to U.S. or international trade sanctions, and that you are not listed on any government restricted-party list.
10.3. You remain solely liable for your actions and communications while using the Platform.
    `.trim()
  },
  {
    id: 'investigation',
    title: 'Investigation Cooperation',
    category: 'Enforcement',
    content: `
11. PRESERVATION OF EVIDENCE AND AUDIT TRACES
11.1. Where legally required or requested under a valid judicial order, court summons, or criminal warrant, Verlyn will preserve and, if required, disclose relevant metadata, session history, and security logs to law enforcement agencies.
11.2. Verlyn will cooperate with official investigations regarding platform abuse, financial fraud, identity theft, or system intrusion.
    `.trim()
  },
  {
    id: 'limitations',
    title: 'Limitation of Access',
    category: 'Disclaimer',
    content: `
12. WARRANTY DISCLAIMER AND BETA STATUS
12.1. You explicitly acknowledge that the Platform is in a pre-access, experimental testing phase. Services, features, and user interfaces are provided "AS IS" and "AS AVAILABLE" without warranties of any kind.
12.2. Verlyn disclaims all warranties, express or implied, including merchantability, data integrity, and fitness for a particular purpose.
12.3. Platform features may change, databases may be reset, data structures may be altered, and testing environments may experience prolonged downtime without notice.
    `.trim()
  },
  {
    id: 'updates',
    title: 'Updates',
    category: 'Governance',
    content: `
13. REVISION AND MODIFICATION OF AGREEMENTS
13.1. Verlyn reserves the right to modify these agreements at any time.
13.2. If we make material modifications, we will update the agreement version and notify you.
13.3. You will be required to explicitly review and accept the updated legal agreements before you can continue to access the Platform.
    `.trim()
  }
];
