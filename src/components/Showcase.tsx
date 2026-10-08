import type { CSSProperties } from "react";
import { ArrowIcon, CheckIcon, PlayIcon } from "./icons";

/** Tones of the made-up clip in the phone, frame by frame along the filmstrip. */
const FRAMES = ["#f6c177", "#f2a65a", "#ee8f4f", "#e9784a", "#d9654a", "#c4574c", "#a94f52", "#8c4a57"];

/**
 * The yellow band under the hero: what the tool is for in one line, next to a phone
 * showing a trimmed clip about to be saved. The phone is drawn in light colours in both
 * themes, like a real screenshot would be.
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
    <div aria-hidden className="demo relative mx-auto w-[17rem] select-none lg:mb-[-3.5rem] lg:mt-0">
      <div className="rounded-t-[2.75rem] bg-[#1d1b16] p-2.5 pb-0 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)] lg:rounded-[2.75rem] lg:pb-2.5">
        <div className="overflow-hidden rounded-t-[2.25rem] bg-white pb-5 text-[#1d1b16] lg:rounded-[2.25rem]">
          <div className="flex items-center justify-between px-5 pt-4 text-[13px] font-extrabold">
            <span>Yoinkit</span>
            <span className="rounded-full bg-[#f8f5ee] px-2.5 py-1 text-[11px] font-bold">Instagram</span>
          </div>

          {/* The clip: a sunset over hills, in flat shapes. */}
          <div className="relative mx-3 mt-3 aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-[#ffd98a]">
            <div className="absolute left-1/2 top-[22%] size-24 -translate-x-1/2 rounded-full bg-[#fff1c9]" />
            <div className="absolute -left-10 bottom-0 h-1/2 w-3/4 rounded-t-full bg-[#f2a65a]" />
            <div className="absolute -right-12 bottom-0 h-[42%] w-3/4 rounded-t-full bg-[#e9784a]" />
            <div className="absolute inset-x-0 bottom-0 h-[18%] bg-[#c4574c]" />
            <span className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90">
              <PlayIcon size={20} />
            </span>
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">0:14</span>
          </div>

          {/* Filmstrip with the kept part selected; the handles and times follow the demo. */}
          <div className="relative mx-3 mt-3 flex h-10 overflow-hidden rounded-xl">
            {FRAMES.map((tone) => (
              <span key={tone} className="h-full flex-1" style={{ background: tone }} />
            ))}
            <span className="absolute inset-y-0 left-0 bg-white/65" style={{ width: "var(--demo-l)" }} />
            <span className="absolute inset-y-0 right-0 bg-white/65" style={{ width: "var(--demo-r)" }} />
            <span
              className="absolute inset-y-0 rounded-lg border-[3px] border-[#ffc83d]"
              style={{ left: "var(--demo-l)", right: "var(--demo-r)" }}
            />
            <span className="absolute inset-y-0 w-2 -translate-x-1/2 rounded-full bg-[#1d1b16]" style={{ left: "max(4px, var(--demo-l))" }} />
            <span className="absolute inset-y-0 w-2 translate-x-1/2 rounded-full bg-[#1d1b16]" style={{ right: "max(4px, var(--demo-r))" }} />
            <Finger style={{ left: "max(13px, var(--demo-l))", opacity: "var(--demo-tap-l)", scale: "calc(0.6 + 0.4 * var(--demo-tap-l))" }} />
            <Finger
              className="translate-x-1/2"
              style={{ right: "max(13px, var(--demo-r))", opacity: "var(--demo-tap-r)", scale: "calc(0.6 + 0.4 * var(--demo-tap-r))" }}
            />
          </div>
          <div className="mx-4 mt-2 flex justify-between text-[11px] font-semibold tabular-nums text-[#6b665c]">
            <span>
              Starts <span className="demo-start" />
            </span>
            <span>
              Ends <span className="demo-end" />
            </span>
          </div>

          <div className="mx-3 mt-3 flex gap-1.5">
            {["MP4", "GIF", "MP3"].map((format, i) => (
              <span
                key={format}
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${i === 0 ? "bg-[#1d1b16] text-white" : "bg-[#f8f5ee]"}`}
              >
                {format}
              </span>
            ))}
          </div>
          <div
            className="relative mx-3 mt-3 overflow-hidden rounded-full bg-[#1d1b16] py-2.5 text-center text-[13px] font-bold text-white"
            style={{ scale: "var(--demo-press)" }}
          >
            {/* The label under the sweep says "Saving…" too, so the reveal lines up. */}
            <span className="grid">
              <span className="col-start-1 row-start-1" style={{ opacity: "calc(1 - var(--demo-busy))" }}>
                Save <span className="demo-len" /> seconds · MP4
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
            <Finger style={{ left: "50%", opacity: "var(--demo-tap-save)", scale: "calc(0.6 + 0.4 * var(--demo-tap-save))" }} />
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
          <span className="block text-[13px] font-extrabold">Saved · 2.5 MB</span>
          <span className="block text-[11px] text-[#6b665c]">Just the part you wanted</span>
        </span>
      </div>
    </div>
  );
}

/** A fingertip on the screen, centred on the point it presses. */
function Finger({ className = "-translate-x-1/2", style }: { className?: string; style: CSSProperties }) {
  return (
    <span
      className={`absolute top-1/2 size-[26px] -translate-y-1/2 rounded-full border-2 border-white bg-[#1d1b16]/30 shadow-[0_2px_8px_rgb(0_0_0/0.25)] ${className}`}
      style={style}
    />
  );
}
