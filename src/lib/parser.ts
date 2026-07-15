import { PDFParse } from "pdf-parse";

const SKILLS_LEXICON: string[] = [
  "React",
  "Next.js",
  "Node.js",
  "TypeScript",
  "PostgreSQL",
  "AWS",
  "Docker",
  "Kubernetes",
  "Python",
  "Go",
  "Figma",
];

export async function extractSkillsFromBuffer(
  buffer: Buffer
): Promise<string[]> {
  let rawText: string;

  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    rawText = result.text;
  } catch {
    rawText = buffer.toString("utf-8");
  }

  const matched = new Set<string>();

  for (const skill of SKILLS_LEXICON) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, "i");
    if (pattern.test(rawText)) {
      matched.add(skill);
    }
  }

  return Array.from(matched);
}
