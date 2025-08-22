import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface MathEditorProps {
  value: string
  onChange: (value: string, isValid: boolean) => void
  placeholder?: string
  showPreview?: boolean
  compact?: boolean
  className?: string
}

export default function MathEditor({
  value,
  onChange,
  placeholder = "Enter mathematical content...",
  showPreview = false,
  compact = false,
  className = ""
}: MathEditorProps) {
  const [localValue, setLocalValue] = useState(value)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange(newValue, true) // Simple validation for now
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Textarea
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        rows={compact ? 3 : 6}
        className="font-mono text-sm"
      />
      {showPreview && localValue && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border">
          <p className="text-sm text-slate-600 dark:text-slate-400">Preview:</p>
          <div className="mt-2 text-sm">{localValue}</div>
        </div>
      )}
    </div>
  )
}
