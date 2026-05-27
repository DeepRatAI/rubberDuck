import type {
  FeedItem,
  Locale,
  Profile,
  TrendTopic,
  Viewer,
} from "@/lib/domain";
import { brand } from "@/lib/brand";
import { getDictionary } from "@/lib/i18n";
import { AppShell } from "./app-shell";
import { ActivationBoard } from "./activation-board";
import { FeedSurface } from "./feed";
import { RssCover } from "./rss-cover";
import { Badge } from "./ui/badge";
import type { ActivationSnapshot } from "@/server/repositories/activation";

function editorialItems(feed: FeedItem[]) {
  return feed;
}

export function HomeDashboard({
  locale,
  feed,
  feedNextCursor,
  feedTotal,
  viewer,
  suggestedProfiles,
  publicBaseUrl,
  activation,
  externalTrends,
}: {
  locale: Locale;
  feed: FeedItem[];
  feedNextCursor: number | null;
  feedTotal: number;
  viewer: Viewer;
  suggestedProfiles: Profile[];
  publicBaseUrl: string;
  activation: ActivationSnapshot;
  externalTrends: TrendTopic[];
}) {
  const dictionary = getDictionary(locale);
  const deck = editorialItems(feed);
  const featured = deck[0];
  const secondary = deck.slice(1, 3);

  return (
    <AppShell active="Home" locale={locale}>
      <div className="min-w-0 space-y-5">
        <section className="grid min-w-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)]">
            <div className="grid min-h-[340px] md:grid-cols-[0.95fr_1.05fr]">
              <div className="p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--accent)]">
                  {brand.productName} {dictionary.signalDeck}
                </p>
                <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-[color:var(--foreground)]">
                  {dictionary.homeTitle}
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
                  {dictionary.homeDescription}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge tone="cyan">{dictionary.rssBinnacle}</Badge>
                  <Badge tone="amber">{dictionary.mediaRich}</Badge>
                  <Badge tone="green">{dictionary.noToxicCounters}</Badge>
                </div>
              </div>
              <div className="relative min-h-64 border-t border-[color:var(--line)] md:border-l md:border-t-0">
                <RssCover
                  title={featured?.title ?? brand.productName}
                  imageUrl={
                    featured?.imageUrl ??
                    featured?.media.find((media) => media.type === "image")?.url
                  }
                  priority
                  className="absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#15130f] via-[#15130f]/20 to-transparent" />
                {featured ? (
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <Badge tone={featured.type === "rss" ? "cyan" : "blue"}>
                      {featured.type.toUpperCase()}
                    </Badge>
                    <h2 className="mt-3 text-xl font-semibold text-white">
                      {featured.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-stone-200">
                      {featured.body}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {secondary.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)]"
              >
                <div className="relative aspect-[2.8/1] w-full">
                  <RssCover
                    title={item.title}
                    imageUrl={
                      item.imageUrl ??
                      item.media.find((media) => media.type === "image")?.url
                    }
                    className="absolute inset-0"
                  />
                </div>
                <div className="p-4">
                  <Badge tone={item.type === "rss" ? "cyan" : "amber"}>
                    {item.type.toUpperCase()}
                  </Badge>
                  <h2 className="mt-3 line-clamp-2 text-sm font-semibold text-[color:var(--foreground)]">
                    {item.title}
                  </h2>
                </div>
              </article>
            ))}
          </div>
        </section>
        <ActivationBoard locale={locale} snapshot={activation} />
        <FeedSurface
          locale={locale}
          initialFeed={feed}
          initialNextCursor={feedNextCursor}
          totalFeedItems={feedTotal}
          viewer={viewer}
          suggestedProfiles={suggestedProfiles}
          externalTrends={externalTrends}
          publicBaseUrl={publicBaseUrl}
          showComposer={false}
        />
      </div>
    </AppShell>
  );
}
