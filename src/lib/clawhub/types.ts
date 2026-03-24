export interface ClawHubSkill {
  slug: string
  displayName: string
  summary: string
  tags: Record<string, string>
  stats: Record<string, unknown>
  createdAt: number
  updatedAt: number
  latestVersion?: {
    version: string
    createdAt: number
    changelog?: string
  }
  metadata?: {
    os?: string[]
    systems?: string[]
  }
}

export interface ClawHubSkillDetail {
  skill: ClawHubSkill
  latestVersion: {
    version: string
    createdAt: number
    changelog?: string
  }
  metadata?: {
    os?: string[]
    systems?: string[]
  }
  owner?: {
    handle: string
    displayName?: string
    image?: string | null
  }
  moderation?: {
    isSuspicious: boolean
    isMalwareBlocked: boolean
    verdict: string
    reasonCodes: string[]
    summary?: string | null
  }
}

export interface ClawHubSearchResult {
  score: number
  slug: string
  displayName: string
  summary: string
  version: string
  updatedAt: number
}

export interface ClawHubVersion {
  version: string
  createdAt: number
  changelog?: string
}
