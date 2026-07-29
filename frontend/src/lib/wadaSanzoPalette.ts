import type { Section } from "./api";

export interface WadaSanzoColor {
  name: string;
  jpName: string;
  bg: string;
  border: string;
  text: string;
  className: string;
}

/**
 * Curated 10-color palette from Wada Sanzo | A Dictionary of Color Combinations.
 * Optimized for software schedule block legibility (soft background, clear border, dark high-contrast text).
 */
export const WADA_SANZO_PALETTE: WadaSanzoColor[] = [
  {
    name: "Wisteria",
    jpName: "Fuji",
    bg: "#f3effa",
    border: "#d8c7ed",
    text: "#4a2e80",
    className: "bg-[#f3effa] border-[#d8c7ed] text-[#4a2e80]",
  },
  {
    name: "Duck Egg",
    jpName: "Mizugame",
    bg: "#ebf5f3",
    border: "#bce3dd",
    text: "#1d574d",
    className: "bg-[#ebf5f3] border-[#bce3dd] text-[#1d574d]",
  },
  {
    name: "Persimmon",
    jpName: "Kaki",
    bg: "#fcf0eb",
    border: "#f5cca6",
    text: "#823315",
    className: "bg-[#fcf0eb] border-[#f5cca6] text-[#823315]",
  },
  {
    name: "Plum",
    jpName: "Ume",
    bg: "#fbf0f4",
    border: "#f0c4d7",
    text: "#7a244c",
    className: "bg-[#fbf0f4] border-[#f0c4d7] text-[#7a244c]",
  },
  {
    name: "Parchment",
    jpName: "Torinoko",
    bg: "#fcf6e8",
    border: "#f2dfb3",
    text: "#6e4f13",
    className: "bg-[#fcf6e8] border-[#f2dfb3] text-[#6e4f13]",
  },
  {
    name: "Hydrangea",
    jpName: "Ajisai",
    bg: "#eef4fc",
    border: "#c3d9f7",
    text: "#1f487e",
    className: "bg-[#eef4fc] border-[#c3d9f7] text-[#1f487e]",
  },
  {
    name: "Moss",
    jpName: "Koke",
    bg: "#f1f6ec",
    border: "#cadcb9",
    text: "#35561b",
    className: "bg-[#f1f6ec] border-[#cadcb9] text-[#35561b]",
  },
  {
    name: "Slate",
    jpName: "Suzuri",
    bg: "#f0f2f5",
    border: "#c8d0db",
    text: "#2e3b4e",
    className: "bg-[#f0f2f5] border-[#c8d0db] text-[#2e3b4e]",
  },
  {
    name: "Iris",
    jpName: "Ayame",
    bg: "#f1f0fc",
    border: "#cecbfa",
    text: "#383185",
    className: "bg-[#f1f0fc] border-[#cecbfa] text-[#383185]",
  },
  {
    name: "Saffron",
    jpName: "Ukon",
    bg: "#faf6e6",
    border: "#eee1aa",
    text: "#695210",
    className: "bg-[#faf6e6] border-[#eee1aa] text-[#695210]",
  },
];

/**
 * Extracts a normalized course key (e.g. "CS 010A") from a section.
 */
export function getCourseKey(section: Section): string {
  if (section.courseId && typeof section.courseId === "object") {
    const subject = section.courseId.subject || section.subject || "";
    const courseNumber = section.courseId.courseNumber || section.courseNumber || "";
    return `${subject} ${courseNumber}`.trim();
  }
  return `${section.subject || ""} ${section.courseNumber || ""}`.trim();
}

/**
 * Creates a deterministic map from course key to Wada Sanzo color token.
 * Courses in the schedule are sorted alphabetically (e.g. CS 010A, ENGL 001A, MATH 009A),
 * ensuring Course #1 always gets Palette[0], Course #2 gets Palette[1], etc.
 */
export function getCourseColorMap(sections: Section[]): Map<string, WadaSanzoColor> {
  const uniqueCourseKeys = Array.from(
    new Set(sections.map(getCourseKey).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const map = new Map<string, WadaSanzoColor>();
  uniqueCourseKeys.forEach((key, index) => {
    const color = WADA_SANZO_PALETTE[index % WADA_SANZO_PALETTE.length];
    map.set(key, color);
  });

  return map;
}
