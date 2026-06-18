"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function MehfilLogo({ size = "md", invert = false, withTagline = false }: { size?: "sm" | "md" | "lg"; invert?: boolean; withTagline?: boolean }) {
  const params = useParams();
  const slug = params?.slug as string;

  const { data: restaurant } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: () => api<any>(`/api/restaurants/${slug}`),
    enabled: !!slug,
  });

  const sizes = {
    sm: { wrap: "h-9", word: "text-lg", img: "h-8" },
    md: { wrap: "h-12", word: "text-2xl", img: "h-11" },
    lg: { wrap: "h-24", word: "text-6xl md:text-7xl", img: "h-20" },
  }[size];
  
  const wordCol = invert ? "text-[#FAF5EC]" : "text-brand-primary";

  return (
    <Link href={`/r/${slug}`} data-testid="brand-logo" className={`flex flex-col items-center ${sizes.wrap} justify-center select-none`}>
      {restaurant?.logo_url ? (
        <img src={restaurant.logo_url} alt={restaurant?.name || "Brand Logo"} className={`${sizes.img} object-contain`} />
      ) : (
        <div className={`font-royal font-bold tracking-[0.18em] ${wordCol} ${sizes.word} leading-none mt-0.5 uppercase`}>
          {restaurant?.name || "MEHFIL"}
        </div>
      )}
      {withTagline && (restaurant?.tagline || !restaurant?.name) && (
        <div className={`font-editorial italic text-base md:text-lg ${invert ? "text-[#FAF5EC]/80" : "text-brand-primary/80"} mt-3 tracking-wide`}>
          {restaurant?.tagline || "Hyderabad's Original Biryani Experience"}
        </div>
      )}
    </Link>
  );
}
