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
    <div aria-hidden className="relative mx-auto w-[17rem] select-none lg:mb-[-3.5rem] lg:mt-0">
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

          {/* Filmstrip with the kept part selected. */}
          <div className="relative mx-3 mt-3 flex h-10 overflow-hidden rounded-xl">
            {FRAMES.map((tone) => (
              <span key={tone} className="h-full flex-1" style={{ background: tone }} />
            ))}
            <span className="absolute inset-y-0 left-0 w-[25%] bg-white/65" />
            <span className="absolute inset-y-0 right-0 w-[22%] bg-white/65" />
            <span className="absolute inset-y-0 left-[25%] right-[22%] rounded-lg border-[3px] border-[#ffc83d]" />
            <span className="absolute inset-y-0 left-[25%] w-2 -translate-x-1/2 rounded-full bg-[#1d1b16]" />
            <span className="absolute inset-y-0 right-[22%] w-2 translate-x-1/2 rounded-full bg-[#1d1b16]" />
          </div>
          <div className="mx-4 mt-2 flex justify-between text-[11px] font-semibold text-[#6b665c]">
            <span>Starts 0:04</span>
            <span>Ends 0:11</span>
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
          <div className="mx-3 mt-3 rounded-full bg-[#1d1b16] py-2.5 text-center text-[13px] font-bold text-white">Save 7 seconds · MP4</div>
        </div>
      </div>

      <div className="absolute -left-16 top-[56%] hidden -rotate-3 items-center gap-2.5 rounded-2xl bg-white py-2.5 pl-2.5 pr-4 text-[#1d1b16] shadow-[0_16px_40px_-16px_rgb(0_0_0/0.35)] sm:flex">
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
