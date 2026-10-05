import { describe, expect, it } from "vitest";
import { parseMediaUrl } from "../url";

function ok(input: string) {
  const result = parseMediaUrl(input);
  if (!result.ok) throw new Error(`expected ok for ${input}, got ${result.reason}`);
  return result.value;
}

function reason(input: string) {
  const result = parseMediaUrl(input);
  return result.ok ? "ok" : result.reason;
}

describe("parseMediaUrl", () => {
  it("handles Instagram reels, posts and stories", () => {
    expect(ok("https://www.instagram.com/reel/Chunk8-jurw/?igsh=MWQ1").url).toBe("https://www.instagram.com/reel/Chunk8-jurw/");
    expect(ok("https://instagram.com/reels/Chunk8-jurw").kind).toBe("reel");
    expect(ok("https://www.instagram.com/someuser/reel/Chunk8-jurw/").url).toBe("https://www.instagram.com/reel/Chunk8-jurw/");
    expect(ok("https://www.instagram.com/p/aye83DjauH/").kind).toBe("post");
    expect(ok("https://www.instagram.com/tv/aye83DjauH/").url).toBe("https://www.instagram.com/p/aye83DjauH/");
    expect(ok("https://www.instagram.com/stories/natgeo/3123456789012345678/?utm_source=ig")).toEqual({
      platform: "instagram",
      kind: "story",
      url: "https://www.instagram.com/stories/natgeo/3123456789012345678/",
    });
    expect(ok("https://www.instagram.com/stories/highlights/17912345678901234/").kind).toBe("story");
    expect(reason("https://www.instagram.com/natgeo/")).toBe("unsupported-content");
  });

  it("handles TikTok long and short links", () => {
    expect(ok("https://www.tiktok.com/@scout2015/video/6718335390845095173?is_from_webapp=1").url).toBe(
      "https://www.tiktok.com/@scout2015/video/6718335390845095173",
    );
    expect(ok("https://vm.tiktok.com/ZMabc123/").url).toBe("https://vm.tiktok.com/ZMabc123/");
    expect(ok("https://www.tiktok.com/t/ZTRabc123/").url).toBe("https://www.tiktok.com/t/ZTRabc123/");
    expect(reason("https://www.tiktok.com/@scout2015")).toBe("unsupported-content");
  });

  it("handles Pinterest pins and pin.it", () => {
    expect(ok("https://www.pinterest.com/pin/664281013778109217/").url).toBe("https://www.pinterest.com/pin/664281013778109217/");
    expect(ok("https://pinterest.co.uk/pin/some-title--664281013778109217/").url).toBe(
      "https://www.pinterest.com/pin/664281013778109217/",
    );
    expect(ok("https://pin.it/4abcDEF").url).toBe("https://pin.it/4abcDEF");
  });

  it("handles Facebook reels, videos, posts and share links", () => {
    expect(ok("https://www.facebook.com/reel/1195289147628387?mibextid=abc")).toEqual({
      platform: "facebook",
      kind: "reel",
      url: "https://www.facebook.com/reel/1195289147628387",
    });
    expect(ok("https://m.facebook.com/watch/?v=647537299265662&ref=sharing").url).toBe("https://www.facebook.com/watch/?v=647537299265662");
    expect(ok("https://www.facebook.com/video.php?v=637842556329505").url).toBe("https://www.facebook.com/watch/?v=637842556329505");
    expect(ok("https://www.facebook.com/NASA/videos/some-title/10153231379946729/").url).toBe(
      "https://www.facebook.com/watch/?v=10153231379946729",
    );
    expect(ok("https://www.facebook.com/nasa/posts/pfbid02abcDEF123ghiJKL").kind).toBe("post");
    expect(ok("https://fb.watch/aBcD12_x/").url).toBe("https://fb.watch/aBcD12_x/");
    expect(ok("https://www.facebook.com/share/r/1ABcdEFgh2/").kind).toBe("reel");
    expect(reason("https://www.facebook.com/NASA")).toBe("unsupported-content");
    expect(reason("https://www.facebook.com/reel/notanumber")).toBe("unsupported-content");
  });

  it("handles Snapchat Spotlight links", () => {
    const id = "W7_EDlXWTBiXAEEniNoMPwAAYYWtidGhudGZpAX1TKn0JAX1TKnXJAAAAAA";
    expect(ok(`https://www.snapchat.com/spotlight/${id}?share_id=x`)).toEqual({
      platform: "snapchat",
      kind: "video",
      url: `https://www.snapchat.com/spotlight/${id}`,
    });
    expect(ok(`https://www.snapchat.com/@creator/spotlight/${id}`).url).toBe(`https://www.snapchat.com/spotlight/${id}`);
    expect(reason("https://www.snapchat.com/add/someone")).toBe("unsupported-content");
  });

  it("rejects unsupported or dangerous input", () => {
    expect(reason("")).toBe("empty");
    expect(reason("   ")).toBe("empty");
    expect(reason("not a url")).toBe("invalid");
    expect(reason("javascript:alert(1)")).toBe("invalid");
    expect(reason("file:///etc/passwd")).toBe("invalid");
    expect(reason("https://example.com/video.mp4")).toBe("unsupported-site");
    expect(reason("https://facebook.com.evil.com/reel/1195289147628387")).toBe("unsupported-site");
    expect(reason("https://notfacebook.com/reel/1195289147628387")).toBe("unsupported-site");
    expect(reason("https://www.youtube.com/watch?v=jNQXAC9IVRw")).toBe("unsupported-site");
    expect(reason("http://127.0.0.1/video")).toBe("unsupported-site");
  });
});
