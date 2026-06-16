"use client";
import Link from "next/link";

export function MehfilLogo({ size = "md", invert = false, withTagline = false }: { size?: "sm" | "md" | "lg"; invert?: boolean; withTagline?: boolean }) {
  const sizes = {
    sm: { wrap: "h-9", word: "text-lg", crown: "text-[0.6rem]", flourish: "text-[0.55rem]" },
    md: { wrap: "h-12", word: "text-2xl", crown: "text-[0.7rem]", flourish: "text-[0.65rem]" },
    lg: { wrap: "h-24", word: "text-6xl md:text-7xl", crown: "text-sm", flourish: "text-xs" },
  }[size];
  const wordCol = invert ? "text-[#FAF5EC]" : "text-[#8A1A2A]";
  const goldCol = "text-[#C9A348]";

  return (
    <Link href="/customer" data-testid="mehfil-logo" className={`flex flex-col items-center ${sizes.wrap} justify-center select-none`}>
      <div className={`font-royal tracking-[0.25em] ${goldCol} ${sizes.crown} uppercase`}>est&nbsp;·&nbsp;2006</div>
      <div className={`font-royal font-bold tracking-[0.18em] ${wordCol} ${sizes.word} leading-none mt-0.5`}>MEHFIL</div>
      <div className={`font-royal tracking-[0.4em] ${goldCol} ${sizes.flourish} uppercase mt-0.5`}>— hyderabad —</div>
      {withTagline && (
        <div className={`font-editorial italic text-base md:text-lg ${invert ? "text-[#FAF5EC]/80" : "text-[#5C0E1B]/80"} mt-3 tracking-wide`}>
          Hyderabad&apos;s Original Biryani Experience
        </div>
      )}
    </Link>
  );
}
