/**
 * FormDataEntryValue is `File | string` in lib.dom; Next.js may still hand back a
 * Blob-like value at runtime. Return Blob | null — do not use `value is Blob`
 * (TS2677: Blob is not assignable to FormDataEntryValue).
 */
export function asUploadBlob(value: FormDataEntryValue | null): Blob | null {
  if (value === null || typeof value === "string") return null;
  const candidate = value as Blob;
  if (
    typeof candidate.arrayBuffer !== "function" ||
    typeof candidate.size !== "number"
  ) {
    return null;
  }
  return candidate;
}
