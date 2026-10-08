import type { PlatformId } from "@/lib/platforms";
import { Downloader } from "./Downloader";
import { FilmIcon, ImageIcon, MusicIcon, PlatformIcon } from "./icons";

interface Props {
  title: string;
  /** Shown after the title with a highlighter stroke. */
  highlight?: string;
  subtitle: string;
  placeholder?: string;
  platform?: PlatformId;
}

const TICKER = ["Trim to the second", "Crop 9:16", "Crop 1:1", "Speed 2x", "Slow-mo 0.5x", "Save as GIF", "Just the sound", "Grab a frame", "No watermark", "No sign-up"];

const PLATFORMS: PlatformId[] = ["instagram", "tiktok", "facebook", "snapchat", "pinterest"];

/** Platform tiles and format chips that bob in the side gutters on wide screens. */
const FLOATERS: { platform?: PlatformId; chip?: { label: string; Icon: typeof FilmIcon }; className: string; delay: string }[] = [
  // The backdrop starts 4rem above the hero, behind the sticky header, so tops begin past 8rem.
  { platform: "instagram", className: "left-[max(1rem,calc(50%-32rem))] top-[9rem] -rotate-12", delay: "0s" },
  { chip: { label: "GIF", Icon: FilmIcon }, className: "left-[max(2rem,calc(50%-30rem))] top-[14.5rem] rotate-6", delay: "-2s" },
  { platform: "tiktok", className: "left-[max(1.5rem,calc(50%-33rem))] top-[19rem] rotate-6", delay: "-4s" },
  { chip: { label: "JPG", Icon: ImageIcon }, className: "left-[max(2.5rem,calc(50%-30.5rem))] top-[24rem] -rotate-3", delay: "-2.5s" },
  { platform: "facebook", className: "right-[max(1rem,calc(50%-32.5rem))] top-[8.5rem] rotate-12", delay: "-1s" },
  { chip: { label: "MP3", Icon: MusicIcon }, className: "right-[max(2rem,calc(50%-30rem))] top-[14rem] -rotate-6", delay: "-3s" },
  { platform: "snapchat", className: "right-[max(1.5rem,calc(50%-33rem))] top-[18.5rem] -rotate-6", delay: "-5s" },
  { platform: "pinterest", className: "right-[max(3rem,calc(50%-30.5rem))] top-[24rem] rotate-3", delay: "-1.5s" },
];

export function Hero({ title, highlight, subtitle, placeholder, platform }: Props) {
  return (
    <section className="relative isolate overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[46rem]">
        <div className="dot-grid absolute inset-0" />
        <div className="hero-glow absolute inset-0" />
        {FLOATERS.map(({ platform: p, chip, className, delay }) => (
          <div key={p ?? chip!.label} className={`absolute hidden lg:block ${className}`}>
            <div className="float" style={{ animationDelay: delay }}>
              {p ? (
                <PlatformIcon platform={p} size={52} className="size-13 rounded-2xl shadow-[0_10px_30px_-10px_rgb(0_0_0/0.45)]" />
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-display text-sm font-bold shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]">
                  {chip && <chip.Icon size={15} className="text-muted" />}
                  {chip!.label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-4 pt-8 text-center sm:pt-20">
        {/* Narrow screens have no gutters for the floaters, so the tiles line up above the title instead. */}
        <div aria-hidden className="mb-5 flex justify-center gap-2.5 lg:hidden">
          {PLATFORMS.map((p, i) => (
            <div key={p} className="float" style={{ animationDelay: `${-i * 0.6}s`, animationDuration: "3.5s" }}>
              <PlatformIcon platform={p} size={34} className={`size-[34px] rounded-[10px] shadow-[0_8px_20px_-10px_rgb(0_0_0/0.5)] ${i % 2 ? "rotate-6" : "-rotate-6"}`} />
            </div>
          ))}
        </div>
        <h1 className="mx-auto max-w-3xl font-display text-[2.4rem] font-bold leading-[1.08] sm:text-[3.4rem]">
          {title}
          {highlight && (
            <>
              {" "}
              <span className="marker">{highlight}</span>
            </>
          )}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">{subtitle}</p>
        <div className="mx-auto mt-8 max-w-3xl text-left">
          <Downloader placeholder={placeholder} platform={platform} />
        </div>
      </div>

      <div aria-hidden className="marquee mx-auto mt-6 max-w-5xl overflow-hidden">
        <div className="marquee-track flex w-max gap-3">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-3 whitespace-nowrap font-display text-sm font-bold text-muted"
            >
              {item}
              <span className="size-1.5 rounded-full bg-accent" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
