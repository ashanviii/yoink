import type { PlatformId } from "@/lib/platforms";
import { Downloader } from "./Downloader";

interface Props {
  title: string;
  subtitle: string;
  placeholder?: string;
  platform?: PlatformId;
}

export function Hero({ title, subtitle, placeholder, platform }: Props) {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-4 pt-10 sm:pt-20">
      <h1 className="max-w-3xl font-display text-[2.4rem] font-bold leading-[1.02] sm:text-[3.4rem]">{title}</h1>
      <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">{subtitle}</p>
      <div className="mt-8 max-w-3xl">
        <Downloader placeholder={placeholder} platform={platform} />
      </div>
    </section>
  );
}
