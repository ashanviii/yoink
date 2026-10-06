import { crc32 as nodeCrc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { crc32, zipBlob } from "../zip";

/** Reads entries back via the central directory, the way unzip tools do. */
function readZip(zip: Buffer): { name: string; data: Buffer }[] {
  const end = zip.length - 22;
  expect(zip.readUInt32LE(end)).toBe(0x06054b50);
  const count = zip.readUInt16LE(end + 10);
  let cursor = zip.readUInt32LE(end + 16);

  const entries = [];
  for (let i = 0; i < count; i++) {
    expect(zip.readUInt32LE(cursor)).toBe(0x02014b50);
    const crc = zip.readUInt32LE(cursor + 16);
    const size = zip.readUInt32LE(cursor + 24);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const local = zip.readUInt32LE(cursor + 42);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");

    expect(zip.readUInt32LE(local)).toBe(0x04034b50);
    const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(dataStart, dataStart + size);
    expect(nodeCrc32(data)).toBe(crc);

    entries.push({ name, data });
    cursor += 46 + nameLength;
  }
  return entries;
}

const bytes = async (blob: Blob) => Buffer.from(await blob.arrayBuffer());

describe("zipBlob", () => {
  it("stores every file intact, in order, with valid checksums", async () => {
    const files = [
      { name: "frame-001_0.00s.jpg", data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]) },
      { name: "frame-002_1.00s.jpg", data: new Uint8Array(70_000).fill(7) },
      { name: "émoji-✓.png", data: new TextEncoder().encode("not really a png") },
    ];

    const entries = readZip(await bytes(zipBlob(files)));
    expect(entries.map((e) => e.name)).toEqual(files.map((f) => f.name));
    entries.forEach((entry, i) => expect(entry.data.equals(Buffer.from(files[i].data))).toBe(true));
  });

  it("writes a valid empty archive", async () => {
    expect(readZip(await bytes(zipBlob([])))).toEqual([]);
  });

  it("computes the same CRC-32 as zlib", () => {
    const data = new TextEncoder().encode("The quick brown fox jumps over the lazy dog");
    expect(crc32(data)).toBe(nodeCrc32(data));
    expect(crc32(new Uint8Array())).toBe(0);
  });
});
