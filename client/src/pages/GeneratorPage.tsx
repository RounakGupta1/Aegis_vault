import { Card } from "../components/ui/Card";
import { GeneratorPanel } from "../components/generator/GeneratorPanel";

export function GeneratorPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Password generator</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Secrets are generated in your browser with a CSPRNG. Nothing is sent to the server.
      </p>
      <Card>
        <GeneratorPanel />
      </Card>
    </div>
  );
}
