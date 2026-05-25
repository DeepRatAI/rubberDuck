export type CoreThemeId = "cyberduck" | "rubberduck";
export type ThemeId = CoreThemeId | `community:${string}`;

export type ProductTheme = {
  id: ThemeId;
  label: string;
  description: string;
  creator: string;
  creatorHandle?: string;
  mode: "dark" | "light";
  palette: string[];
  status: "core" | "community_reviewed";
};

export const productThemes: ProductTheme[] = [
  {
    id: "cyberduck",
    label: "CyberDuck",
    description:
      "Dark cibersteampunk workspace with cyan focus, amber warmth, and low-glare contrast for deep technical sessions.",
    creator: "RubberDuck core team",
    mode: "dark",
    palette: ["#15130F", "#16D9D2", "#D69A38", "#F6F0DF"],
    status: "core",
  },
  {
    id: "rubberduck",
    label: "RubberDuck",
    description:
      "Clean daylight mode led by soft white, duck yellow, orange energy, and deep-blue trust contrast.",
    creator: "RubberDuck core team",
    mode: "light",
    palette: ["#FFFFFF", "#102A43", "#FF9F1C", "#FFD447"],
    status: "core",
  },
];

export const defaultThemeId: ThemeId = "cyberduck";

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return Boolean(value && productThemes.some((theme) => theme.id === value));
}

export type CommunityThemeInput = {
  label: string;
  description: string;
  creator: string;
  creatorHandle: string;
  mode: "dark" | "light";
  palette: string[];
};

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function validateCommunityTheme(input: CommunityThemeInput) {
  const errors: string[] = [];
  const palette = Array.from(
    new Set(input.palette.map((color) => color.trim())),
  );

  if (input.label.trim().length < 3 || input.label.trim().length > 40) {
    errors.push("Theme label must be between 3 and 40 characters.");
  }

  if (
    input.description.trim().length < 12 ||
    input.description.trim().length > 180
  ) {
    errors.push("Theme description must be between 12 and 180 characters.");
  }

  if (!/^@[a-z0-9_.-]{2,32}$/i.test(input.creatorHandle.trim())) {
    errors.push("Creator handle must look like @handle.");
  }

  if (palette.length < 4 || palette.length > 8) {
    errors.push("Theme palette must include 4 to 8 unique colors.");
  }

  if (palette.some((color) => !hexColorPattern.test(color))) {
    errors.push("Theme colors must be 6-digit hex values.");
  }

  if (
    palette.every((color) => hexColorPattern.test(color)) &&
    Math.max(
      ...palette.flatMap((color) =>
        palette.map((other) => contrastRatio(color, other)),
      ),
    ) < 4.5
  ) {
    errors.push(
      "Theme palette needs at least one WCAG AA text/background pair.",
    );
  }

  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    theme: {
      id: `community:${input.creatorHandle.replace(/^@/, "").toLowerCase()}:${input.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`,
      label: input.label.trim(),
      description: input.description.trim(),
      creator: input.creator.trim(),
      creatorHandle: input.creatorHandle.trim(),
      mode: input.mode,
      palette,
      status: "community_reviewed" as const,
    } satisfies ProductTheme,
  };
}
