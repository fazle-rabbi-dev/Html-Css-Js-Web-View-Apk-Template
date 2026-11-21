import { cn } from 'cn'

export function Switch({ checked, onCheckedChange, className }: { checked: boolean; onCheckedChange: (v: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition', checked ? 'bg-primary' : 'bg-input', className)}
    >
      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-background transition', checked ? 'translate-x-5' : 'translate-x-1')} />
    </button>
  )
}