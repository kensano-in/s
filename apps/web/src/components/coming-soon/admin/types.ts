export type GatewayStep = 'pin' | 'setup' | 'login' | 'dashboard';
export type DashboardView = 'overview' | 'tickets' | 'agents' | 'security' | 'audit';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'Received' | 'In progress' | 'In review' | 'Escalated' | 'Completed' | 'Suspended';

export interface Ticket {
  id: string;
  case_id?: string;
  subject: string;
  description: string;
  full_name: string;
  email: string;
  report_type: string;
  status: TicketStatus;
  admin_reply?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at?: string;
  priority?: TicketPriority;
  assigned_to?: string;
  labels?: string[];
  risk_score?: number;
  flagged?: boolean;
}

export interface PreReg {
  id: string;
  full_name?: string;
  email: string;
  domain: string;
  gender?: string;
  ip_address?: string;
  ip_hash?: string;
  status?: string;
  created_at: string;
}

export interface AdminNote {
  id: string;
  ticket_id: string;
  note: string;
  flag: 'none' | 'spam' | 'abuse' | 'risk' | 'vip';
  risk_score: number;
  author: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  ticket_id?: string;
  actor: string;
  detail: string;
  severity: 'info' | 'warn' | 'critical';
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'away' | 'offline';
  tickets_open: number;
  tickets_resolved: number;
  avg_response_time: string;
  avatar_color: string;
}

export interface LiveActivity {
  id: string;
  type: 'new_ticket' | 'reply' | 'status_change' | 'note' | 'escalation' | 'suspension';
  message: string;
  time: string;
  severity?: 'info' | 'warn' | 'critical';
}
