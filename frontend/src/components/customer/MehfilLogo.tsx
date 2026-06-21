"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";

export function MehfilLogo({ size = "md", invert = false, withTagline = false }: { size?: "sm" | "md" | "lg"; invert?: boolean; withTagline?: boolean }) {
  const params = useParams();
  const slug = params?.slug as string;
  
  // Get restaurant config from local JSON files
  const { config: restaurantConfig } = useRestaurantConfig();

  const sizes = {
    sm: { wrap: "h-9", word: "text-lg", img: "h-8" },
    md: { wrap: "h-12", word: "text-2xl", img: "h-11" },
    lg: { wrap: "h-24", word: "text-6xl md:text-7xl", img: "h-20" },
  }[size];
  
  const wordCol = invert ? "text-[#FAF5EC]" : "text-brand-primary";

  // Get restaurant name from config
  const restaurantName = restaurantConfig?.name || slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Restaurant";
  const restaurantTagline = restaurantConfig?.tagline || "";
  const logoUrl = restaurantConfig?.logo_url || "";

  return (
    <Link href={`/r/${slug}`} data-testid="brand-logo" className={`flex flex-col items-center ${sizes.wrap} justify-center select-none`}>
      {logoUrl ? (
        <img src={logoUrl} alt={restaurantName} className={`${sizes.img} object-contain`} />
      ) : (
        <div className={`font-royal font-bold tracking-[0.18em] ${wordCol} ${sizes.word} leading-none mt-0.5 uppercase`}>
          {restaurantName}
        </div>
      )}
      {withTagline && restaurantTagline && (
        <div className={`font-editorial italic text-base md:text-lg ${invert ? "text-[#FAF5EC]/80" : "text-brand-primary/80"} mt-3 tracking-wide`}>
          {restaurantTagline}
        </div>
      )}
    </Link>
  );
}
