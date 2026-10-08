import type { CSSProperties } from "react";
import type { PlatformId } from "@/lib/platforms";
import { DemoVideo } from "./DemoVideo";
import { ArrowIcon, CheckIcon, LinkIcon, PlatformIcon } from "./icons";

/** Frames in /demo/tram-strip.jpg, one row, evenly spaced through the clip. */
const STRIP_FRAMES = 8;

const CAPTIONS = ["Paste a link", "Trim to the moment", "Crop for your feed", "Pick a format", "Save it to your phone"];
const FORMATS = ["MP4", "GIF", "MP3", "JPG"];
/** Format chip width plus the gap after it, in px; the selection ring moves by this much. */
const CHIP_STEP = 54;
const APPS: PlatformId[] = ["instagram", "tiktok", "facebook", "snapchat", "pinterest"];

/**
 * The yellow band under the hero: what the tool is for in one line, next to a phone that
 * plays the whole flow on a loop (see the demo timeline in globals.css). The phone is
 * drawn in light colours in both themes, like a real screenshot would be.
 */
export function Showcase() {
  return (
    <section aria-labelledby="showcase-heading" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
      <div className="grid items-center gap-12 overflow-hidden rounded-[2.5rem] bg-accent px-7 pb-0 pt-12 text-accent-ink sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:py-14">
        <div>
          <h2 id="showcase-heading" className="font-display text-[2.2rem] font-extrabold leading-[1.05] sm:text-[3.25rem]">
            Every video has a best part. Keep just that.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-accent-ink/80">
            Drag the handles to the moment you want, crop it for your story or feed, and save it as a video, a GIF, the
            sound, or a single frame.
          </p>
          <a
            href="#media-url"
            className="mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-accent-ink px-7 text-base font-bold text-white transition hover:opacity-90"
          >
            Try it with a link <ArrowIcon size={18} />
          </a>
        </div>
        <Phone />
      </div>
    </section>
  );
}

function Phone() {
  return (
    <div aria-hidden className="demo relative mx-auto mt-6 w-[17rem] select-none lg:mb-[-3.5rem] lg:mt-10">
      {/* The scene's name, above the phone. */}
      <div className="absolute -top-12 left-1/2 grid -translate-x-1/2 justify-items-center">
        {CAPTIONS.map((caption, i) => (
          <span
            key={caption}
            className="col-start-1 row-start-1 flex items-center gap-2 whitespace-nowrap rounded-full bg-white py-1.5 pl-1.5 pr-3.5 text-[13px] font-bold text-[#1d1b16] shadow-[0_6px_16px_-8px_rgb(0_0_0/0.3)]"
            style={{ opacity: `var(--demo-c${i + 1})`, translate: `0 calc((1 - var(--demo-c${i + 1})) * 6px)` }}
          >
            <span className="grid size-6 place-items-center rounded-full bg-[#1d1b16] text-[11px] text-white">{i + 1}</span>
            {caption}
          </span>
        ))}
      </div>

      <div className="rounded-t-[2.75rem] bg-[#1d1b16] p-2.5 pb-0 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)] lg:rounded-[2.75rem] lg:pb-2.5">
        <div className="relative overflow-hidden rounded-t-[2.25rem] bg-white pb-5 text-[#1d1b16] lg:rounded-[2.25rem]">
          <PasteScreen />

          <div className="flex items-center justify-between px-5 pt-4 text-[13px] font-extrabold">
            <span>Yoinkit</span>
            <span className="rounded-full bg-[#f8f5ee] px-2.5 py-1 text-[11px] font-bold">Instagram</span>
          </div>

          {/* The clip, with the square crop closing in. */}
          <div className="relative mx-3 mt-3 aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-[#d9e4ea]">
            <DemoVideo src="/demo/tram.mp4" poster="/demo/tram.jpg" className="size-full object-cover" />
            <span className="absolute inset-x-0 top-0 bg-black/50" style={{ height: "calc(var(--demo-crop) * 10%)" }} />
            <span className="absolute inset-x-0 bottom-0 bg-black/50" style={{ height: "calc(var(--demo-crop) * 10%)" }} />
            <span className="absolute inset-x-1 bottom-[10%] top-[10%] rounded-md border-2 border-white" style={{ opacity: "var(--demo-crop)" }} />
            <span
              className="absolute left-3 top-[calc(10%+0.5rem)] rounded-full bg-white px-2 py-0.5 text-[11px] font-bold"
              style={{ opacity: "var(--demo-crop)" }}
            >
              Crop · 1:1
            </span>
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">0:10</span>
          </div>

          {/* Filmstrip with the kept part selected; the handles and times follow the demo. */}
          <div className="relative mx-3 mt-3 flex h-10 overflow-hidden rounded-xl">
            {Array.from({ length: STRIP_FRAMES }, (_, i) => (
              <span
                key={i}
                className="h-full flex-1"
                style={{
                  backgroundImage: "url(/demo/tram-strip.jpg)",
                  backgroundSize: `${STRIP_FRAMES * 100}% 100%`,
                  backgroundPosition: `${(i / (STRIP_FRAMES - 1)) * 100}% 0`,
                }}
              />
            ))}
            <span className="absolute inset-y-0 left-0 bg-white/65" style={{ width: "var(--demo-l)" }} />
            <span className="absolute inset-y-0 right-0 bg-white/65" style={{ width: "var(--demo-r)" }} />
            <span className="absolute inset-y-0 rounded-lg border-[3px] border-[#ffc83d]" style={{ left: "var(--demo-l)", right: "var(--demo-r)" }} />
            <span className="absolute inset-y-0 w-2 -translate-x-1/2 rounded-full bg-[#1d1b16]" style={{ left: "max(4px, var(--demo-l))" }} />
            <span className="absolute inset-y-0 w-2 translate-x-1/2 rounded-full bg-[#1d1b16]" style={{ right: "max(4px, var(--demo-r))" }} />
            <Finger at="var(--demo-tap-l)" style={{ left: "max(13px, var(--demo-l))" }} />
            <Finger at="var(--demo-tap-r)" className="translate-x-1/2" style={{ right: "max(13px, var(--demo-r))" }} />
          </div>
          <div className="mx-4 mt-2 flex justify-between text-[11px] font-semibold tabular-nums text-[#6b665c]">
            <span>
              Starts <span className="demo-start" />
            </span>
            <span>
              Ends <span className="demo-end" />
            </span>
          </div>

          {/* Formats: a ring that hops between them. */}
          <div className="relative mx-3 mt-3 flex gap-1.5">
            {FORMATS.map((format) => (
              <span key={format} className="grid h-7 w-12 place-items-center rounded-full bg-[#f8f5ee] text-[11px] font-bold">
                {format}
              </span>
            ))}
            <span
              className="absolute left-0 top-0 h-7 w-12 rounded-full border-2 border-[#1d1b16]"
              style={{ translate: `calc(var(--demo-chip) * ${CHIP_STEP}px) 0` }}
            />
            <Finger at="var(--demo-tap-chip)" style={{ left: `calc(var(--demo-chip) * ${CHIP_STEP}px + 24px)` }} />
          </div>

          <div
            className="relative mx-3 mt-3 overflow-hidden rounded-full bg-[#1d1b16] py-2.5 text-center text-[13px] font-bold text-white"
            style={{ scale: "var(--demo-press)" }}
          >
            {/* The label under the sweep says "Saving…" too, so the reveal lines up. */}
            <span className="grid">
              <span className="col-start-1 row-start-1" style={{ opacity: "calc(1 - var(--demo-busy))" }}>
                Save <span className="demo-len" /> seconds
              </span>
              <span className="col-start-1 row-start-1" style={{ opacity: "var(--demo-busy)" }}>
                Saving…
              </span>
            </span>
            {/* Saving sweeps in from the left, then turns into "saved". */}
            <span
              className="absolute inset-0 grid place-items-center bg-[#ffc83d] text-[#1d1b16]"
              style={{ clipPath: "inset(0 calc(100% - var(--demo-fill)) 0 0)" }}
            >
              <span className="col-start-1 row-start-1" style={{ opacity: "calc(1 - var(--demo-saved))" }}>
                Saving…
              </span>
              <span className="col-start-1 row-start-1 flex items-center gap-1.5" style={{ opacity: "var(--demo-saved)" }}>
                <CheckIcon size={14} /> Saved to your phone
              </span>
            </span>
            <Finger at="var(--demo-tap-save)" style={{ left: "50%" }} />
          </div>
        </div>
      </div>

      <div
        // Over the top of the phone on narrow screens; hanging off its left edge where there's room.
        className="absolute left-1/2 top-[13%] flex -translate-x-1/2 -rotate-3 items-center gap-2.5 whitespace-nowrap rounded-2xl bg-white py-2.5 pl-2.5 pr-4 text-[#1d1b16] shadow-[0_16px_40px_-16px_rgb(0_0_0/0.35)] sm:-left-16 sm:top-[56%] sm:translate-x-0"
        style={{
          opacity: "var(--demo-toast)",
          transform: "translateY(calc((1 - var(--demo-toast)) * 12px)) scale(calc(0.92 + 0.08 * var(--demo-toast)))",
        }}
      >
        <span className="grid size-8 place-items-center rounded-full bg-[#ffc83d]">
          <CheckIcon size={16} />
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-extrabold">Saved · 2.1 MB</span>
          <span className="block text-[11px] text-[#6b665c]">Just the part you wanted</span>
        </span>
      </div>
    </div>
  );
}

/** Scene 1, laid over the result screen: the link box with a link typing itself in. */
function PasteScreen() {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col bg-white px-4 pt-4"
      style={{ opacity: "var(--demo-a)", translate: "0 calc((1 - var(--demo-a)) * -10px)" }}
    >
      <div className="flex items-center gap-1.5 text-[13px] font-extrabold">
        <span className="size-4 rounded-[5px] bg-[#ffc83d]" />
        Yoinkit
      </div>
      <div className="mt-12 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ebe5d8] py-0.5 pl-0.5 pr-2.5 text-[10px]">
          <span className="rounded-full bg-[#ffc83d] px-1.5 py-px text-[9px] font-medium">Free</span>
          <em>No sign-up</em>
        </span>
        <p className="mt-3 text-[25px] font-extrabold leading-[1.05] tracking-tight">Get exactly the part you want</p>
      </div>
      <div className="mt-7 flex h-11 items-center gap-2 rounded-full border-2 border-[#ebe5d8] px-3.5 text-[12px] font-semibold">
        <LinkIcon size={14} className="shrink-0 text-[#6b665c]" />
        <span className="min-w-0 overflow-hidden whitespace-nowrap" style={{ clipPath: "inset(0 calc(100% - var(--demo-type)) 0 0)" }}>
          instagram.com/reel/tram-ride
        </span>
      </div>
      <div
        className="relative mt-2.5 flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#1d1b16] text-[13px] font-bold text-white"
        style={{ scale: "var(--demo-go-press)" }}
      >
        Yoink it <ArrowIcon size={14} />
        <Finger at="var(--demo-tap-go)" style={{ left: "50%" }} />
      </div>
      <div className="mt-5 flex justify-center gap-1.5">
        {APPS.map((app) => (
          <PlatformIcon key={app} platform={app} size={22} className="size-[22px] rounded-md" />
        ))}
      </div>
    </div>
  );
}

/** A fingertip on the screen, centred on the point it presses; `at` (0–1) fades and grows it in. */
function Finger({ at, className = "-translate-x-1/2", style }: { at: string; className?: string; style: CSSProperties }) {
  return (
    <span
      className={`absolute top-1/2 size-[26px] -translate-y-1/2 rounded-full border-2 border-white bg-[#1d1b16]/30 shadow-[0_2px_8px_rgb(0_0_0/0.25)] ${className}`}
      style={{ opacity: at, scale: `calc(0.6 + 0.4 * ${at})`, ...style }}
    />
  );
}
