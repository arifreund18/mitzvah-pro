'use client'

import { cn } from '@/lib/utils'

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="block">
      <span className="text-sm font-medium text-white/80">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-white/40">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

export const inputClass =
  'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/60'

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string },
) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string },
) {
  return <textarea {...props} className={cn(inputClass, 'min-h-24', props.className)} />
}

export function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string },
) {
  return (
    <select
      {...props}
      className={cn(
        inputClass,
        'bg-[#12182a] text-white [color-scheme:dark] [&>option]:bg-[#12182a] [&>option]:text-white',
        props.className,
      )}
    />
  )
}
