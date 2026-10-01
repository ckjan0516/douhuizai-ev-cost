import type { ReactNode } from 'react'

interface BreakdownDialogProps {
  open: boolean
  eyebrow: string
  title: string
  total?: string
  onClose: () => void
  children: ReactNode
}

export function BreakdownDialog({
  open,
  eyebrow,
  title,
  total,
  onClose,
  children,
}: BreakdownDialogProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal breakdown-modal"
        role="dialog"
        aria-labelledby="breakdown-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="breakdown-title">{title}</h2>
        {total ? <p className="lede">{total}</p> : null}
        <div className="breakdown-body">{children}</div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
