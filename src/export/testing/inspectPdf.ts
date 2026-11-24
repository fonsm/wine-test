// Test helper: opens a PDF with pdf-lib and replays each page's drawing commands, so tests can
// measure what is really on the page, in millimetres from the top-left corner (like the design).
import { PDFArray, PDFDocument, PDFName, PDFRawStream, type PDFPage } from 'pdf-lib';

const MM_PER_PT = 25.4 / 72;

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m1 applied after m2 (PDF: "cm" multiplies the new matrix onto the current one). */
function multiply(m: Matrix, current: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const [A, B, C, D, E, F] = current;
  return [
    a * A + b * C,
    a * B + b * D,
    c * A + d * C,
    c * B + d * D,
    e * A + f * C + E,
    e * B + f * D + F,
  ];
}

function apply([a, b, c, d, e, f]: Matrix, x: number, y: number): [number, number] {
  return [a * x + c * y + e, b * x + d * y + f];
}

export interface PlacedImage {
  name: string;
  /** Size of the drawn image along its own axes, in mm. */
  widthMm: number;
  heightMm: number;
  /** Centre in mm from the page's top-left corner. */
  centerXMm: number;
  centerYMm: number;
  /** Clockwise rotation in degrees, like the design. */
  rotation: number;
}

export interface PaintedPath {
  /** Points in mm from the top-left corner. */
  points: [number, number][];
  operator: string;
  lineWidthMm: number;
}

export interface InspectedPage {
  widthMm: number;
  heightMm: number;
  images: PlacedImage[];
  paths: PaintedPath[];
  /** Clipping rectangles (re W n), in mm from the top-left corner. */
  clips: { x: number; y: number; width: number; height: number }[];
  /** Raw text strings shown with Tj. */
  texts: string[];
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'));
  return new TextDecoder('latin1').decode(await new Response(stream).arrayBuffer());
}

async function contentOf(page: PDFPage): Promise<string> {
  const contents = page.node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
  const parts: string[] = [];
  for (const ref of streams) {
    const stream = page.doc.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) throw new Error('unexpected content stream');
    const filter = stream.dict.get(PDFName.of('Filter'));
    parts.push(
      filter ? await inflate(stream.contents) : new TextDecoder('latin1').decode(stream.contents),
    );
  }
  return parts.join('\n');
}

function tokenize(content: string): string[] {
  return (
    content.match(/\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|\/[^\s/[\]()<>]+|[^\s/[\]()<>]+|\[|\]/g) ??
    []
  );
}

/** A PDF string operand as text: (literal) or <hex> (pdf-lib writes hex, WinAnsi ≈ Latin-1). */
function decodeString(token: string): string {
  if (token.startsWith('<')) {
    const hex = token.slice(1, -1).replace(/\s/g, '');
    return (hex.match(/../g) ?? []).map((pair) => String.fromCharCode(parseInt(pair, 16))).join('');
  }
  return token.slice(1, -1);
}

export async function inspectPdf(bytes: Uint8Array): Promise<InspectedPage[]> {
  const pdf = await PDFDocument.load(bytes);
  const pages: InspectedPage[] = [];
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const toMm = (x: number, y: number): [number, number] => [
      x * MM_PER_PT,
      (height - y) * MM_PER_PT,
    ];
    const result: InspectedPage = {
      widthMm: width * MM_PER_PT,
      heightMm: height * MM_PER_PT,
      images: [],
      paths: [],
      clips: [],
      texts: [],
    };
    let ctm: Matrix = IDENTITY;
    let lineWidth = 1;
    const stack: { ctm: Matrix; lineWidth: number }[] = [];
    let path: [number, number][] = [];
    let pendingRect: { x: number; y: number; width: number; height: number } | null = null;
    let clipNext = false;
    let lastOperator = '';
    const operands: string[] = [];
    const num = (index: number) => Number(operands[operands.length - index]);

    for (const token of tokenize(await contentOf(page))) {
      if (
        /^[-+.\d]/.test(token) ||
        token.startsWith('/') ||
        token.startsWith('(') ||
        token.startsWith('<') ||
        token === '[' ||
        token === ']'
      ) {
        operands.push(token);
        continue;
      }
      switch (token) {
        case 'q':
          stack.push({ ctm, lineWidth });
          break;
        case 'Q':
          ({ ctm, lineWidth } = stack.pop() ?? { ctm: IDENTITY, lineWidth: 1 });
          break;
        case 'cm':
          ctm = multiply([num(6), num(5), num(4), num(3), num(2), num(1)], ctm);
          break;
        case 'w':
          lineWidth = num(1);
          break;
        case 'm':
          // pdf-lib sometimes moves to the same start twice; a move replaces a move.
          if (lastOperator === 'm') path.pop();
          path.push(toMm(...apply(ctm, num(2), num(1))));
          break;
        case 'l':
          path.push(toMm(...apply(ctm, num(2), num(1))));
          break;
        case 'c':
          path.push(toMm(...apply(ctm, num(2), num(1))));
          break;
        case 're': {
          const [x, y, w, h] = [num(4), num(3), num(2), num(1)];
          const corners: [number, number][] = [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
          ];
          path.push(...corners.map(([px, py]) => toMm(...apply(ctm, px, py))));
          const xs = path.map((point) => point[0]);
          const ys = path.map((point) => point[1]);
          pendingRect = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
          break;
        }
        case 'W':
          clipNext = true;
          break;
        case 'n':
          if (clipNext && pendingRect) result.clips.push(pendingRect);
          clipNext = false;
          pendingRect = null;
          path = [];
          break;
        case 'S':
        case 's':
        case 'f':
        case 'F':
        case 'B':
        case 'b':
        case 'f*':
        case 'B*':
          result.paths.push({
            points: path,
            operator: token,
            lineWidthMm: lineWidth * Math.hypot(ctm[0], ctm[1]) * MM_PER_PT,
          });
          path = [];
          pendingRect = null;
          break;
        case 'Do': {
          const [ox, oy] = apply(ctm, 0, 0);
          const [xx, xy] = apply(ctm, 1, 0);
          const [yx, yy] = apply(ctm, 0, 1);
          const [cx, cy] = apply(ctm, 0.5, 0.5);
          const [centerXMm, centerYMm] = toMm(cx, cy);
          const angle = (Math.atan2(xy - oy, xx - ox) * 180) / Math.PI;
          result.images.push({
            name: operands[operands.length - 1] ?? '',
            widthMm: Math.hypot(xx - ox, xy - oy) * MM_PER_PT,
            heightMm: Math.hypot(yx - ox, yy - oy) * MM_PER_PT,
            centerXMm,
            centerYMm,
            rotation: ((((-angle % 360) + 360) % 360) + 360) % 360,
          });
          break;
        }
        case 'Tj':
          result.texts.push(decodeString(operands[operands.length - 1] ?? ''));
          break;
        default:
          break;
      }
      lastOperator = token;
      operands.length = 0;
    }
    pages.push(result);
  }
  return pages;
}
