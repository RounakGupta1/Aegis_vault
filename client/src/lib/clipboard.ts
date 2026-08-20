export async function copyAndExpire(value: string, seconds: number) {
  await navigator.clipboard.writeText(value);
  window.setTimeout(() => {
    navigator.clipboard.writeText("").catch(() => undefined);
  }, seconds * 1000);
}
