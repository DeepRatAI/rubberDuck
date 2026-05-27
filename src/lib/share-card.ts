import { brand } from "./brand";
import type { ProjectSignalMetadata } from "./project-signals";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function textLines(value: string, maxChars: number, maxLines: number) {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function pill(label: string, x: number, y: number, color: string) {
  const width = Math.max(92, label.length * 13 + 34);
  return `
    <rect x="${x}" y="${y}" width="${width}" height="42" rx="21" fill="${color}" opacity="0.95" />
    <text x="${x + 17}" y="${y + 27}" font-size="18" font-weight="700" fill="#102A43">${escapeXml(label)}</text>
  `;
}

export function buildProjectSignalShareSvg(input: {
  title: string;
  authorName: string;
  projectSignal: ProjectSignalMetadata;
}) {
  const titleLines = textLines(input.title, 34, 3);
  const descriptionLines = textLines(input.projectSignal.description, 62, 2);
  const stack = input.projectSignal.stack.slice(0, 3);
  const needs = input.projectSignal.needs.slice(0, 3);
  const repoLabel = `${input.projectSignal.owner}/${input.projectSignal.name}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(input.title)}">
  <rect width="1200" height="630" fill="#fcfcff"/>
  <rect x="42" y="42" width="1116" height="546" rx="34" fill="#FFF8E7" stroke="#102A43" stroke-opacity="0.18" stroke-width="2"/>
  <circle cx="1014" cy="156" r="108" fill="#FFD447" opacity="0.88"/>
  <circle cx="1084" cy="210" r="52" fill="#FF9F1C" opacity="0.92"/>
  <path d="M910 495 C1004 452 1068 469 1128 510" fill="none" stroke="#102A43" stroke-opacity="0.18" stroke-width="18" stroke-linecap="round"/>
  <text x="86" y="104" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="800" fill="#102A43">${brand.productName} · Project Signal</text>
  <text x="86" y="151" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#FF9F1C">${escapeXml(truncate(repoLabel, 46))}</text>
  ${titleLines
    .map(
      (line, index) =>
        `<text x="86" y="${232 + index * 64}" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="900" fill="#102A43">${escapeXml(line)}</text>`,
    )
    .join("")}
  ${descriptionLines
    .map(
      (line, index) =>
        `<text x="90" y="${428 + index * 35}" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="600" fill="#335C7B">${escapeXml(line)}</text>`,
    )
    .join("")}
  <text x="90" y="525" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="#102A43">By ${escapeXml(input.authorName)} · ${escapeXml(input.projectSignal.maturity)} · ${escapeXml(input.projectSignal.intent)}</text>
  ${[...stack, ...needs]
    .slice(0, 5)
    .map((label, index) =>
      pill(
        label,
        86 + index * 178,
        548,
        index % 2 === 0 ? "#FFD447" : "#BFE8FF",
      ),
    )
    .join("")}
</svg>`;
}
