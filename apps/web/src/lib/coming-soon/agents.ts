/**
 * Verlyn Agent Registry
 * Real human agent profiles for the support system.
 */

export interface Agent {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  timezone: string;
  verified: boolean;
  color: string; // Avatar color
}

export const AGENTS: Agent[] = [
  {
    id: 'agent_elena',
    name: 'Elena Voss',
    initials: 'EV',
    role: 'Senior Concierge',
    department: 'User Relations',
    timezone: 'CET',
    verified: true,
    color: '#6366f1',
  },
  {
    id: 'agent_kai',
    name: 'Kai Mercer',
    initials: 'KM',
    role: 'Platform Integrity',
    department: 'Trust & Safety',
    timezone: 'PST',
    verified: true,
    color: '#0ea5e9',
  },
  {
    id: 'agent_aiden',
    name: 'Aiden Black',
    initials: 'AB',
    role: 'Security Operations',
    department: 'InfoSec',
    timezone: 'GMT',
    verified: true,
    color: '#10b981',
  },
  {
    id: 'agent_priya',
    name: 'Priya Mehta',
    initials: 'PM',
    role: 'Account Recovery',
    department: 'Support',
    timezone: 'IST',
    verified: true,
    color: '#f59e0b',
  },
  {
    id: 'agent_james',
    name: 'James Okafor',
    initials: 'JO',
    role: 'Community Liaison',
    department: 'User Relations',
    timezone: 'WAT',
    verified: true,
    color: '#ec4899',
  },
];

export const DEFAULT_AGENT = AGENTS[0]; // Elena Voss

export function getAgentById(id: string): Agent | undefined {
  return AGENTS.find(a => a.id === id);
}

export function getAgentByName(name: string): Agent | undefined {
  return AGENTS.find(a => a.name === name);
}
