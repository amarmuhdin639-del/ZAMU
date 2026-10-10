'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { formatDateTime } from '@/lib/shared'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'

type Log = { id: string; adminName: string | null; action: string; details: string | null; createdAt: string }

const TONE: Record<string, string> = {
  PAYMENT_APPROVED: 'bg-[#4a7c59]/10 text-[#4a7c59]',
  PAYMENT_REJECTED: 'bg-destructive/10 text-destructive',
  ORDER_STATUS_CHANGED: 'bg-[#b8a038]/10 text-[#b8a038]',
  PRODUCT_DELETED: 'bg-destructive/10 text-destructive',
  PRODUCT_CREATED: 'bg-ink/5 text-foreground',
}

export function AdminAudit() {
  const { t } = useLang()
  const [logs, setLogs] = useState<Log[] | null>(null)

  useEffect(() => {
    fetch('/api/admin/audit')
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .catch(() => setLogs([]))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight">{t('admin.audit.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.audit.sub')}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {logs === null ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">{t('admin.audit.empty')}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5 text-sm">
                <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', TONE[l.action] ?? 'bg-secondary text-foreground/70')}>
                  {l.action.replaceAll('_', ' ')}
                </span>
                <span className="min-w-0 flex-1 text-foreground/80">{l.details}</span>
                <span className="text-xs text-muted-foreground">{l.adminName ?? t('admin.system')} · {formatDateTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
