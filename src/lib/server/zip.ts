import "server-only";
import { open, readFile } from "node:fs/promises";
import { crc32 } from "node:zlib";

export interface ZipEntry {
  /** Name inside the archive. */
  name: string;
  /** File on disk to store. */
  path: string;
}

const UTF8_FLAG = 0x0800;
const VERSION = 20;

function dosDateTime(date: Date): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/**
 * Writes an uncompressed ("stored") ZIP. Images are already compressed, so
 * deflate would only cost CPU. Entries are read one at a time to bound memory.
 * No ZIP64: callers keep archives well under 4 GB / 65k entries.
 */
export async function writeZip(outPath: string, entries: readonly ZipEntry[]): Promise<void> {
  const stamp = dosDateTime(new Date());
  const central: Buffer[] = [];
  const out = await open(outPath, "w");
  let offset = 0;

  try {
    for (const entry of entries) {
      const data = await readFile(entry.path);
      const name = Buffer.from(entry.name, "utf8");
      const crc = crc32(data);

      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(VERSION, 4);
      local.writeUInt16LE(UTF8_FLAG, 6);
      local.writeUInt16LE(0, 8); // method: store
      local.writeUInt16LE(stamp.time, 10);
      local.writeUInt16LE(stamp.date, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(data.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(name.length, 26);
      local.writeUInt16LE(0, 28);
      await out.write(Buffer.concat([local, name, data]));

      const header = Buffer.alloc(46);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE(VERSION, 4);
      header.writeUInt16LE(VERSION, 6);
      header.writeUInt16LE(UTF8_FLAG, 8);
      header.writeUInt16LE(0, 10);
      header.writeUInt16LE(stamp.time, 12);
      header.writeUInt16LE(stamp.date, 14);
      header.writeUInt32LE(crc, 16);
      header.writeUInt32LE(data.length, 20);
      header.writeUInt32LE(data.length, 24);
      header.writeUInt16LE(name.length, 28);
      // extra length, comment length, disk number, internal + external attrs: all zero
      header.writeUInt32LE(offset, 42);
      central.push(header, name);

      offset += local.length + name.length + data.length;
    }

    const directory = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(offset, 16);
    await out.write(Buffer.concat([directory, end]));
  } finally {
    await out.close();
  }
}
