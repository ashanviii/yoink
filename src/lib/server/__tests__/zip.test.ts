import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { crc32 } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeZip } from "../zip";

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
    expect(crc32(data)).toBe(crc);

    entries.push({ name, data });
    cursor += 46 + nameLength;
  }
  return entries;
}

describe("writeZip", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "yoink-zip-test-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("stores every file intact, in order, with valid checksums", async () => {
    const files = [
      { name: "frame-001_0.00s.jpg", data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]) },
      { name: "frame-002_1.00s.jpg", data: Buffer.alloc(70_000, 7) },
      { name: "émoji-✓.png", data: Buffer.from("not really a png") },
    ];
    for (const [i, file] of files.entries()) await writeFile(path.join(dir, `${i}`), file.data);

    const out = path.join(dir, "out.zip");
    await writeZip(out, files.map((file, i) => ({ name: file.name, path: path.join(dir, `${i}`) })));

    const entries = readZip(await readFile(out));
    expect(entries.map((e) => e.name)).toEqual(files.map((f) => f.name));
    entries.forEach((entry, i) => expect(entry.data.equals(files[i].data)).toBe(true));
  });

  it("writes a valid empty archive", async () => {
    const out = path.join(dir, "empty.zip");
    await writeZip(out, []);
    expect(readZip(await readFile(out))).toEqual([]);
  });
});
