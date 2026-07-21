export interface GuidelineEntry {
  id: string;
  label: string;
  category: 'General' | 'Messaging' | 'System' | 'Safety' | 'Legal';
  iconName: string;
  title: string;
  article: string;
  explanationEssay: string[];
  howItWorksDetail: string[];
  violationsList: string[];
  avoidanceDetail: string[];
}

export const GUIDELINES_DATA: GuidelineEntry[] = [
  {
    id: 'preamble',
    label: '1. Platform Preamble & Intent',
    category: 'General',
    iconName: 'Landmark',
    title: 'Platform Preamble, Mission Statement, and Core Systemic Purpose',
    article: 'Article 1.1 — Directives of Digital Governance and Trust',
    explanationEssay: [
      'Verlyn was established to engineer the next generation of social networking infrastructure, prioritizing zero-latency communications, high-fidelity real-time data streaming, and decentralization principles. We believe that secure, unmanipulated digital spaces are crucial for modern human interaction, professional collaboration, and open discourse.',
      'To protect the physical and operational integrity of this shared digital estate, we enforce a strict, objective, and non-discriminatory framework of platform governance. These rules are designed to prevent systemic manipulation, protect user assets, secure private communications, and ensure absolute compliance with international digital regulations.',
      'All users, developers, and integrated third-party systems are held to these standards. By initializing a connection to our services, you agree that your access keys are conditionally granted based on continued adherence to the directives outlined in this directory.'
    ],
    howItWorksDetail: [
      'The platform monitors system-level transactional logs, traffic volume peaks, and socket verification headers. Real-time protocol verification checks confirm that packets originating from a client session conform to standard application state machines.',
      'Our auditing engine acts at the network edge, ensuring that synthetic traffic, corrupted frame injections, or unauthorized API calls are dropped before propagating through the platform database or affecting other users.'
    ],
    violationsList: [
      'Configuring client scripts to artificially simulate user interactions or presence status.',
      'Injecting custom modifications into the web wrapper to bypass trust verification prompts.',
      'Deploying third-party wrappers designed to alter the core UI representation of security indicators.'
    ],
    avoidanceDetail: [
      'Always utilize official, unmodified web builds, desktop applications, or mobile binaries downloaded from official Verlyn distribution channels.',
      'Do not install browser extensions or third-party styles that inject scripts into the application frame.'
    ]
  },
  {
    id: 'jurisdiction',
    label: '2. Jurisdiction & Authority',
    category: 'General',
    iconName: 'Globe',
    title: 'Extraterritorial Jurisdiction, Choice of Law, and Regulatory Authority',
    article: 'Article 1.2 — Multi-Node Jurisdictional Directives',
    explanationEssay: [
      'As a distributed platform operating across global data networks, Verlyn utilizes a dynamic multi-node architecture. Server infrastructure is deployed in multiple sovereign states, each possessing distinct legal directives regarding internet safety, data privacy, and computer crimes.',
      'This article establishes that your connection is subjected to the regulatory laws of the specific legal jurisdiction hosting the database node or edge gateway receiving your websocket connection. Additionally, users agree that cross-border communications must conform to both sending and receiving regional laws.',
      'Verlyn cooperates fully with international cyber-crime agencies and regulatory bodies to enforce cross-border compliance, including response procedures under treaty frameworks and mutual legal assistance requests.'
    ],
    howItWorksDetail: [
      'Network routing protocols dynamically establish websocket connections based on the user\'s physical geolocation and network latency, assigning their session state to the compliant regional server group.',
      'Data sovereignty rules ensure that user data stays geographically ring-fenced within legally required borders, satisfying localized hosting directives (such as the EU Data Boundary and regional storage regulations).'
    ],
    violationsList: [
      'Employing routing manipulation techniques (e.g., DNS poisoning, custom proxy tunnels) to route communications to bypass regional moderation constraints.',
      'Intentionally hosting community data on specific nodes with the expressed purpose of evading localized child safety or financial crime laws.'
    ],
    avoidanceDetail: [
      'Ensure your local network settings and proxy servers comply with standard global routing tables.',
      'If managing a public community, choose regional hosting targets that align with the physical location of your user base.'
    ]
  },
  {
    id: 'account',
    label: '3. Registrant Account Integrity',
    category: 'General',
    iconName: 'Key',
    title: 'Account Authentication, Profile Validation, and Registration Integrity',
    article: 'Article 1.3 — Verification of Registrant Status',
    explanationEssay: [
      'Authentic representation is a foundational pillar of trust on Verlyn. We enforce strict policies against deceptive, automated, or duplicate registrations designed to manipulate platform metrics, abuse promotional services, or execute malicious operations under anonymous covers.',
      'Every account must correspond to a distinct, verified legal entity (an individual human or a registered corporation). The creation of multiple disposable accounts (Sybil attacks) to manipulate voting systems, flood chats, or evade restrictions is strictly prohibited.',
      'Verlyn reserves the right to run automated verification challenges or demand manual verification documents to validate account legitimacy at any time.'
    ],
    howItWorksDetail: [
      'Our registration engine tracks hardware signatures, device attributes, and network metadata upon account creation. Anomalous creation waves originating from identical subnets are queued for manual verification.',
      'Active databases maintain cryptographic verification hashes of user details, preventing duplicate accounts from using linked credentials.'
    ],
    violationsList: [
      'Creating multiple profiles using bulk email aliases to manipulate explore algorithms.',
      'Registering accounts using temporary virtual phone numbers to bypass account verification gates.',
      'Selling or leasing verified platform profiles to third parties for commercial distribution purposes.'
    ],
    avoidanceDetail: [
      'Configure and maintain one single authentic user profile on the platform.',
      'Utilize verifiable, permanent communication channels (phone and personal email) to secure your profile credentials.'
    ]
  },
  {
    id: 'minors',
    label: '4. Minor Safeguards (Age Consent)',
    category: 'General',
    iconName: 'Shield',
    title: 'Child Online Privacy Protection & Age Consent Restrictions',
    article: 'Article 1.4 — Safeguarding Minors and Age Gating Guidelines',
    explanationEssay: [
      'The protection of minors is our highest priority. Verlyn strictly prohibits the registration of individuals under the age of 13, or under the minimum age of digital consent in the user\'s sovereign region. This is in strict alignment with COPPA regulations and international child protection acts.',
      'Accounts identified as belonging to underage individuals are subject to instant termination and deletion of all associated database entries. Furthermore, we implement restricted access gates on content categories that are unsuitable for minor audiences.',
      'We require all users to cooperate with age validation procedures. Parents or legal guardians may contact our Trust and Safety team to request the removal of underage account profiles.'
    ],
    howItWorksDetail: [
      'Our registration engine implements age-gating selectors that calculate user eligibility based on birth dates. If an underage entry is attempted, the registration flow is immediately blocked and a transient device-lock is applied.',
      'Automated text analysis algorithms scan public profiles for self-disclosed age indicators that contradict registered account values.'
    ],
    violationsList: [
      'Fabricating birth years during registration to bypass age limits.',
      'Assisting minors in creating accounts without parental consent.',
      'Bypassing community-level age gates to distribute explicit content to minors.'
    ],
    avoidanceDetail: [
      'Provide your real date of birth during profile setup.',
      'If you manage a community that discusses mature subjects, enable the platform\'s age restriction gate on your community settings.'
    ]
  },
  {
    id: 'privacy',
    label: '5. Personal Data & Privacy Rules',
    category: 'General',
    iconName: 'Eye',
    title: 'Data Encapsulation, Privacy Policies, and Cryptographic Security',
    article: 'Article 1.5 — User Data Encapsulation Guidelines',
    explanationEssay: [
      'We respect the privacy of our registrants and protect user data from unauthorized access, corporate monetization, and external leakage. The database structures of Verlyn are designed to strictly isolate user messages, attachments, and settings.',
      'We do not inspect or read direct message plaintext except when a participant explicitly reports a conversation for violations of these guidelines. Automated moderation systems only analyze anonymous system metadata (frequency, payload sizes, rate limits) to detect malicious activity.',
      'Any attempt to harvest user data, monitor presence metrics outside of native features, or query user records constitutes a direct breach of privacy laws.'
    ],
    howItWorksDetail: [
      'Message payloads are securely encrypted, protecting them from interception at the network layer.',
      'Fine-grained access control lists (ACLs) prevent database reads of message records by any user who is not a verified recipient or sender of that message.'
    ],
    violationsList: [
      'Injecting modified packet readers to monitor the online presence status of users who have disabled presence sharing.',
      'Intercepting system-level APIs to scrape user names, bio descriptions, or avatar URLs.'
    ],
    avoidanceDetail: [
      'Configure your privacy preferences using the settings menu to control who can view your presence or contact you.',
      'Do not share session cookies or authentication tokens with third-party extensions.'
    ]
  },
  {
    id: 'dm_abuse',
    label: '6. Direct Messaging (DMs) Abuse',
    category: 'Messaging',
    iconName: 'MessageSquare',
    title: 'Direct Messaging Policies, Spam Prevention, and Contact Limits',
    article: 'Article 2.1 — Protection Against Messaging Exploits and Spam',
    explanationEssay: [
      'Direct messaging is a private utility intended for organic, human-to-human communication. Bulk messaging, advertising campaigns, link-bombing, and unwanted solicitation disrupt the messaging experience and represent an abuse of platform bandwidth.',
      'We define spam as sending multiple unsolicited messages, files, or links to users with whom you have no established relationship. Accounts engaging in spam are automatically restricted to prevent them from contacting new users.',
      'Furthermore, sending identical messages to multiple direct messaging threads within a short window will trigger automated rates flags, resulting in messaging locks.'
    ],
    howItWorksDetail: [
      'The message engine counts the ratio of outbound messages to unique recipients over 5, 10, and 60-minute windows. If the ratio indicates robotic copy-pasting, a messaging restriction is automatically flagged.',
      'Users who receive messages from non-contacts can mark the chat as spam, sending the recent message logs to the Trust & Safety audit system.'
    ],
    violationsList: [
      'Copy-pasting marketing pitches to 30 unique users within 10 minutes.',
      'Sending automated invitations to join external crypto investment chats to users who have not consented.',
      'Creating scripts that automatically DM welcome messages to anyone who visits your profile.'
    ],
    avoidanceDetail: [
      'Only initiate direct messages with users who expect to hear from you or have consented to contact.',
      'If you need to announce information, use public communities rather than bulk messaging individuals.'
    ]
  },
  {
    id: 'hyperlinks',
    label: '7. Hyperlink Preview Restrictions',
    category: 'Messaging',
    iconName: 'Globe',
    title: 'Dissemination of Hyperlinks, Safe Domains, and Redirect Safeguards',
    article: 'Article 2.2 — Regulation of Link Transmissions',
    explanationEssay: [
      'Sharing links is essential for online communication, but malicious links represent a severe threat to user safety. Verlyn prohibits sharing links to phishing sites, malware downloads, IP loggers, or websites that violate our safety policies.',
      'To prevent users from hiding malicious destinations, we scan shared links for redirection loops. Shortened links or proxies used to hide malicious domains are strictly barred.',
      'We maintain a global blacklist of malicious domains. Attempts to distribute blacklisted domains using character obfuscation or encoding will trigger immediate permanent account termination.'
    ],
    howItWorksDetail: [
      'When a message containing a URL is sent, our link parser evaluates the final destination domain by following redirects in a secure sandbox. The domain is cross-referenced with local and global threat intelligence feeds.',
      'Hyperlink preview generators only render metadata for verified safe domains, preventing drive-by download attempts.'
    ],
    violationsList: [
      'Sending links disguised as account verification forms (phishing).',
      'Using redirection services to bypass domain blacklists.',
      'Sharing links that automatically download files or execute scripts on click.'
    ],
    avoidanceDetail: [
      'Always share direct, full URLs so users can see the destination domain before clicking.',
      'Verify that the links you share do not lead to insecure or blacklisted domains.'
    ]
  },
  {
    id: 'rate_limits',
    label: '8. Rate Limit Standards',
    category: 'Messaging',
    iconName: 'Terminal',
    title: 'System Rate Gating, Traffic Limits, and Socket Frequencies',
    article: 'Article 2.3 — Message Rate Regulations',
    explanationEssay: [
      'Platform stability depends on predictable traffic volumes. We enforce strict limits on the speed and volume of packets a single user session can transmit. Rate limits protect our servers from Distributed Denial of Service (DDoS) attempts, database exhaustion, and chat flooding.',
      'Users who exceed rate limits will experience temporary API blocks or websocket disconnections. Persistent rate limit violations indicate automation and will result in temporary or permanent messaging restrictions.',
      'Attempting to distribute traffic across multiple IP addresses or sessions to bypass rate limits constitutes a system attack.'
    ],
    howItWorksDetail: [
      'Our rate-limiting engine uses a token bucket algorithm to track incoming requests per session. If a session sends more than 5 messages per second or 30 database queries per minute, subsequent requests are dropped with a 429 Too Many Requests status code.',
      'Repeated 429 events trigger automatic security logs that upgrade the user\'s threat classification.'
    ],
    violationsList: [
      'Flooding chat channels by programmatically sending text blocks.',
      'Executing rapid API calls to load profiles or settings in a loop.',
      'Using proxy networks to distribute a high-volume request load across multiple sessions.'
    ],
    avoidanceDetail: [
      'Allow the client application to manage message submission speeds naturally.',
      'Do not use auto-clickers, macro tools, or scripts that accelerate message transmission.'
    ]
  },
  {
    id: 'automation',
    label: '9. Automation & Synthetic Traffic',
    category: 'System',
    iconName: 'Cpu',
    title: 'System Automation Constraints & Anti-Bot Policies',
    article: 'Article 3.1 — Prohibition of Automated Interactions',
    explanationEssay: [
      'Except for verified system utility bots, Verlyn is an environment for authentic human interaction. The deployment of automated systems to create profiles, send messages, scrape data, or simulate presence is prohibited.',
      'Automation distorts platform metrics, spams users, and exhausts resources. We enforce a zero-tolerance policy against botnets, commercial automation scripts, and custom CLI tools designed to interact with our private client APIs.',
      'Verified developer accounts may request bot tokens to operate utility integrations under strict rate limits and in designated channels.'
    ],
    howItWorksDetail: [
      'Our threat detection systems analyze user session metrics, including navigation timings, keystroke dynamics, and mouse path movements. Synthetic, mathematical movement patterns trigger automatic bot detection alerts.',
      'System-level challenges (CAPTCHAs) are dynamically served to sessions showing non-human signatures.'
    ],
    violationsList: [
      'Running a script that automatically replies to messages.',
      'Creating a bot to scrape user profiles and compile them into database files.',
      'Deploying coordinate networks of bot accounts to inflate community member counts.'
    ],
    avoidanceDetail: [
      'Interact with the platform exclusively through standard mouse, keyboard, or touch inputs on official clients.',
      'Do not connect custom scripts to the platform\'s private websocket or HTTP endpoints.'
    ]
  },
  {
    id: 'emulators',
    label: '10. Headless Browser Emulation',
    category: 'System',
    iconName: 'Terminal',
    title: 'Prohibition of Headless Environments and Session Emulators',
    article: 'Article 3.2 — Web Client Environment Standards',
    explanationEssay: [
      'Verlyn requires all web-based client sessions to run in standard, interactive graphical browser environments. The use of headless browsers, automation frameworks, or browser drivers (e.g., Selenium, Puppeteer, Playwright, WebDriver) is prohibited.',
      'These tools are commonly used to scale automated abuse, scrape data, and bypass front-end security checks. Connecting to our services via a headless or automated browser is classified as system evasion and results in immediate session termination.',
      'Verified automated testing of the codebase is restricted to local development environments and is blocked on production servers.'
    ],
    howItWorksDetail: [
      'The client script executes environmental checks on load, testing for browser attributes unique to automated drivers (such as navigator.webdriver, browser dimensions, and rendering capabilities).',
      'If driver signatures are detected, the session is blocked from establishing a websocket connection.'
    ],
    violationsList: [
      'Using Puppeteer to log in to accounts and modify profile settings.',
      'Running Selenium scripts to scrape messages from community boards.',
      'Bypassing client environmental checks by patching browser driver variables.'
    ],
    avoidanceDetail: [
      'Use secure, standard consumer browsers (Chrome, Safari, Firefox, Edge) with default configurations.',
      'Ensure javascript execution is enabled and unmodified by script-injection extensions.'
    ]
  },
  {
    id: 'scraping',
    label: '11. Scraping and User Mining',
    category: 'System',
    iconName: 'HardDrive',
    title: 'Prohibition of Data Scraping, Data Harvesting, and User Directory Mining',
    article: 'Article 3.3 — Protection of Platform Directories',
    explanationEssay: [
      'The data stored on Verlyn, including user profiles, contact lists, messages, and community directory files, is protected. We prohibit data scraping, crawling, extraction, or mining of any database assets.',
      'Scraping compromises user privacy, exposes personal data to third-party databases, and causes server latency. Users are prohibited from using automated tools to index, extract, or archive platform content for external purposes.',
      'Violations of this policy will result in immediate permanent IP blocks, account termination, and legal action under database protection laws.'
    ],
    howItWorksDetail: [
      'Query volume controls and data access patterns are audited. Accounts that query multiple profiles in rapid succession without organic navigation indicators are flagged and restricted.',
      'Dynamic database throttling limits the maximum number of directory lookups a single account can execute.'
    ],
    violationsList: [
      'Using scrapers to extract email addresses and phone numbers from user bios.',
      'Compiling directory databases of communities and their member counts.',
      'Running automated queries to archive message histories for public index pages.'
    ],
    avoidanceDetail: [
      'Access profiles and community content organically through normal navigation links.',
      'Do not use database extraction tools, crawlers, or web harvesters on our domains.'
    ]
  },
  {
    id: 'sockets',
    label: '12. Network Socket Interception',
    category: 'System',
    iconName: 'Cpu',
    title: 'WebSocket Integrity & Protocol Interception Policies',
    article: 'Article 3.4 — Protection of Realtime Data Connections',
    explanationEssay: [
      'Our real-time features, including messaging and settings updates, rely on secure WebSocket channels. Intercepting, capturing, or injecting raw frames into these channels outside of our official client interface is prohibited.',
      'Manipulating socket connections allows users to bypass client checks, spoof settings, send malformed payloads, or attack other sessions. We require all socket connections to be established and managed exclusively by unmodified platform code.',
      'Attempts to connect to our websocket endpoints using custom scripts or socket clients (e.g., websockets, socket.io clients) will result in immediate session termination.'
    ],
    howItWorksDetail: [
      'Websocket handshakes require cryptographic signatures generated by the official client runtime. Connections lacking these signatures are rejected at the edge gateway.',
      'Each frame is validated against active database schemas to prevent injection of malformed data structures.'
    ],
    violationsList: [
      'Forging client settings update frames to toggle partner chat parameters directly.',
      'Using packet capture tools to intercept, decode, or replay websocket frames.',
      'Injecting raw text packets into community chat streams using a custom socket client.'
    ],
    avoidanceDetail: [
      'Allow the platform\'s official code to handle all socket communication.',
      'Do not modify connection headers, protocol configurations, or message framing.'
    ]
  },
  {
    id: 'admin_duties',
    label: '13. Community Administration Duties',
    category: 'General',
    iconName: 'Users',
    title: 'Community Administrator Responsibilities & Moderation Duties',
    article: 'Article 1.6 — Moderation Responsibilities of Administrators',
    explanationEssay: [
      'Communities represent shared public spaces. Administrators and moderators of these communities hold a positive duty to maintain a safe, lawful, and compliant environment. Failing to moderate, ignoring reports, or enabling violations is disallowed.',
      'If a community regularly hosts illegal activities, harassment campaigns, or spam coordination, and the administration team fails to intervene, the community will be disbanded and the admin accounts suspended.',
      'We require community admins to establish moderation teams, implement rules, and respond to platform-level safety notifications.'
    ],
    howItWorksDetail: [
      'A dashboard logs moderation flags and unresolved complaints for each community. Safety metrics evaluate the speed and consistency of administrator actions.',
      'High volumes of unresolved flags trigger automated reviews by platform safety officers.'
    ],
    violationsList: [
      'Refusing to delete doxxing information or harassment threads within a community after reports.',
      'Appointing known bad actors or automated accounts to moderation roles.',
      'Hosting public rooms with the express intent to coordinate raid activities on other servers.'
    ],
    avoidanceDetail: [
      'Configure auto-moderator keyword filters to handle common violations automatically.',
      'Establish clear rules, recruit a reliable moderator team, and audit moderation logs regularly.'
    ]
  },
  {
    id: 'auto_mod',
    label: '14. Auto-Moderator Rulesets',
    category: 'System',
    iconName: 'Settings',
    title: 'Automated Moderation, Keyword Filters, and Regex Enforcement',
    article: 'Article 3.5 — Automated Content Moderation Systems',
    explanationEssay: [
      'To protect users at scale, public spaces utilize automated moderation systems. These systems enforce filters, block link distributions, and flag content that violates our policies before it is displayed to the community.',
      'Attempting to bypass these filters using character substitutions, lookalike unicode characters (homoglyphs), markdown exploits, or coded language is prohibited.',
      'Consistent attempts to evade auto-moderation systems will result in account restrictions.'
    ],
    howItWorksDetail: [
      'The message engine processes public texts through regex maps and word similarity models. Messages containing blacklisted terms or obfuscation techniques are intercepted and blocked.',
      'Evasion attempts are logged, and repeated violations trigger automatic messaging locks.'
    ],
    violationsList: [
      'Using unicode characters (e.g., lookalike Cyrillic characters) to bypass spelling filters.',
      'Injecting HTML tags or hidden markdown formatting into messages to break text parsing.',
      'Using coded abbreviations to distribute coordinate attacks or spam links.'
    ],
    avoidanceDetail: [
      'Communicate clearly and respectfully in public spaces.',
      'If your message is blocked by a filter, do not attempt to bypass it; adjust your wording to comply.'
    ]
  },
  {
    id: 'raids',
    label: '15. Raid and Coordinate Attacks',
    category: 'Safety',
    iconName: 'ShieldAlert',
    title: 'Coordinated Server Raids, Flooding, and Channel Disruption',
    article: 'Article 5.1 — Prohibition of Coordinated Disruptions',
    explanationEssay: [
      'A raid is a coordinated attack where multiple accounts target a community or user to flood them with spam, harassment, or malicious content. Organizing, coordinating, or participating in raids is prohibited.',
      'Participating in a raid will result in immediate permanent account termination. Community administrators who facilitate or allow the coordination of raids within their spaces will have their communities disbanded.',
      'We implement proactive anti-raid features to protect spaces during sudden join waves.'
    ],
    howItWorksDetail: [
      'Our systems track registration dates, IP subnets, and join intervals of accounts entering a community. Sudden join spikes of unverified accounts trigger verification gates (e.g., email verification requirements, CAPTCHAs, or temporary lockouts).',
      'Accounts that send high-frequency messages immediately after joining are quarantined.'
    ],
    violationsList: [
      'Coordinating a group of users to join a competitor\'s server and flood the channels with spam.',
      'Organizing public events to mass-report a user\'s profile to trigger automated flags.',
      'Sharing invite links with the explicit intent to invite raid bots.'
    ],
    avoidanceDetail: [
      'If your community is targeted by a raid, enable verification levels in settings and contact support.',
      'Do not participate in groups or channels that organize disruptions against other servers.'
    ]
  },
  {
    id: 'file_uploads',
    label: '16. Unauthorized File Uploads',
    category: 'System',
    iconName: 'HardDrive',
    title: 'File Upload Policies, Storage Limits, and Binary Security',
    article: 'Article 3.6 — Secure Management of Media Files and Binary Uploads',
    explanationEssay: [
      'Verlyn provides file sharing capabilities to facilitate collaboration. We prohibit uploading executable scripts, malicious binaries, viruses, or illegal data chunks.',
      'To protect platform storage and database stability, all file uploads are subjected to size limits, file extension filters, and signature analysis. Sharing corrupted files or files designed to exploit client-side software is strictly banned.',
      'Violations of this policy will result in immediate file deletion and account suspension.'
    ],
    howItWorksDetail: [
      'Upload APIs verify file headers against registered MIME types to prevent extension spoofing (e.g., hiding an executable inside a PNG extension).',
      'Files are analyzed by security software upon upload, and flagged files are quarantined immediately.'
    ],
    violationsList: [
      'Renaming malware executables to PDF extensions and sharing them in chat.',
      'Uploading media files configured to exploit buffer overflows in rendering libraries.',
      'Distributing files containing malicious script payloads.'
    ],
    avoidanceDetail: [
      'Only share standard, safe file formats (PDFs, images, verified audio and video files).',
      'Verify that files you upload are scanned for malware and do not contain executable code.'
    ]
  },
  {
    id: 'threats',
    label: '17. Threatening Communications',
    category: 'Safety',
    iconName: 'Heart',
    title: 'Prohibition of Direct Threats & Acts of Intimidation',
    article: 'Article 4.1 — Intimidation and Extortion Policies',
    explanationEssay: [
      'Verlyn is an environment for safe communication. We prohibit sending explicit or implicit threats of physical harm, death, financial damage, or legal compromise to individuals or groups.',
      'Threats are taken seriously, and validated threats of physical violence will result in permanent account termination and referral to law enforcement.',
      'We do not tolerate threats of swatting, doxxing, or physical confrontation.'
    ],
    howItWorksDetail: [
      'Messages flagged for threats are routed to our Trust & Safety team. Incident logs are preserved to support legal investigations.',
      'Our systems detect threat-related indicators and escalate reported conversations immediately.'
    ],
    violationsList: [
      'Threatening to dispatch physical actors to a user\'s residence.',
      'Threatening to report a user to government agencies using fabricated evidence.',
      'Stating intent to launch cyber-attacks against a user\'s personal network.'
    ],
    avoidanceDetail: [
      'If a conversation becomes hostile, use the block button and exit the discussion.',
      'Do not engage in retaliatory threats; let our team handle reports.'
    ]
  },
  {
    id: 'harassment',
    label: '18. Target Harassment & Abuse',
    category: 'Safety',
    iconName: 'ShieldAlert',
    title: 'Anti-Harassment Regulations & Targeted Abuse Policies',
    article: 'Article 4.2 — Protection Against Targeted Harassment',
    explanationEssay: [
      'Harassment occurs when a user targets an individual with persistent, unwanted communications designed to abuse, mock, or intimidate them. We prohibit targeted harassment across all communication channels.',
      'This includes sending unsolicited direct messages, creation of dedicated groups to mock an individual, or contacting a user on secondary profiles after they have blocked you.',
      'We prioritize user control; ignoring block actions is a direct violation.'
    ],
    howItWorksDetail: [
      'Block indicators prevent blocked users from initiating contact or viewing updates. Attempts to circumvent these blocks (e.g., creating new threads) are tracked and flagged.',
      'Reports from blocked users are escalated for review.'
    ],
    violationsList: [
      'Creating multiple dummy accounts to contact a user who has blocked your primary profile.',
      'Coordinating a group of users to follow a user across public channels to mock them.',
      'Sending unwanted messages containing personal insults.'
    ],
    avoidanceDetail: [
      'Respect other users\' boundaries. If someone blocks you or asks you to stop contacting them, cease all contact immediately.',
      'Use the platform\'s privacy tools to limit who can contact you.'
    ]
  },
  {
    id: 'hate_speech',
    label: '19. Hate Speech Restrictions',
    category: 'Safety',
    iconName: 'Scale',
    title: 'Prohibition of Hate Speech, Discrimination, and Dehumanization',
    article: 'Article 4.3 — Standards of Non-Discriminatory Dialogue',
    explanationEssay: [
      'Hate speech attacks, demeans, or dehumanizes individuals based on protected characteristics: race, ethnicity, national origin, religion, gender, sexual orientation, disability, or serious medical conditions.',
      'Verlyn prohibits the dissemination of hate speech in public spaces. We do not tolerate the distribution of hate symbols, support for white supremacist ideologies, or dehumanizing generalizations.',
      'We protect the rights of all users to participate in our communities without fear of targeted discrimination.'
    ],
    howItWorksDetail: [
      'Content filters check public channels for hate symbols and slur registries. Flagged items are blocked from display.',
      'Our teams evaluate the context of reported language to distinguish between discussion and targeted slurs.'
    ],
    violationsList: [
      'Posting discriminatory slurs in public community chat boards.',
      'Sharing symbols associated with historical hate groups.',
      'Stating that a specific ethnic group is subhuman or should be excluded from public life.'
    ],
    avoidanceDetail: [
      'Focus discussions on ideas, activities, and interests rather than personal identity attributes.',
      'Ensure your community guidelines reject discriminatory language.'
    ]
  },
  {
    id: 'extremism',
    label: '20. Extremist Content Policies',
    category: 'Safety',
    iconName: 'Landmark',
    title: 'Prohibition of Violent Extremism, Terrorism, and Militant Coordination',
    article: 'Article 4.4 — Extremist Content Restrictions',
    explanationEssay: [
      'The coordination or promotion of violent extremism and terrorism is prohibited on Verlyn. We do not tolerate groups that advocate, fund, or coordinate violent activities to achieve ideological goals.',
      'Accounts that post terrorist manifestos, share violent propaganda, or recruit members for militant groups will be permanently banned and reported to global counter-terrorism agencies.',
      'We maintain active partnerships with security databases to identify and remove known extremist assets.'
    ],
    howItWorksDetail: [
      'File fingerprinting checks uploaded media against databases of known terrorist propaganda.',
      'Metadata tracking flags accounts showing pattern linkages to coordinated extremist networks.'
    ],
    violationsList: [
      'Posting recruitment links for militant groups.',
      'Sharing instructional videos on how to carry out terrorist operations.',
      'Praising the actions of mass murderers or violent extremists.'
    ],
    avoidanceDetail: [
      'Keep communities focused on standard hobbies, gaming, education, and civilian topics.',
      'Do not share content originated by designated extremist organizations.'
    ]
  },
  {
    id: 'impersonation',
    label: '21. Impersonation of Legal Entities',
    category: 'General',
    iconName: 'Landmark',
    title: 'Identity Verification, Impersonation Rules, and Authenticity',
    article: 'Article 1.7 — Impersonation Policies',
    explanationEssay: [
      'To maintain trust, users must not deceive others regarding their real identity. We prohibit impersonating other individuals, registered brands, or platform administrators.',
      'Impersonation undermines user safety and is often used to execute scams or distribute false information. Accounts created to deceive users by copying avatars, usernames, and writing styles will be suspended.',
      'Parody accounts must clearly declare their parody status in their profile bio.'
    ],
    howItWorksDetail: [
      'Official profiles (system agents, verified businesses) receive verification badges. Automated systems monitor profile changes on high-reach accounts for deceptive mimicry.',
      'Impersonation reports trigger visual comparisons of registration histories.'
    ],
    violationsList: [
      'Creating an account copy to trick a user\'s contacts into sending funds.',
      'Using a company logo and name to pretend to be an official customer support representative.',
      'Setting your profile name to match a prominent user to post deceptive messages in their name.'
    ],
    avoidanceDetail: [
      'Choose unique handles and display names.',
      'If operating a fan or parody community, explicitly state that in your profile bio and header.'
    ]
  },
  {
    id: 'crypto_scams',
    label: '22. Fraudulent Crypto Schemes',
    category: 'Safety',
    iconName: 'AlertTriangle',
    title: 'Prohibition of Financial Scams, Crypto Frauds, and Pumping Groups',
    article: 'Article 4.5 — Financial Integrity Regulations',
    explanationEssay: [
      'Financial scams, deceptive investment offerings, and crypto frauds undermine user security. We prohibit promoting fraudulent token drops, pump-and-dump groups, or deceptive smart contract links.',
      'Users must not invite others to private groups dedicated to financial speculation, nor send links promising unrealistic investment returns. Verlyn is not a licensed financial portal and prohibits unlicensed financial solicitation.',
      'Confirmed financial scams result in immediate, permanent account termination.'
    ],
    howItWorksDetail: [
      'Spam filters monitor direct messages for typical scam vocabulary, including high-yield investment terms, wallet link patterns, and repetitive promotional structures.',
      'Identified scam links are blacklisted at the network gateway.'
    ],
    violationsList: [
      'Spamming DMs with links to fake cryptocurrency giveaways.',
      'Creating groups to coordinate artificial inflation of digital tokens.',
      'Sharing smart contracts designed to drain users\' digital wallets.'
    ],
    avoidanceDetail: [
      'Do not utilize messaging channels to promote financial offerings or solicit investments.',
      'Report any accounts that offer quick financial returns.'
    ]
  },
  {
    id: 'copyright',
    label: '23. Copyright Infringement (DMCA)',
    category: 'Legal',
    iconName: 'FileText',
    title: 'Intellectual Property Protection & DMCA Compliance',
    article: 'Article 5.1 — Intellectual Property Standards',
    explanationEssay: [
      'Verlyn respects intellectual property rights. We prohibit uploading or sharing content that infringes on third-party copyrights, including pirated software, copyrighted media files, or unlicensed proprietary texts.',
      'We comply with the Digital Millennium Copyright Act (DMCA) and international copyright directives. Upon receiving a valid takedown notice, we will remove the infringing material and notify the user who posted it.',
      'Repeat infringers will face permanent account suspension.'
    ],
    howItWorksDetail: [
      'Our legal portal processes DMCA notices filed by rightsholders. When a valid request is confirmed, the file access keys are revoked in our database.',
      'The system tracks copyright strikes assigned to accounts.'
    ],
    violationsList: [
      'Sharing download links to pirated films or cracked software keys.',
      'Uploading full albums of copyrighted music to public channels.',
      'Hosting public communities dedicated to distributing paid digital assets for free.'
    ],
    avoidanceDetail: [
      'Only upload file assets that you have created yourself or hold explicit licenses to distribute.',
      'If you receive a copyright warning, remove the flagged files immediately.'
    ]
  },
  {
    id: 'trademarks',
    label: '24. Intellectual Property Trademarks',
    category: 'Legal',
    iconName: 'Scale',
    title: 'Trademark Integrity & Brand Rights Safeguards',
    article: 'Article 5.2 — Brand Name Protections',
    explanationEssay: [
      'Trademark infringement occurs when a user utilizes a registered trademark or brand name in a way that causes confusion regarding the origin of a product or service.',
      'Verlyn prohibits using brand names, logos, or slogans in community titles, domain hooks, or usernames to mislead other users. We protect the rights of legitimate brand owners to operate their official spaces without dilution.',
      'Trademark complaints are reviewed by our legal team.'
    ],
    howItWorksDetail: [
      'Brand registration checks compare community claims against commercial registries. Verified businesses receive exclusive access to their trademarked handles.',
      'Verified trademark owners can submit disputes through our legal desk.'
    ],
    violationsList: [
      'Creating a public chat room named after a brand to sell counterfeit goods.',
      'Registering a handle matching a corporate trademark to solicit business under their brand.',
      'Using a brand\'s official graphics as a community icon without authorization.'
    ],
    avoidanceDetail: [
      'Name your communities to clearly indicate their unofficial, community-run nature.',
      'Choose usernames that represent your individual identity.'
    ]
  },
  {
    id: 'doxxing',
    label: '25. Personal Identifying Data Doxxing',
    category: 'Safety',
    iconName: 'Lock',
    title: 'Prohibition of Doxxing and Exposure of Private Information',
    article: 'Article 4.6 — Public Exposure of PII',
    explanationEssay: [
      'Doxxing is the public dissemination of an individual\'s private, identifying information (PII) without their consent. This represents a severe safety violation and is prohibited on Verlyn.',
      'PII includes real names, residential addresses, private contact numbers, email addresses, social security numbers, banking details, or workplace coordinates. Exposing this data puts users at risk of offline harassment and identity theft.',
      'Doxxing violations result in immediate permanent account termination.'
    ],
    howItWorksDetail: [
      'Regex patterns check message updates for common personal data configurations, including phone numbers, postal codes, and coordinate coordinates.',
      'Flagged messages are hidden pending human review.'
    ],
    violationsList: [
      'Posting a user\'s private cell phone number in a public channel to encourage spam calls.',
      'Sharing screenshots of a user\'s legal identification document.',
      'Publishing a partner\'s workplace address to target them.'
    ],
    avoidanceDetail: [
      'Never share another user\'s private details in messaging, regardless of the context.',
      'If you discover your private data has been leaked, report the messages immediately.'
    ]
  },
  {
    id: 'blackmail',
    label: '26. Blackmail and Extortion',
    category: 'Safety',
    iconName: 'HardDrive',
    title: 'Prohibition of Extortion, Blackmail, and Coercive Demands',
    article: 'Article 4.7 — Coercion Restrictions',
    explanationEssay: [
      'Extortion and blackmail involve demanding financial assets, digital coins, files, or specific actions by threatening to expose private information, leak media, or cause legal harm.',
      'This behavior is illegal and violates our core values. We do not tolerate any extortion attempts, including cyber-sextortion. Verified extortion leads to immediate permanent account ban and referral to legal authorities.',
      'We cooperate with law enforcement requests to support extortion investigations.'
    ],
    howItWorksDetail: [
      'Chat logs flagged for extortion are reviewed by safety officers. Account sessions, IP footprints, and database histories are preserved for compliance.',
      'Our systems monitor for blackmail-related indicators to escalate reports.'
    ],
    violationsList: [
      'Threatening to leak private chat logs unless the user pays a ransom.',
      'Threatening to compromise a user\'s account unless they send files.',
      'Demanding digital assets to prevent the publication of embarrassing media.'
    ],
    avoidanceDetail: [
      'If you are targeted by an extortion attempt, do not comply; block the user and report the chat immediately.',
      'Do not engage in discussions that demand assets or actions under threat.'
    ]
  },
  {
    id: 'self_harm',
    label: '27. Self-Harm & Suicide Directives',
    category: 'Safety',
    iconName: 'Heart',
    title: 'Self-Harm Intervention & Prevention Policies',
    article: 'Article 4.8 — Prevention of Self-Harm',
    explanationEssay: [
      'Verlyn is committed to the safety of our users. We prohibit the dissemination of content that advocates, depicts, encourages, or instructs users on self-harm or suicide.',
      'We want our platform to be a place of support. When self-harm content is identified, we remove it and provide resources to help the user connect with professional support services.',
      'Encouraging others to self-harm will result in permanent account suspension.'
    ],
    howItWorksDetail: [
      'Keyword detection lists identify search queries and messages related to self-harm. The system intercepts these and presents contact details for support hotlines.',
      'Safety teams review reported self-harm content immediately.'
    ],
    violationsList: [
      'Sharing instructional text on how to cut or injure yourself.',
      'Encouraging a user in distress to commit suicide.',
      'Posting images depicting acts of self-harm.'
    ],
    avoidanceDetail: [
      'If you are experiencing distress, reach out to professional support hotlines.',
      'Report any content where a user indicates intent to self-harm so we can connect them with resources.'
    ]
  },
  {
    id: 'black_markets',
    label: '28. Illegal Commerce & Black Markets',
    category: 'Legal',
    iconName: 'Landmark',
    title: 'Prohibited Commerce & Illegal Trade Regulations',
    article: 'Article 5.3 — Commercial Trade Restrictions',
    explanationEssay: [
      'Verlyn is not a marketplace for unregulated or illegal goods. We prohibit using our messaging services to sell, trade, or distribute illegal drugs, firearms, stolen credentials, counterfeit currency, or regulated substances.',
      'Using direct messages or public communities to conduct unauthorized commercial transactions violates our terms. Violations will result in the removal of the community and suspension of the seller\'s account.',
      'We cooperate with commerce enforcement agencies.'
    ],
    howItWorksDetail: [
      'Transactional audit logs scan public spaces for payment details, illicit product keywords, and transaction triggers.',
      'Suspicious merchant accounts are flagged for compliance reviews.'
    ],
    violationsList: [
      'Selling unlicensed prescription medications inside direct messages.',
      'Trading credit card details or cracked accounts in public groups.',
      'Facilitating the sale of unregistered firearms.'
    ],
    avoidanceDetail: [
      'Only use verified, third-party marketplaces for purchasing goods.',
      'Do not post advertisements for regulated substances or services.'
    ]
  },
  {
    id: 'reverse_eng',
    label: '29. Reverse Engineering Boundaries',
    category: 'Legal',
    iconName: 'Terminal',
    title: 'Proprietary Source Protections & Reverse Engineering Policy',
    article: 'Article 5.4 — Code Integrity Rules',
    explanationEssay: [
      'The code, database structures, and APIs of Verlyn represent proprietary intellectual property. We prohibit reverse engineering, decompiling, or extracting our software binaries, websocket channels, or database wrappers.',
      'Attempting to duplicate proprietary code or bypass security checks compromises platform integrity. Users must not modify client-side files or deploy custom clients designed to bypass our platform policies.',
      'Violations of this policy will result in legal action.'
    ],
    howItWorksDetail: [
      'Dynamic code obfuscation techniques protect javascript execution paths. Structural checks detect modified client modules.',
      'Websocket frames verify the integrity of the client runtime.'
    ],
    violationsList: [
      'Extracting proprietary CSS styles from client modules to build third-party clones.',
      'Decompiling mobile binaries to duplicate application protocols.',
      'Modifying client files to disable the display of security warnings.'
    ],
    avoidanceDetail: [
      'Use only our official, unmodified applications.',
      'Do not inspect or extract compiled client code.'
    ]
  },
  {
    id: 'strikes',
    label: '30. Strike Mechanisms & Warn System',
    category: 'Legal',
    iconName: 'Scale',
    title: 'Platform Strike Systems & Warning Thresholds',
    article: 'Article 6.1 — Graduated Enforcement Metrics',
    explanationEssay: [
      'To enforce our guidelines objectively, we operate a structured warning strike system. Verified violations of these guidelines assign strikes to the user\'s account based on the severity of the offense.',
      'Accumulating strikes within a 60-day window increases the duration of messaging restrictions and can lead to permanent account suspension. This system provides a transparent path for users to correct their behavior.',
      'Warnings detail the specific article violated and the strike value assigned.'
    ],
    howItWorksDetail: [
      'Our databases log verified violations. Strike counts are updated, and temporary restrictions are applied automatically based on active strike thresholds.',
      'Users can view their strike history in the settings menu.'
    ],
    violationsList: [
      'Receiving multiple warnings for spamming within a short period.',
      'Accumulating 3 strikes within a 60-day window, triggering suspension.',
      'Failing to resolve warnings before continuing prohibited behaviors.'
    ],
    avoidanceDetail: [
      'Review warnings carefully to understand what policy was violated.',
      'Correct your behavior to prevent further strikes.'
    ]
  },
  {
    id: 'locks',
    label: '31. Temporary Message Locks',
    category: 'Legal',
    iconName: 'Ban',
    title: 'Temporary Suspension Protocols & Message Locks',
    article: 'Article 6.2 — Temporary Restrictive Measures',
    explanationEssay: [
      'Temporary messaging locks are applied to accounts that violate our guidelines. A message lock prevents the account from sending messages in DMs, group chats, and public communities.',
      'Message locks are designed to halt spam and harassment immediately while the account is reviewed. The duration of the lock depends on the strike tier and ranges from 24 hours to 30 days.',
      'Attempting to bypass a message lock using secondary accounts is prohibited.'
    ],
    howItWorksDetail: [
      'The message transmission pipeline checks the account\'s lock status. If a lock is active, the database rejects the write call and returning a restriction status.',
      'The client interface displays a warning banner and disables input.'
    ],
    violationsList: [
      'Attempting to send messages while a temporary lock is active.',
      'Creating new accounts to bypass a message lock.',
      'Modifying the web app state to bypass input restrictions.'
    ],
    avoidanceDetail: [
      'Wait for the temporary lock to expire naturally.',
      'Ensure you comply with all guidelines once messaging capabilities are restored.'
    ]
  },
  {
    id: 'manual_review',
    label: '32. Manual Verification Reviews',
    category: 'Legal',
    iconName: 'Eye',
    title: 'Manual Compliance Audits & Account Quarantines',
    article: 'Article 6.3 — Manual Safety Audits',
    explanationEssay: [
      'Accounts suspected of automated activity, identity fraud, or severe policy violations are quarantined and flagged for manual review by our compliance team.',
      'During a manual review, login capabilities are paused. The account holder must complete verification tasks to confirm their identity and compliance with our terms.',
      'We aim to process manual reviews within 72 hours, but complex investigations may take longer.'
    ],
    howItWorksDetail: [
      'Quarantine states route all login attempts to a verification landing page, blocking access to main platform features.',
      'Compliance officers audit session histories, reported logs, and verification documents.'
    ],
    violationsList: [
      'Failing to complete automated verification challenges.',
      'Providing false information during a manual compliance audit.',
      'Evading a quarantine state using session replication.'
    ],
    avoidanceDetail: [
      'Provide accurate information when completing verification tasks.',
      'Cooperate with compliance team requests during an audit.'
    ]
  },
  {
    id: 'appeals',
    label: '33. Appeals & Arbitration Terms',
    category: 'Legal',
    iconName: 'Scale',
    title: 'Appeal Procedures, Dispute Resolutions, and Arbitration',
    article: 'Article 6.4 — Dispute Resolution and Appeal Guidelines',
    explanationEssay: [
      'Users have the right to appeal enforcement actions. Appeals must be filed through the settings menu and contain factual information detailing why the restriction was incorrect.',
      'Our safety officers review the logged session metrics to evaluate the appeal. Filing multiple identical, deceptive, or spam-like appeals is prohibited and will double the duration of the current restriction.',
      'Arbitration clauses govern disputes arising from suspensions.'
    ],
    howItWorksDetail: [
      'The appeals queue routes submissions to safety officers who did not issue the initial penalty. The officer reviews the case data and logs to make an independent decision.',
      'Decisions are updated in the account database and notified to the user.'
    ],
    violationsList: [
      'Submitting repeated, identical appeal tickets within a 24-hour period.',
      'Using abusive language in appeal descriptions.',
      'Filing appeals for clear violations using fabricated screenshots.'
    ],
    avoidanceDetail: [
      'Submit a single, clear appeal details the facts of your case.',
      'Wait for the safety officer to review and update the appeal status.'
    ]
  },
  {
    id: 'liability',
    label: '34. Liability & Indemnification Limits',
    category: 'Legal',
    iconName: 'Landmark',
    title: 'Platform Liability Limitations & Indemnity Agreements',
    article: 'Article 6.5 — Limitation of Liability Clauses',
    explanationEssay: [
      'Verlyn operates as a communication utility. We do not assume civil or criminal liability for the actions, messages, or content shared by users across our networks.',
      'Users agree to indemnify and hold Verlyn harmless from any claims, losses, or damages arising from their use of the services or violations of these guidelines.',
      'We do not guarantee uninterrupted service access and reserve the right to modify features at any time.'
    ],
    howItWorksDetail: [
      'Indemnity agreements are evaluated legally during registration and serve to insulate core system databases from third-party actions.',
      'Service limits are documented to protect the platform from liability.'
    ],
    violationsList: [
      'Filing civil claims against Verlyn for loss of access during suspensions.',
      'Demanding platform compensation for transactions conducted between users.',
      'Claiming damages for data deleted due to inactivity or violations.'
    ],
    avoidanceDetail: [
      'Review the terms of service regularly to understand liability limits.',
      'Conduct commercial transactions through secure, external payment portals.'
    ]
  },
  {
    id: 'dsa_compliance',
    label: '35. Digital Services Act (DSA) Compliance',
    category: 'Legal',
    iconName: 'Compass',
    title: 'Digital Services Act (DSA) Compliance & Transparency Guidelines',
    article: 'Article 6.6 — Regulatory Reporting & Compliance Operations',
    explanationEssay: [
      'Verlyn complies with the European Union Digital Services Act (DSA). We maintain transparent content reporting channels, detailed moderation registries, and publish regular transparency reports.',
      'Users inside the EU have access to specific DSA complaint systems and dispute resolution bodies. We are committed to cooperate with regulatory coordinators to handle illegal content issues.',
      'Moderator decisions are documented to ensure accountability.'
    ],
    howItWorksDetail: [
      'DSA portals process regulatory complaints and document moderator decisions.',
      'Compliance logs are maintained to support audits by regulatory bodies.'
    ],
    violationsList: [
      'Filing mass false complaints under the DSA to target a user.',
      'Attempting to manipulate compliance metrics.',
      'Refusing to cooperate with regulatory requests.'
    ],
    avoidanceDetail: [
      'Utilize official DSA channels for filing regulatory complaints.',
      'Provide clear, factual information when submitting a report.'
    ]
  }
];
