import { dictionaries } from "../src/lib/i18n";

const locales = Object.keys(dictionaries) as Array<keyof typeof dictionaries>;
const [baseLocale, ...otherLocales] = locales;

if (!baseLocale) {
  throw new Error("No dictionaries were found.");
}

const baseKeys = Object.keys(dictionaries[baseLocale]).sort();
const failures: string[] = [];

for (const locale of otherLocales) {
  const keys = Object.keys(dictionaries[locale]).sort();
  const missing = baseKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !baseKeys.includes(key));

  if (missing.length > 0) {
    failures.push(`${locale} missing keys: ${missing.join(", ")}`);
  }

  if (extra.length > 0) {
    failures.push(`${locale} extra keys: ${extra.join(", ")}`);
  }
}

for (const locale of locales) {
  const emptyKeys = Object.entries(dictionaries[locale])
    .filter(([, value]) => {
      if (typeof value === "string") {
        return value.trim() === "";
      }

      if (typeof value === "function") {
        const sampleArgs = Array.from({ length: value.length }, (_, index) =>
          index === 0 ? "1" : 1,
        );
        const rendered = value(...sampleArgs);

        return typeof rendered !== "string" || rendered.trim() === "";
      }

      return true;
    })
    .map(([key]) => key);

  if (emptyKeys.length > 0) {
    failures.push(`${locale} empty keys: ${emptyKeys.join(", ")}`);
  }
}

if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}

console.log(
  `i18n coverage OK: ${locales.join(", ")} / ${baseKeys.length} shared keys.`,
);
