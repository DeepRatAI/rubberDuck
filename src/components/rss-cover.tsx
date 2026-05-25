import Image from "next/image";

import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const fallbackImage = "/rubberduck-circuit-board.svg";
const fallbackLightImage = "/rubberduck-circuit-board-light.svg";

export function hasInheritedFeedImage(value?: string | null) {
  return Boolean(value && value !== fallbackImage);
}

export function RssCover({
  title,
  imageUrl,
  className,
  priority = false,
}: {
  title: string;
  imageUrl?: string | null;
  className?: string;
  priority?: boolean;
}) {
  const inherited = hasInheritedFeedImage(imageUrl);
  const inheritedImageUrl = imageUrl ?? fallbackImage;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[color:var(--surface-2)]",
        className,
      )}
    >
      {inherited ? (
        <Image
          src={inheritedImageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          unoptimized
          className="object-cover"
        />
      ) : (
        <>
          <Image
            src={fallbackImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            className="rss-fallback-dark object-cover opacity-80"
          />
          <Image
            src={fallbackLightImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            className="rss-fallback-light object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,212,71,0.16),transparent_42%),linear-gradient(135deg,rgba(16,42,67,0.13),rgba(255,159,28,0.1))] mix-blend-multiply" />
          <div className="absolute inset-0 flex items-center justify-center p-5">
            <Image
              src={brand.duckFallbackPath}
              alt=""
              width={180}
              height={180}
              priority={priority}
              loading={priority ? "eager" : "lazy"}
              unoptimized
              className="h-[min(72%,180px)] w-auto rounded-full border border-[#FCFCFF]/70 object-contain shadow-[0_18px_42px_rgba(0,0,0,0.28)]"
            />
          </div>
        </>
      )}
    </div>
  );
}
