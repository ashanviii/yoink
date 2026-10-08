"use client";

import { useEffect, useRef } from "react";

/**
 * The showcase clip. It sits below the fold, so nothing downloads until it nears the
 * screen; it plays only while visible, and stays on its poster for reduced motion.
 */
export function DemoVideo({ src, poster, className }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.getAttribute("src")) video.src = src;
          video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      // Only once it's properly on screen, so it never competes with the page's own first load.
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  return <video ref={ref} poster={poster} muted loop playsInline preload="none" disablePictureInPicture className={className} />;
}
