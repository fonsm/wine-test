// Hand-built file headers for unit tests. They contain just enough bytes for
// type sniffing and dimension parsing; they are not complete, decodable images.

const ascii = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0));
const u16be = (value: number): number[] => [(value >> 8) & 0xff, value & 0xff];
const u16le = (value: number): number[] => [value & 0xff, (value >> 8) & 0xff];
const u24le = (value: number): number[] => [
  value & 0xff,
  (value >> 8) & 0xff,
  (value >> 16) & 0xff,
];
const u32be = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function pngHeader(width: number, height: number): Uint8Array {
  return new Uint8Array([
    ...PNG_SIGNATURE,
    ...u32be(13),
    ...ascii('IHDR'),
    ...u32be(width),
    ...u32be(height),
    8, // bit depth
    6, // colour type RGBA
    0,
    0,
    0,
    ...u32be(0), // CRC (not checked by the parser)
  ]);
}

export function jpegHeader(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff,
    0xd8, // SOI
    0xff,
    0xe0, // APP0 (JFIF)
    ...u16be(16),
    ...ascii('JFIF'),
    0,
    1,
    1,
    0,
    ...u16be(1),
    ...u16be(1),
    0,
    0,
    0xff,
    0xc0, // SOF0
    ...u16be(17),
    8,
    ...u16be(height),
    ...u16be(width),
    3,
    1,
    0x22,
    0,
    2,
    0x11,
    1,
    3,
    0x11,
    1,
  ]);
}

function riffWebp(chunk: string, data: number[]): Uint8Array {
  return new Uint8Array([
    ...ascii('RIFF'),
    ...u32be(0).reverse(), // file size (not checked by the parser)
    ...ascii('WEBP'),
    ...ascii(chunk),
    ...u32be(data.length).reverse(),
    ...data,
  ]);
}

export function webpLossyHeader(width: number, height: number): Uint8Array {
  return riffWebp('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, ...u16le(width), ...u16le(height)]);
}

export function webpLosslessHeader(width: number, height: number): Uint8Array {
  const bits = (width - 1) | ((height - 1) << 14);
  return riffWebp('VP8L', [
    0x2f,
    bits & 0xff,
    (bits >>> 8) & 0xff,
    (bits >>> 16) & 0xff,
    (bits >>> 24) & 0xff,
  ]);
}

export function webpExtendedHeader(width: number, height: number): Uint8Array {
  return riffWebp('VP8X', [0, 0, 0, 0, ...u24le(width - 1), ...u24le(height - 1)]);
}

export const SVG_BYTES = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
);

export const GIF_BYTES = new Uint8Array([...ascii('GIF89a'), 1, 0, 1, 0, 0, 0, 0]);
