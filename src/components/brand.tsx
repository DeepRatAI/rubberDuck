import Image from "next/image";

import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-center",
        compact ? "w-20" : "w-36 sm:w-44",
      )}
    >
      <Image
        src={brand.fullLogoPath}
        alt={brand.productName}
        width={compact ? 112 : 196}
        height={compact ? 112 : 196}
        priority
        unoptimized
        className={cn(
          "brand-logo-glow h-auto w-full object-contain",
          compact ? "max-h-24" : "max-h-44",
        )}
      />
      <span className="sr-only">{brand.productName}</span>
    </div>
  );
}
