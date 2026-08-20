import { useMemo, useState } from "react";
import {
  analyzePassword,
  estimateEntropy,
  generatePassphrase,
  generatePassword,
  type GeneratorOptions,
} from "../../lib/generator";
import { Button } from "../ui/Button";
import { Input, Label } from "../ui/Field";
import { toast } from "sonner";

const initial: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: true,
};

export function GeneratorPanel({ onUse }: { onUse?: (password: string) => void }) {
  const [options, setOptions] = useState(initial);
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [value, setValue] = useState(() => generatePassword(initial));

  const entropy = useMemo(
    () => (mode === "password" ? estimateEntropy(value, options) : estimateEntropy(value)),
    [mode, options, value],
  );
  const strength = analyzePassword(value);

  function regen() {
    setValue(mode === "password" ? generatePassword(options) : generatePassphrase(5));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={mode === "password" ? "primary" : "secondary"} type="button" onClick={() => setMode("password")}>
          Password
        </Button>
        <Button
          variant={mode === "passphrase" ? "primary" : "secondary"}
          type="button"
          onClick={() => setMode("passphrase")}
        >
          Passphrase
        </Button>
      </div>
      <div className="rounded-xl border border-[var(--color-line)] bg-black/5 p-3 font-mono text-sm break-all dark:bg-white/5">
        {value}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>
          {strength} · ~{entropy} bits
        </span>
        <div
          className="h-2 w-40 overflow-hidden rounded-full bg-black/10"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, entropy)}
          aria-label="Password strength"
        >
          <div
            className="h-full bg-teal-600"
            style={{ width: `${Math.min(100, (entropy / 90) * 100)}%` }}
          />
        </div>
      </div>
      {mode === "password" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="len">Length {options.length}</Label>
            <input
              id="len"
              type="range"
              min={8}
              max={64}
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          {(
            [
              ["uppercase", "Uppercase"],
              ["lowercase", "Lowercase"],
              ["numbers", "Numbers"],
              ["symbols", "Symbols"],
              ["excludeAmbiguous", "Exclude ambiguous"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={regen}>
          Regenerate
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            toast.success("Copied");
          }}
        >
          Copy
        </Button>
        {onUse && (
          <Button type="button" variant="secondary" onClick={() => onUse(value)}>
            Use password
          </Button>
        )}
      </div>
      {mode === "passphrase" ? null : (
        <Input className="hidden" readOnly value={value} aria-hidden />
      )}
    </div>
  );
}
