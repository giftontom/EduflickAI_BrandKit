// zip.mjs — minimal STORE-method ZIP writer (no compression, zero deps).
//
// Bundles a list of { name, data } entries into a single ZIP Buffer. The
// studio's exports are PNGs (already DEFLATE-compressed internally) and short
// text files, so STORE avoids burning CPU re-deflating data that won't shrink.
// No zip64 — callers cap entry count and total bytes well under the 16-bit /
// 4 GiB limits.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Fixed DOS timestamp (1980-01-01 00:00) so identical input → identical bytes.
const DOS_TIME = 0x0000;
const DOS_DATE = 0x0021;

/**
 * @param {Array<{name: string, data: Buffer|Uint8Array|string}>} entries
 * @returns {Buffer} a complete ZIP archive
 */
export function zipStore(entries) {
  const files = entries.map((e) => {
    const name = Buffer.from(e.name, 'utf8');
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data);
    return { name, data, crc: crc32(data) };
  });

  const chunks = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed to extract (2.0)
    local.writeUInt16LE(0x0800, 6); // flags: bit 11 = UTF-8 filename
    local.writeUInt16LE(0, 8); // method: 0 = store
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(f.crc, 14);
    local.writeUInt32LE(f.data.length, 18); // compressed size
    local.writeUInt32LE(f.data.length, 22); // uncompressed size
    local.writeUInt16LE(f.name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    chunks.push(local, f.name, f.data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // central directory header signature
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0x0800, 8); // flags
    cd.writeUInt16LE(0, 10); // method
    cd.writeUInt16LE(DOS_TIME, 12);
    cd.writeUInt16LE(DOS_DATE, 14);
    cd.writeUInt32LE(f.crc, 16);
    cd.writeUInt32LE(f.data.length, 20);
    cd.writeUInt32LE(f.data.length, 24);
    cd.writeUInt16LE(f.name.length, 28);
    cd.writeUInt16LE(0, 30); // extra length
    cd.writeUInt16LE(0, 32); // comment length
    cd.writeUInt16LE(0, 34); // disk number start
    cd.writeUInt16LE(0, 36); // internal attributes
    cd.writeUInt32LE(0, 38); // external attributes
    cd.writeUInt32LE(offset, 42); // relative offset of local header
    central.push(cd, f.name);

    offset += local.length + f.name.length + f.data.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const c of central) cdSize += c.length;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  end.writeUInt16LE(0, 4); // this disk number
  end.writeUInt16LE(0, 6); // disk with central directory
  end.writeUInt16LE(files.length, 8); // entries on this disk
  end.writeUInt16LE(files.length, 10); // total entries
  end.writeUInt32LE(cdSize, 12);
  end.writeUInt32LE(cdStart, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...chunks, ...central, end]);
}
