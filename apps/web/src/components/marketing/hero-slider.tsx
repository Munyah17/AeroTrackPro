"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchHeroSlides, type HeroSlide } from "@/lib/hero-slides";
import { QuickApply } from "@/components/marketing/quick-apply";
import { cn } from "@/lib/utils";

const AUTO_MS = 6500;

export function HeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetchHeroSlides().then(setSlides);
  }, []);

  const count = slides.length;
  const go = useCallback(
    (n: number) => setIndex((i) => ((i + n) % count + count) % count),
    [count],
  );

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => go(1), AUTO_MS);
    return () => clearInterval(t);
  }, [paused, count, go]);

  if (count === 0) {
    // Skeleton while slides load — keeps layout stable.
    return <section className="h-[420px] w-full bg-slate-900 sm:h-[520px]" />;
  }

  const slide = slides[index];

  return (
    <section
      className="relative h-[420px] w-full overflow-hidden bg-slate-900 sm:h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* background images stacked — crossfade */}
      {slides.map((s, i) => (
        <img
          key={s.id}
          src={s.image_url}
          alt=""
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-1000",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {/* reduced-opacity overlay + bottom gradient for legibility */}
      <div aria-hidden className="absolute inset-0 bg-black/45" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25"
      />

      {/* slide content */}
      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-14 sm:px-6 sm:pb-16">
        <div key={slide.id} className="max-w-2xl">
          <h1 className="text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-white/80 sm:text-lg">
            {slide.description}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={slide.cta_href}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-card transition-transform hover:bg-white/90 active:scale-[0.98]"
            >
              {slide.cta_label} <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              View live demo
            </Link>
          </div>
        </div>

        {/* quick apply — right hand side on desktop */}
        <div className="absolute right-6 top-1/2 hidden w-[340px] -translate-y-1/2 lg:block">
          <QuickApply />
        </div>

        {/* controls: dots + arrows */}
        <div className="absolute bottom-5 right-5 flex items-center gap-2 sm:right-6">
          <div className="mr-1 hidden items-center gap-1.5 sm:flex">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-7 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70",
                )}
              />
            ))}
          </div>
          <button
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next slide"
            className="flex size-9 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
