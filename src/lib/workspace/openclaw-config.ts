import fs from 'fs'
import path from 'path'

// --- Public types ---

export interface OpenClawAgent {
  id: string
  name: string
  emoji?: string
  workspace?: string
  isDefault?: boolean
  model?: string
  availableModels?: string[]
  channels?: string[]
}

// --- Internal types for JSON parsing ---

interface OpenClawAgentEntry {
  id: string
  name?: string
  default?: boolean
  workspace?: string
  identity?: {
    name?: string
    emoji?: string
  }
}

interface OpenClawBinding {
  agentId: string
  match?: {
    channel?: string
    accountId?: string
  }
}

interface OpenClawConfig {
  agents?: {
    defaults?: {
      model?: {
        primary?: string
      }
      models?: Record<string, unknown>
    }
    list?: OpenClawAgentEntry[]
  }
  bindings?: OpenClawBinding[]
}

/**
 * Discovers agents from openclaw.json in the workspace root.
 * Only reads: agents.defaults.model, agents.defaults.models, agents.list, bindings.
 * NEVER reads: channels, gateway, bot tokens, API keys, auth tokens, or credentials.
 *
 * @returns Array of discovered agents (empty if file missing, malformed, or no agents section)
 */
export function discoverAgents(): OpenClawAgent[] {
  const workspacePath = process.env.OPENCLAW_WORKSPACE_PATH
  if (!workspacePath) {
    return []
  }

  const configPath = path.join(workspacePath, 'openclaw.json')

  if (!fs.existsSync(configPath)) {
    console.log('[openclaw-config] No openclaw.json found, skipping agent discovery')
    return []
  }

  let config: OpenClawConfig
  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    config = JSON.parse(raw) as OpenClawConfig
  } catch (err) {
    console.error(
      `[openclaw-config] Failed to parse openclaw.json: ${err instanceof Error ? err.message : String(err)}`
    )
    return []
  }

  // SECURITY: Only access agents section and bindings — nothing else
  if (!config.agents) {
    console.log('[openclaw-config] No agents section in openclaw.json')
    return []
  }

  const defaultModel = config.agents.defaults?.model?.primary ?? undefined
  const availableModels = config.agents.defaults?.models
    ? Object.keys(config.agents.defaults.models)
    : undefined
  const agentList = config.agents.list ?? []
  const bindings = config.bindings ?? []

  if (agentList.length === 0) {
    return []
  }

  // Build channel lookup: agentId -> list of channels
  const channelMap = new Map<string, string[]>()
  for (const binding of bindings) {
    if (binding.agentId && binding.match?.channel) {
      const existing = channelMap.get(binding.agentId) ?? []
      existing.push(binding.match.channel)
      channelMap.set(binding.agentId, existing)
    }
  }

  const result: OpenClawAgent[] = []

  for (const entry of agentList) {
    if (!entry.id || typeof entry.id !== 'string') continue

    const agent: OpenClawAgent = {
      id: entry.id,
      name: entry.identity?.name ?? entry.name ?? entry.id,
      emoji: entry.identity?.emoji ?? undefined,
      workspace: entry.workspace ?? undefined,
      isDefault: entry.default === true,
      model: defaultModel,
      availableModels,
      channels: channelMap.get(entry.id) ?? undefined,
    }

    result.push(agent)
  }

  return result
}
