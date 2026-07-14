export interface DocSection {
  title: string;
  content: string | string[];
}

export interface AppInfoDoc {
  id: string;
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  sections: DocSection[];
  meta?: Record<string, string | Record<string, string>[]>;
}

export const APP_INFO_DOCS: Record<string, AppInfoDoc> = {
  about: {
    id: 'about',
    title: 'About MS Family',
    subtitle: 'Your Family. Organized. Connected. Secure.',
    lastUpdated: 'July 13, 2026',
    sections: [
      {
        title: '1. Mission & Vision',
        content: 'MS Family is built with a singular vision: to empower modern families with a secure, private, and collaborative ecosystem to manage their daily life. We bring financial organization, family safety, document storage, and shared reminders into one unified application. Unlike standard trackers that monetize user data, MS Family is built on a foundation of absolute data privacy and transparency.'
      },
      {
        title: '2. Smart SMS Expense Reader',
        content: [
          'Our signature financial module features a local Smart SMS Reader. When you receive a transaction message from your bank, credit card, or payment gateway (like UPI, GPay, or NetBanking), MS Family parses it locally on your device.',
          '• Local Processing: The parsing engine runs offline using regex models. Your raw SMS messages are never uploaded to any cloud server.',
          '• Smart Drafts: Automatically generates transaction drafts (category, merchant, amount, type) and prompts you for verification.',
          '• Multi-currency support: Handles regional transaction formats to maintain absolute expense booking accuracy.'
        ]
      },
      {
        title: '3. Collaborative Family Groups',
        content: [
          'Connect your household with secure, cloud-synchronized Family Groups. Join or create groups using invitation codes.',
          '• Shared Bookkeeping: Track joint accounts, calculate balances, and track who owes whom in real-time.',
          '• Role Management: Group Admins can add or remove members, control document visibility, and lock financial categories.',
          '• Live Tracking & Safety: Check real-time location logs of children or elderly members. Supports geo-boundary alerts.'
        ]
      },
      {
        title: '4. Encrypted Document Vault (My Proofs)',
        content: [
          'Never lose an invoice, receipt, warranty card, or identity document. The My Proofs vault provides a secure backup solution.',
          '• High-Level Security: Files uploaded are encrypted at rest using private cloud storage buckets.',
          '• Authorization Gates: Only family members explicitly authorized by the file owner can decrypt and view documents.',
          '• Fast Retrieval: Filter proofs by category, date, amount, or family member.'
        ]
      },
      {
        title: '5. Savings Goals & Metal Price Monitors',
        content: [
          'Plan for the future with target-based Savings Goals. Incorporate tangible assets with our live metal price tracking.',
          '• Live Rates: Live price monitors for 24K/22K Gold and Fine Silver, automatically updated via market feeds.',
          '• Goal Tracking: Calculate interest, monthly deposits required, and progress bars towards your house, education, or vehicle goals.'
        ]
      },
      {
        title: '6. Developer & Corporate Profile',
        content: 'MS Family is designed, developed, and maintained by MS Technologies. We build utility solutions for families and small business households. We operate with a strict no-ads, subscription-only revenue model to ensure user interests are always aligned with product developments.'
      }
    ],
    meta: {
      developer: 'MS Technologies',
      website: 'https://msarul.xo.je',
      supportEmail: 'velgo7686@gmail.com',
      version: '1.0.0',
      buildNumber: '100',
      copyright: '© 2026 MS Technologies. All rights reserved.',
      socialLinks: [
        { name: 'GitHub', url: 'https://github.com/mstechnologies' },
        { name: 'Twitter', url: 'https://twitter.com/mstechnologies' },
        { name: 'LinkedIn', url: 'https://linkedin.com/company/mstechnologies' }
      ] as any
    }
  },

  legal: {
    id: 'legal',
    title: 'Legal Information',
    subtitle: 'Legal Framework, Compliance & Liability Rules',
    lastUpdated: 'July 13, 2026',
    sections: [
      {
        title: '1. Ownership and Intellectual Property',
        content: 'The MS Family application, including all source code, UX designs, visual assets, layouts, graphics, database queries, SMS parsing patterns, and backend orchestrators, is the exclusive intellectual property of MS Technologies. Copying, reverse-engineering, modifying, or distributing any code or asset without explicit written consent is strictly prohibited under federal and international copyright laws.'
      },
      {
        title: '2. Device Permissions and Data Sharing Consent',
        content: 'By activating features such as Geolocation Sharing, Push Notifications, or the Smart SMS Reader, you explicitly authorize MS Family to request and access the necessary device system APIs. You maintain the right to revoke these permissions at any time via system settings, though doing so will disable the respective functionalities.'
      },
      {
        title: '3. Financial Disclaimer',
        content: 'The financial tools, automated SMS expense draft generators, budget calculators, gold/silver price monitors, and interest calculators provided within the application are intended solely for personal information and organizational purposes. MS Technologies does not guarantee absolute mathematical accuracy for tax or official reporting. Users are advised to review and verify all transaction entries manually.'
      },
      {
        title: '4. Location Tracking Responsibility & Safety Usage',
        content: 'Live location sharing is designed as a safety tool for family members. You agree not to use location tracking for illegal surveillance or stalkerware-like activities. You must obtain consent from adult family members before enabling live background tracking on their devices.'
      },
      {
        title: '5. Limitation of Liability',
        content: 'To the maximum extent permitted by law, MS Technologies, its directors, developers, and partners shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from database service interruptions, location update lags, files deleted from the proofs locker, or discrepancies in parsed SMS transactions.'
      },
      {
        title: '6. Service Availability & Maintenance Windows',
        content: 'We strive for a 99.9% uptime for cloud synchronization. However, maintenance windows, database upgrades, and network outages may occasionally restrict access to the app. Offline database caching guarantees that your data can still be viewed and logged locally on your device during outages.'
      }
    ]
  },

  terms: {
    id: 'terms',
    title: 'Terms of Service',
    subtitle: 'Contractual Agreement for MS Family',
    lastUpdated: 'July 13, 2026',
    sections: [
      {
        title: '1. Acceptance of Contract',
        content: 'By creating an account, registering your family group, uploading documents, or utilizing the location services, you agree to be bound by these Terms of Service. If you do not accept these terms, you must delete your account and cease using the application immediately.'
      },
      {
        title: '2. User Eligibility & Account Registration',
        content: 'You must be at least 13 years of age to register for MS Family. If you add family members who are minors to a family group, you confirm that you are their parent, legal guardian, or have explicit consent from their parent or guardian to share their location coordinates and expense metrics.'
      },
      {
        title: '3. Family Group Codes & Admin Authority',
        content: 'Family group invite codes grant full access to that family\'s expense logs, location updates, and authorized shared documents. You are solely responsible for securing this code. Group Admins have the authority to manage memberships, view transaction summaries, and request data exports.'
      },
      {
        title: '4. SMS Processing & Local Logging Rules',
        content: 'If you enable the Smart SMS Reader, you grant the app permission to read transaction SMS messages. You acknowledge that raw SMS texts are read and parsed on-device. Only transaction logs that you verify are synced to the cloud. You must ensure you comply with local regulations concerning banking SMS notifications.'
      },
      {
        title: '5. Subscription Billing, Renewal, and Cancellations',
        content: 'Premium features require a recurring monthly or yearly subscription. Subscriptions are billed through Google Play Billing or Stripe. Payments are charged in advance and auto-renew unless you cancel your subscription at least 24 hours before the current billing period expires.'
      },
      {
        title: '6. Prohibited Content and Abuse of Vault',
        content: 'You agree not to upload any files to the "My Proofs" document vault that contain malware, spyware, copyrighted media, or illegal materials. MS Technologies reserves the right to suspend accounts immediately if a security risk or violation of these rules is detected.'
      },
      {
        title: '7. Revisions to the Terms',
        content: 'We may modify these terms at any time. Continued use of the platform after updates have been published signifies your consent to the modified terms. Critical revisions will be announced via in-app banner alerts.'
      }
    ]
  },

  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'Data Collection, Storage & Encryption Guidelines',
    lastUpdated: 'July 13, 2026',
    sections: [
      {
        title: '1. Privacy Guarantee',
        content: 'At MS Family, we believe your personal information belongs to you. We do not sell, rent, or trade your location coordinates, bank details, transaction logs, or upload documents to third-party advertising companies. Your data is strictly locked within your designated Family Group.'
      },
      {
        title: '2. Geolocation Processing',
        content: [
          'When live tracking is active, the app collects latitude and longitude coordinates. This happens in the background to ensure safety tracking when the app is minimized.',
          '• Active Logging: Coordinates are shared only with members of your family group.',
          '• Purge Policy: Geolocation coordinates older than 24 hours are permanently purged from active databases.'
        ]
      },
      {
        title: '3. Local SMS Reader Isolation',
        content: [
          'The Smart SMS Reader parses text alerts on your device using a local interpreter. The raw text of your banking SMS notifications is never transmitted to our backend.',
          '• Synced Logs: Only the finalized, user-approved transactions (Category, Merchant, Amount, Date) are uploaded and synced to your cloud database.'
        ]
      },
      {
        title: '4. Document Vault Encryption',
        content: [
          'All files (JPEG, PNG, PDF) uploaded to the "My Proofs" locker are encrypted at rest using AES-256 standard encryption keys before being saved to storage buckets.',
          '• Access Control: Row-Level Security (RLS) policies prevent unauthorized access, ensuring only family group members with explicit sharing permissions can retrieve files.'
        ]
      },
      {
        title: '5. Device Security & Biometrics',
        content: [
          'If you enable App Lock in settings, authentication is handled via the device\'s native BiometricPrompt API (Fingerprint / Face ID) or PIN screen.',
          '• Local Keystore: Biometric credentials are processed entirely on-device by your OS. MS Family never collects, stores, or transmits your fingerprint or facial templates.'
        ]
      },
      {
        title: '6. Account Erasure and Export rights',
        content: 'You can request a full JSON export of your family budget history or trigger immediate account deletion via Settings. Deleting your account initiates a script that instantly purges all family profile logs, proofs, and location histories from our databases.'
      }
    ]
  },

  subscription: {
    id: 'subscription',
    title: 'Subscription & Refund Policy',
    subtitle: 'Tiers, Billing Operations & Refund Policies',
    lastUpdated: 'July 13, 2026',
    sections: [
      {
        title: '1. Pricing & Feature Tiers',
        content: [
          '• Free Plan: Log up to 50 transactions per month, create 1 family group (up to 3 members), and utilize up to 50MB of My Proofs document storage.',
          '• Premium Monthly: Access unlimited transactions, unlimited family groups (unlimited members), automated SMS parsing drafts, live gold/silver rate monitors, and 5GB of encrypted proofs storage.',
          '• Premium Yearly: All premium benefits billed annually with a 20% savings.',
          '• Lifetime Pass (Future): A one-time purchase to lock in premium access for life (up to 20GB vaults).'
        ]
      },
      {
        title: '2. Payment Gateways',
        content: 'All subscriptions are processed securely. Payments on our web portal are processed via Stripe, while subscriptions initiated inside our mobile apps use Google Play Billing or Apple App Store In-App Purchases.'
      },
      {
        title: '3. Grace Period & Expiry',
        content: 'If your payment fails or your subscription expires, your account reverts to the Free Plan. No data is deleted; however, you will be restricted from adding new transactions or uploading files if your storage usage exceeds the Free plan limits.'
      },
      {
        title: '4. 14-Day Refund Guarantee',
        content: 'We offer a full 14-day refund window for first-time monthly or yearly premium purchases. If you are unsatisfied, contact us or request a refund via the Google Play store console. Refunds are processed back to the original card within 5 to 7 business days.'
      },
      {
        title: '5. Cancellations',
        content: 'You can cancel your subscription at any time. Cancellation turns off auto-renewal for the next billing cycle. Premium status remains active on your profile until the end of your prepaid period.'
      }
    ]
  },

  retention: {
    id: 'retention',
    title: 'Data Retention Policy',
    subtitle: 'Archiving, Lifecycles, and Data Pruning Rules',
    lastUpdated: 'July 13, 2026',
    sections: [
      {
        title: '1. Basic Financial Logs',
        content: 'Financial logs, expenses, category histories, and budgets are stored indefinitely on our cloud database. This data is preserved so you can generate annual reports and track long-term savings trends, and is only removed if you delete your profile.'
      },
      {
        title: '2. Location Logs',
        content: 'To safeguard user privacy, background and active geolocation coordinates are only stored temporarily. Coordinates are kept in our transactional databases for 24 hours before database triggers automatically wipe them.'
      },
      {
        title: '3. Document Storage & Deleted Files',
        content: 'When you delete a document (receipt, invoice, or identity proof) from the My Proofs locker, it is immediately deleted from active listings. The file is purged from our primary cloud storage buckets and offline backup archives within 30 days.'
      },
      {
        title: '4. User Profile Deletion',
        content: 'Clicking "Delete Account" in settings triggers a cascade delete: your email, profile image, credentials, and all database links are scrubbed immediately. Your data will be erased from encrypted system backups within 30 days.'
      },
      {
        title: '5. Inactive Accounts Policy',
        content: 'Accounts that show no activity (logins or updates) for 12 consecutive months are marked as inactive. We will send warning notifications before purging inactive Free accounts.'
      }
    ]
  },


  contact: {
    id: 'contact',
    title: 'Contact & Support',
    subtitle: 'Customer Care & Developer Communications',
    lastUpdated: 'July 13, 2026',
    sections: [
      {
        title: '1. Customer Support Help Desk',
        content: 'Have questions regarding family groups, budgets, or subscription tiers? Email our customer care desk at velgo7686@gmail.com. We respond to support tickets within 24 hours, Monday through Friday.'
      },
      {
        title: '2. Bug and Parsing Failure Reporting',
        content: 'If you encounter a UI glitch, app crash, or an issue with the local SMS parser, email our engineering team at velgo7686@gmail.com. Please specify your device model, OS version, and the format of the failed bank SMS.'
      },
      {
        title: '3. Feature Requests',
        content: 'Want to suggest an improvement or request a new feature? We evaluate feature proposals regularly. Write to us at velgo7686@gmail.com.'
      },
      {
        title: '4. Corporate Office & Partnerships',
        content: 'MS Family is developed and owned by MS Technologies. For legal queries, corporate partnerships, or licensing questions, contact our corporate office at velgo7686@gmail.com.'
      }
    ]
  },

  version: {
    id: 'version',
    title: 'App Version & Architecture',
    subtitle: 'Software Build & Deployment Metrics',
    lastUpdated: 'July 13, 2026',
    sections: [
      {
        title: '1. App Build Parameters',
        content: [
          '• Version: 1.0.0 (Production Release)',
          '• Build Number: 100',
          '• Release Date: July 13, 2026',
          '• Channel: Stable - Main'
        ]
      },
      {
        title: '2. Native Framework Versions',
        content: [
          '• Capacitor Runtime: 8.3.1',
          '• React Core: 18.2.0',
          '• Recharts: 2.12.0',
          '• Framer Motion: 11.0.3'
        ]
      },
      {
        title: '3. Database & Hosting Infrastructure',
        content: [
          '• DB Engine: AlloyDB Omni (PostgreSQL 15.6 compatible)',
          '• API Gateway: Supabase Auth & Storage API',
          '• Hosting Portal: Vercel Production Web Engine',
          '• Database Connection Status: Secure SSL Active'
        ]
      }
    ]
  },

  changelog: {
    id: 'changelog',
    title: 'Changelog',
    subtitle: 'History of Releases and Feature Additions',
    lastUpdated: 'July 13, 2026',
    sections: [
      {
        title: 'v1.0.0 (July 13, 2026) - Official Launch',
        content: [
          '• [Feature] Hierarchical App Information: Consolidated settings subpages into a clean list landing page (`/settings/app-info`).',
          '• [Feature] Multi-language Proverb Greeting: Dashboard card translates proverbs dynamically to user language (Tamil, Hindi, Gujarati, Chinese, Arabic, Spanish, French, German).',
          '• [Improvement] Search Z-index Fix: Fixed search input icon visibility inside AppInfoDocViewer.',
          '• [Improvement] Chart Dimension Optimization: Redesigned SafeChartContainer using cloneElement and ResizeObserver, resolving Recharts zero-dimension warnings.',
          '• [Assets] Replaced placeholder text icons with the official `/msfamily.png` application logo.'
        ]
      },
      {
        title: 'v0.9.8 (June 28, 2026) - Beta Release',
        content: [
          '• [Feature] Local Smart SMS Reader: Parses credit card, debit card, and UPI alerts locally.',
          '• [Feature] Biometric Lock: Toggle biometrics (fingerprint/facial templates) or PIN code.',
          '• [Improvement] Offline database synchronization via localForage cache hooks.'
        ]
      },
      {
        title: 'v0.9.0 (May 15, 2026) - Alpha testing',
        content: [
          '• [Feature] Live Family Location Sharing: Real-time coordination sharing inside groups.',
          '• [Feature] Proofs Vault: Encrypted receipt storage with custom member visibility gates.'
        ]
      }
    ]
  }
};
