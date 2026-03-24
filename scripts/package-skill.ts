#!/usr/bin/env npx tsx

import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";
import { parseSkillMd, validateSkillPackage } from "../lib/skill-package";

const EXCLUDE_DIRS = new Set(["__pycache__", "node_modules"]);
const EXCLUDE_FILES = new Set([".DS_Store"]);
const EXCLUDE_GLOBS = [/\.pyc$/];
const ROOT_EXCLUDE_DIRS = new Set(["evals"]);

function shouldExclude(
  relativePath: string,
  isDir: boolean,
  depth: number,
): boolean {
  const basename = path.basename(relativePath);

  if (isDir) {
    if (EXCLUDE_DIRS.has(basename)) return true;
    if (depth === 0 && ROOT_EXCLUDE_DIRS.has(basename)) return true;
    return false;
  }

  if (EXCLUDE_FILES.has(basename)) return true;
  return EXCLUDE_GLOBS.some((pattern) => pattern.test(basename));
}

function walkDirectory(
  dir: string,
  baseDir: string,
  depth: number,
): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (shouldExclude(relative, true, depth)) continue;
      results.push(...walkDirectory(fullPath, baseDir, depth + 1));
    } else {
      if (shouldExclude(relative, false, depth)) continue;
      results.push(fullPath);
    }
  }

  return results;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npx tsx scripts/package-skill.ts <skill-folder> [output-dir]");
    process.exit(1);
  }

  const skillPath = path.resolve(args[0]);
  const outputDir = args[1] ? path.resolve(args[1]) : process.cwd();

  if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isDirectory()) {
    console.error(`Error: ${skillPath} is not a directory`);
    process.exit(1);
  }

  const skillMdPath = path.join(skillPath, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    console.error(`Error: SKILL.md not found in ${skillPath}`);
    process.exit(1);
  }

  console.log(`Packaging skill from: ${skillPath}`);

  const skillMdContent = fs.readFileSync(skillMdPath, "utf-8");
  const { frontmatter, body } = parseSkillMd(skillMdContent);

  const pkg = { frontmatter, body };
  const validation = validateSkillPackage(pkg);

  if (validation.warnings.length > 0) {
    for (const w of validation.warnings) {
      console.warn(`Warning: ${w}`);
    }
  }

  if (!validation.valid) {
    for (const e of validation.errors) {
      console.error(`Error: ${e}`);
    }
    process.exit(1);
  }

  const skillName = frontmatter.name;
  const parentDir = path.dirname(skillPath);
  const skillDirName = path.basename(skillPath);

  const zip = new JSZip();
  const files = walkDirectory(skillPath, skillPath, 0);

  for (const filePath of files) {
    const relativeToDirRoot = path.relative(skillPath, filePath);
    const archivePath = path.join(skillDirName, relativeToDirRoot);
    const content = fs.readFileSync(filePath);
    zip.file(archivePath, content);
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${skillName}.skill`);
  fs.writeFileSync(outputPath, zipBuffer);

  console.log(`Created: ${outputPath} (${files.length} files, ${zipBuffer.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
