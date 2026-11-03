import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function RegistrationTags({
  kind,
  label,
  hint,
  values,
  options,
  input,
  error,
  addLabel,
  removeLabel,
  optionLabel,
  onInput,
  onAdd,
  onToggle,
}: {
  kind: "skills" | "interests"
  label: string
  hint: string
  values: string[]
  options: readonly string[]
  input: string
  error: string
  addLabel: string
  removeLabel: (value: string) => string
  optionLabel: (value: string) => string
  onInput: (value: string) => void
  onAdd: () => void
  onToggle: (value: string) => void
}) {
  const id = kind === "skills" ? "custom-skill-input" : "custom-interest-input"
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <p id={`${id}-hint`} className="sr-only">
        {hint}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((value) => (
          <Button
            key={value}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={values.includes(value)}
            onClick={() => onToggle(value)}
            className={cn(
              "min-h-9 max-w-full rounded-full px-2 text-xs",
              values.includes(value) &&
                "border-primary bg-primary/10 text-primary"
            )}
          >
            <span className="truncate">{optionLabel(value)}</span>
          </Button>
        ))}
      </div>
      {values.some((value) => !options.includes(value)) && (
        <div className="flex flex-wrap gap-2">
          {values
            .filter((value) => !options.includes(value))
            .map((value) => (
              <button
                key={value}
                type="button"
                aria-label={removeLabel(value)}
                onClick={() => onToggle(value)}
                className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs text-primary"
              >
                <span className="break-all">{value}</span>
                <X className="size-3 shrink-0" />
              </button>
            ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          name={kind}
          aria-label={label}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          aria-invalid={!!error}
          value={input}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              onAdd()
            }
          }}
          className="h-10 min-w-0 flex-1 rounded-lg"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!input.trim()}
          onClick={onAdd}
          aria-label={addLabel}
          className="h-10 shrink-0 rounded-lg px-3"
        >
          <Plus className="size-4" />
          <span className="sr-only sm:not-sr-only">{addLabel}</span>
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}
