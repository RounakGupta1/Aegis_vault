import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "../ui/Field";
import { Button } from "../ui/Button";

export function SecretField({
  value,
  id,
  onCopy,
}: {
  value: string;
  id: string;
  onCopy: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 8000);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        readOnly
        type={visible ? "text" : "password"}
        value={value}
        autoComplete="off"
        onMouseDown={() => setVisible(true)}
        onMouseUp={() => setVisible(false)}
        onMouseLeave={() => setVisible(false)}
      />
      <Button
        type="button"
        variant="secondary"
        aria-label={visible ? "Hide secret" : "Show secret"}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </Button>
      <Button type="button" variant="secondary" onClick={onCopy}>
        Copy
      </Button>
    </div>
  );
}
