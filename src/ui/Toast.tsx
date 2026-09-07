import type { ToastMsg } from './hooks'

export function Toast({ toast, onDismiss }: { toast: ToastMsg | null; onDismiss: () => void }) {
  if (!toast) return null
  return (
    <div className="toast" role="status" key={toast.id}>
      <span className="grow ellipsis">{toast.text}</span>
      {toast.actionLabel && toast.onAction && (
        <button className="toast-action" onClick={() => { toast.onAction?.(); onDismiss() }}>{toast.actionLabel}</button>
      )}
    </div>
  )
}
