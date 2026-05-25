import type { Locale } from "./domain";

export const projectSignalResponseIntents = [
  "try",
  "review",
  "contribute",
  "follow_build",
] as const;

export type ProjectSignalResponseIntent =
  (typeof projectSignalResponseIntents)[number];

type ResponseCopy = {
  label: string;
  pastTense: string;
  notificationVerb: string;
};

const copyByLocale = {
  en: {
    try: {
      label: "I can test it",
      pastTense: "Testing offered",
      notificationVerb: "offered to test",
    },
    review: {
      label: "I can review",
      pastTense: "Review offered",
      notificationVerb: "offered to review",
    },
    contribute: {
      label: "I can contribute",
      pastTense: "Contribution offered",
      notificationVerb: "offered to contribute to",
    },
    follow_build: {
      label: "Follow the build",
      pastTense: "Following build",
      notificationVerb: "started following the build for",
    },
  },
  es: {
    try: {
      label: "Puedo probarlo",
      pastTense: "Prueba ofrecida",
      notificationVerb: "ofreció probar",
    },
    review: {
      label: "Puedo revisar",
      pastTense: "Revisión ofrecida",
      notificationVerb: "ofreció revisar",
    },
    contribute: {
      label: "Puedo contribuir",
      pastTense: "Contribución ofrecida",
      notificationVerb: "ofreció contribuir a",
    },
    follow_build: {
      label: "Seguir el build",
      pastTense: "Siguiendo build",
      notificationVerb: "empezó a seguir el build de",
    },
  },
} satisfies Record<Locale, Record<ProjectSignalResponseIntent, ResponseCopy>>;

export function getProjectSignalResponseCopy(
  intent: ProjectSignalResponseIntent,
  locale: Locale,
) {
  return copyByLocale[locale][intent];
}

export function createProjectSignalResponseNotification(input: {
  actorName: string | null | undefined;
  repoLabel: string;
  intent: ProjectSignalResponseIntent;
  locale?: Locale;
}) {
  const locale = input.locale ?? "en";
  const actor = input.actorName?.trim() || "A builder";
  const verb = copyByLocale[locale][input.intent].notificationVerb;
  return `${actor} ${verb} ${input.repoLabel}.`;
}

export function uniqueProjectSignalResponses(
  intents: ProjectSignalResponseIntent[],
) {
  return projectSignalResponseIntents.filter((intent) =>
    intents.includes(intent),
  );
}
