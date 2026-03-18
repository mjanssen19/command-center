export interface PaperclipCompany {
  id: string
  name: string
  prefix: string
  mission?: string
}

export interface PaperclipAgent {
  id: string
  companyId: string
  name: string
  role: string
  status: 'active' | 'paused' | 'error' | 'offline'
  adapterType: string
  currentTaskId?: string
  lastHeartbeatAt?: string
  iconUrl?: string
  modelProvider?: string
  modelName?: string
  monthlyBudget?: number
  monthlySpend?: number
}

export interface PaperclipIssue {
  id: string
  companyId: string
  title: string
  description?: string
  status: string
  priority?: string
  assigneeId?: string
  projectId?: string
  parentIssueId?: string
  labels?: string[]
  createdAt: string
  updatedAt: string
}

export interface PaperclipProject {
  id: string
  companyId: string
  name: string
  description?: string
  status: string
  createdAt: string
}

export interface PaperclipApproval {
  id: string
  companyId: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  requestedById?: string
  payload?: Record<string, unknown>
  createdAt: string
  resolvedAt?: string
}

export interface PaperclipRun {
  id: string
  agentId: string
  companyId: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt?: string
  finishedAt?: string
  exitCode?: number
  usageJson?: Record<string, unknown>
}

export interface PaperclipCostSummary {
  totalCost: number
  byAgent: Array<{ agentId: string; agentName: string; cost: number }>
  byProject: Array<{ projectId: string; projectName: string; cost: number }>
  period: string
}

export interface PaperclipActivity {
  id: string
  type: string
  summary: string
  timestamp: string
  agentId?: string
  issueId?: string
}

export interface PaperclipOrgNode {
  agentId: string
  name: string
  role: string
  parentAgentId?: string
  children?: PaperclipOrgNode[]
}
