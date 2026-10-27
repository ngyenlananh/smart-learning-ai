export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "É";
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
