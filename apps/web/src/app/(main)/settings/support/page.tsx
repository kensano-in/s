'use client';

import { SettingsSection, SettingsRow } from '../components';
import { ExternalLink, Mail, FileText, BookOpen } from 'lucide-react';

export default function SupportSettings() {
    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-1">Support & Legal</h2>
                <p className="text-[14px] text-neutral-500">Get help and review our platform policies.</p>
            </div>

            <SettingsSection title="Help & Support">
                <SettingsRow 
                    icon={BookOpen}
                    title="Help Center" 
                    desc="Browse articles and FAQs to learn how to use the platform." 
                    variant="navigation"
                    href="/docs"
                />
                <SettingsRow 
                    icon={Mail}
                    title="Contact Support" 
                    desc="support.verlyn@proton.me" 
                    right={<a href="mailto:support.verlyn@proton.me" className="text-[13px] text-neutral-300 font-medium bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full transition-colors">Email Us</a>}
                />
            </SettingsSection>

            <SettingsSection title="Legal">
                <SettingsRow 
                    icon={FileText}
                    title="Privacy Policy" 
                    desc="Learn how we collect, use, and protect your data." 
                    variant="navigation"
                    href="/privacy"
                />
                <SettingsRow 
                    icon={FileText}
                    title="Terms of Service" 
                    desc="Review the rules and guidelines for using our platform." 
                    variant="navigation"
                    href="/terms"
                />
            </SettingsSection>
        </div>
    );
}
