import type { PlatformId } from "@/lib/platforms";
import { Downloader } from "./Downloader";
import { PlatformIcon } from "./icons";

interface Props {
  title: string;
  /** Rest of the headline, after the title. */
  highlight?: string;
  subtitle: string;
  placeholder?: string;
  platform?: PlatformId;
}

const PLATFORMS: PlatformId[] = ["instagram", "tiktok", "facebook", "snapchat", "pinterest"];

export function Hero({ title, highlight, subtitle, placeholder, platform }: Props) {
  return (
    <section className="mx-auto max-w-3xl px-4 pb-2 pt-10 text-center sm:px-6 sm:pt-16">
      <p className="inline-flex rounded-full bg-accent-soft px-4 py-1.5 text-sm font-bold">Free · No sign-up · Made for your phone</p>
      <h1 className="mx-auto mt-5 font-display text-[2.6rem] font-extrabold leading-[1.04] sm:text-[4.25rem]">
        {highlight ? `${title} ${highlight}` : title}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">{subtitle}</p>
      <div className="mt-9 text-left">
        <Downloader placeholder={placeholder} platform={platform} />
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-sm font-semibold text-muted">
        Works with
        <span className="sr-only">Instagram, TikTok, Facebook, Snapchat and Pinterest</span>
        <span className="flex gap-1.5" aria-hidden>
          {PLATFORMS.map((p) => (
            <PlatformIcon key={p} platform={p} size={26} className="size-[26px] rounded-lg" />
          ))}
        </span>
      </div>
    </section>
  );
}
