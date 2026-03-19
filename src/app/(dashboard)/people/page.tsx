'use client'

import { useState, useMemo } from 'react'
import {
  Plus,
  UserCircle,
  Mail,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { useLocalData } from '@/lib/hooks/useLocalData'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Person } from '@/lib/entities/types'

// ── Constants ──

const RELATIONSHIP_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'collaborator', label: 'Collaborator' },
  { value: 'contact', label: 'Contact' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'other', label: 'Other' },
] as const

const RELATIONSHIP_COLORS: Record<string, string> = {
  client: 'bg-blue-900/50 text-blue-300',
  collaborator: 'bg-purple-900/50 text-purple-300',
  contact: 'bg-zinc-700 text-zinc-300',
  vendor: 'bg-amber-900/50 text-amber-300',
  other: 'bg-zinc-700 text-zinc-400',
}

// ── Helpers ──

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

// ── Person Card ──

function PersonCard({
  person,
  isExpanded,
  onToggle,
}: {
  person: Person
  isExpanded: boolean
  onToggle: () => void
}) {
  // Person type stored in role field as "role|relationship" or just "role"
  const parts = person.role.split('|')
  const role = parts[0] || 'Unknown'
  const relationship = parts[1] || 'contact'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
        )}
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-white">
            {person.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-200 truncate">{person.name}</p>
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded',
                RELATIONSHIP_COLORS[relationship] ?? 'bg-zinc-700 text-zinc-300'
              )}
            >
              {relationship}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-zinc-500">{role}</span>
            {person.email && (
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {person.email}
              </span>
            )}
            <span className="text-[10px] text-zinc-600 ml-auto">
              Added {relativeTime(person.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          {person.notes ? (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                Notes
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">{person.notes}</p>
            </div>
          ) : (
            <p className="text-xs text-zinc-600 text-center py-2">
              No additional details. Linked tasks, projects, and documents will appear here as
              connections are made.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add Person Dialog ──

function AddPersonDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [relationship, setRelationship] = useState('contact')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      await fetch('/api/local/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role: `${role.trim() || 'Unknown'}|${relationship}`,
          email: email.trim() || undefined,
          notes: '',
          createdAt: new Date().toISOString(),
        }),
      })
      queryClient.invalidateQueries({ queryKey: ['local', 'people'] })
      setName('')
      setRole('')
      setRelationship('contact')
      setEmail('')
      onOpenChange(false)
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Add Person</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name..."
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Role</label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Designer, CEO"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Relationship</label>
              <Select value={relationship} onValueChange={(v) => v && setRelationship(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {RELATIONSHIP_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {rt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1" />
            )}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──

export default function PeoplePage() {
  const { data: people } = useLocalData<Person>('people')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPeople = useMemo(() => {
    if (!people) return []
    if (!searchQuery.trim()) return people
    const q = searchQuery.toLowerCase()
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q))
    )
  }, [people, searchQuery])

  const totalPeople = people?.length ?? 0

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="People"
        description="Track people and entities linked to your work."
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Person
          </Button>
        }
      />

      {/* Search */}
      {totalPeople > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people..."
            className="bg-zinc-900 border-zinc-800 text-zinc-200 pl-9 h-8 text-xs"
          />
        </div>
      )}

      {/* People list */}
      {totalPeople === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={UserCircle}
            title="No people yet"
            description="Add people to track contacts, clients, and collaborators linked to your work."
            action={
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Person
              </Button>
            }
          />
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1">
          <EmptyState
            icon={Search}
            title="No matches"
            description="No people match your search. Try a different query."
          />
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto pb-2">
          {filteredPeople.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              isExpanded={expandedId === person.id}
              onToggle={() =>
                setExpandedId(expandedId === person.id ? null : person.id)
              }
            />
          ))}
        </div>
      )}

      <AddPersonDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
