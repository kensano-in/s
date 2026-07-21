import { 
    User, 
    Shield, 
    Bell, 
    Palette, 
    Lock, 
    Database, 
    LifeBuoy, 
    AlertTriangle,
    Activity,
    Clock,
    CreditCard,
    ShieldAlert,
    Zap,
    TrendingUp,
    Link
} from 'lucide-react';

export interface SettingsRoute {
    id: string;
    label: string;
    subtitle: string;
    href: string;
    icon: any;
    destructive?: boolean;
    keywords: string[];
    comingSoon?: boolean;
}

export interface SettingsGroup {
    id: string;
    title: string;
    routes: SettingsRoute[];
}

export const SETTINGS_REGISTRY: SettingsGroup[] = [
    {
        id: 'your_account',
        title: 'Your Account',
        routes: [
            {
                id: 'account',
                label: 'Personal Details',
                subtitle: 'Profiles, contact, bio, gender, birthday, pronouns',
                href: '/settings/account',
                icon: User,
                keywords: ['name', 'username', 'email', 'phone', 'bio', 'pronouns', 'avatar', 'banner', 'gender', 'birthday', 'verification', 'badge', 'song', 'music'],
                comingSoon: true
            },
            {
                id: 'connections',
                label: 'Linked Accounts',
                subtitle: 'Connect Spotify and manage app integrations',
                href: '/settings/connections',
                icon: Link,
                keywords: ['spotify', 'music', 'integration', 'connect', 'connections', 'linked', 'accounts', 'api'],
                comingSoon: true
            },
            {
                id: 'security',
                label: 'Security & Logins',
                subtitle: 'Password, 2FA, logins, integrity audit',
                href: '/settings/security',
                icon: Lock,
                keywords: ['password', '2fa', 'authenticator', 'totp', 'login', 'sessions', 'devices', 'ip', 'threat', 'recovery codes']
            },
            {
                id: 'management',
                label: 'Account Management',
                subtitle: 'SSO, linked credentials, deactivation',
                href: '/settings/management',
                icon: AlertTriangle,
                destructive: true,
                keywords: ['switch', 'logout', 'deactivate', 'delete', 'linked', 'sso', 'disconnect', 'recovery'],
                comingSoon: true
            }
        ]
    },
    {
        id: 'how_you_use',
        title: 'How You Use Verlyn',
        routes: [
            {
                id: 'your-activity',
                label: 'Your Activity',
                subtitle: 'Comments, likes, search logs, follows audit',
                href: '/settings/your-activity',
                icon: Activity,
                keywords: ['activity', 'likes', 'comments', 'follows', 'history', 'searches', 'audit', 'logs'],
                comingSoon: true
            },
            {
                id: 'time-management',
                label: 'Time Management',
                subtitle: 'Screen usage analytics, quiet hours',
                href: '/settings/time-management',
                icon: Clock,
                keywords: ['time', 'screen time', 'usage', 'quiet hours', 'sleep', 'focus', 'analytics'],
                comingSoon: true
            },
            {
                id: 'notifications',
                label: 'Notifications',
                subtitle: 'Push notifications, alert preferences',
                href: '/settings/notifications',
                icon: Bell,
                keywords: ['push', 'email', 'sms', 'quiet hours', 'dnd', 'vibration', 'sound', 'batching', 'priority']
            }
        ]
    },
    {
        id: 'for_professionals',
        title: 'For Professionals',
        routes: [
            {
                id: 'creator-tools',
                label: 'Creator Tools',
                subtitle: 'Switch classification, reach metrics, monetization',
                href: '/settings/creator-tools',
                icon: TrendingUp,
                keywords: ['creator', 'influencer', 'professional', 'monetization', 'partnership', 'revenue', 'reach', 'audience', 'metrics', 'dashboard', 'category'],
                comingSoon: true
            }
        ]
    },
    {
        id: 'who_can_see',
        title: 'Who Can See Your Content',
        routes: [
            {
                id: 'privacy',
                label: 'Account Privacy',
                subtitle: 'Private profile, blocklist, mentions control',
                href: '/settings/privacy',
                icon: Shield,
                keywords: ['private', 'activity', 'online', 'receipts', 'mentions', 'tags', 'close friends', 'blocked', 'muted', 'words', 'restricted']
            }
        ]
    },
    {
        id: 'app_media',
        title: 'Your App & Media',
        routes: [
            {
                id: 'appearance',
                label: 'Visual Appearance',
                subtitle: 'AMOLED dark mode, font scale, animations',
                href: '/settings/appearance',
                icon: Palette,
                keywords: ['theme', 'dark mode', 'amoled', 'contrast', 'font', 'radius', 'blur', 'motion', 'chat theme', 'bubbles', 'gradients'],
                comingSoon: true
            },
            {
                id: 'data-storage',
                label: 'Data & Storage',
                subtitle: 'Media quality, cache breakdown, exports',
                href: '/settings/data-storage',
                icon: Database,
                keywords: ['storage', 'cache', 'heatmap', 'export', 'download', 'bandwidth', 'offline', 'media quality'],
                comingSoon: true
            }
        ]
    },
    {
        id: 'orders_payments',
        title: 'Orders & Payments',
        routes: [
            {
                id: 'payments',
                label: 'Payments & Subscriptions',
                subtitle: 'Billing cards, receipts, active subscriptions',
                href: '/settings/payments',
                icon: CreditCard,
                keywords: ['payment', 'wallet', 'billing', 'subscription', 'receipts', 'invoice'],
                comingSoon: true
            }
        ]
    },
    {
        id: 'help_support',
        title: 'Help & Support',
        routes: [
            {
                id: 'support',
                label: 'Help Center',
                subtitle: 'Guides, bug report tickets, latency diagnostics',
                href: '/settings/support',
                icon: LifeBuoy,
                keywords: ['bug', 'diagnostics', 'fps', 'ping', 'latency', 'memory', 'crash', 'report', 'support']
            },
            {
                id: 'account-status',
                label: 'Account Status',
                subtitle: 'Moderation strikes history, account status guidelines',
                href: '/settings/account-status',
                icon: ShieldAlert,
                keywords: ['strikes', 'violations', 'moderation', 'appeal', 'account status', 'limitations'],
                comingSoon: true
            },
            {
                id: 'privacy-diagnostics',
                label: 'Privacy Diagnostics',
                subtitle: 'Integrity audit, device trust score, bot scan',
                href: '/settings/privacy-diagnostics',
                icon: Zap,
                keywords: ['diagnostics', 'integrity', 'trust score', 'bot', 'vpn', 'security audit'],
                comingSoon: true
            }
        ]
    }
];

export const ALL_ROUTES = SETTINGS_REGISTRY.flatMap(group => group.routes);

export function searchSettings(query: string): SettingsRoute[] {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return ALL_ROUTES;
    
    return ALL_ROUTES.filter(route => 
        route.label.toLowerCase().includes(cleanQuery) ||
        route.subtitle.toLowerCase().includes(cleanQuery) ||
        route.keywords.some(keyword => keyword.includes(cleanQuery))
    );
}
