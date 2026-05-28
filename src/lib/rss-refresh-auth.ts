export type RssRefreshSecrets = {
  cronSecret?: string;
  refreshSecret: string;
};

export function hasRssRefreshAccess(
  input: {
    headerSecret?: string | null;
    legacyHeaderSecret?: string | null;
    authorization?: string | null;
    querySecret?: string | null;
  },
  secrets: RssRefreshSecrets,
) {
  const bearerToken = input.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const acceptedSecrets = new Set(
    [secrets.refreshSecret, secrets.cronSecret].filter(Boolean),
  );

  return [
    input.headerSecret,
    input.legacyHeaderSecret,
    bearerToken,
    input.querySecret,
  ].some((candidate) => Boolean(candidate && acceptedSecrets.has(candidate)));
}
