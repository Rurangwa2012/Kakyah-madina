import { messages, type Locale } from "../src/i18n/messages";

function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return prefix ? [prefix] : [];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

const en = new Set(flatten(messages.en));
const locales: Locale[] = ["ar", "ms"];
let missing = 0;
for (const locale of locales) {
  const keys = new Set(flatten(messages[locale]));
  for (const key of en) {
    if (!keys.has(key)) {
      console.log(`MISSING ${locale}: ${key}`);
      missing += 1;
    }
  }
  for (const key of keys) {
    if (!en.has(key)) console.log(`EXTRA ${locale}: ${key}`);
  }
}
console.log(`en_keys=${en.size} missing=${missing}`);
if (missing) process.exit(1);
