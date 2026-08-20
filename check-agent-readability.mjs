#!/usr/bin/env node

/**
 * @agent-file
 * @agent-purpose: Audits repositories and generates their machine-readable navigation maps.
 * @agent-public-api: TOOL_VERSION, ConfigError, loadConfig, discoverSourceFiles, computeSourceFingerprint, findModuleDirectories, generateRepositoryMap, auditRepository, main
 * @agent-invariants: Audit operations are read-only and use repository-relative normalized paths.
 * @agent-side-effects: Reads target files; --generate-map writes .agent/repo-map.json; reports use stdout or stderr.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

export const TOOL_VERSION = "1.1.0";
const CONFIG_NAME = ".agent-readability.json";
const MAP_PATH = ".agent/repo-map.json";
const MEANINGFUL_PURPOSE_LENGTH = 8;
const MAP_SCHEMA_VERSION = 2;
const MAP_GENERATOR = `check-agent-readability@${TOOL_VERSION}`;

const DEFAULT_SOURCE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cjs",
  ".clj",
  ".cljs",
  ".cpp",
  ".cs",
  ".cts",
  ".dart",
  ".ex",
  ".exs",
  ".fs",
  ".fsx",
  ".go",
  ".h",
  ".hpp",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".kts",
  ".lua",
  ".m",
  ".mjs",
  ".mm",
  ".mts",
  ".php",
  ".pl",
  ".pm",
  ".py",
  ".r",
  ".rb",
  ".rs",
  ".scala",
  ".sh",
  ".sol",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
  ".zig",
]);

const DEFAULT_EXCLUDED_DIRECTORIES = new Set([
  ".agent",
  ".git",
  ".gradle",
  ".hg",
  ".idea",
  ".mypy_cache",
  ".next",
  ".nuxt",
  ".pytest_cache",
  ".svn",
  ".tox",
  ".venv",
  ".vscode",
  "__pycache__",
  "bin",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "obj",
  "out",
  "target",
  "vendor",
  "venv",
]);

const DEFAULT_EXCLUDE_PATTERNS = [
  "*.min.css",
  "*.min.js",
  "*.designer.cs",
  "*.g.cs",
  "*_pb2.py",
  "*_pb2_grpc.py",
];

const SOURCE_ROOT_NAMES = new Set([
  "app",
  "components",
  "lib",
  "libs",
  "modules",
  "packages",
  "services",
  "src",
]);

const MANIFEST_NAMES = new Set([
  "Cargo.toml",
  "Gemfile",
  "build.gradle",
  "build.gradle.kts",
  "composer.json",
  "go.mod",
  "mix.exs",
  "package.json",
  "pom.xml",
  "pyproject.toml",
  "settings.gradle",
  "settings.gradle.kts",
]);

const ROOT_AGENT_SECTIONS = {
  "Repository Documents": ["repository documents", "navigation", "read first"],
  Development: ["development", "local development"],
  Testing: ["testing", "tests"],
  Conventions: ["conventions", "coding conventions"],
  "Agent Workflow": ["agent workflow", "workflow"],
  "Documentation Updates": [
    "documentation updates",
    "documentation update triggers",
  ],
};

const ARCHITECTURE_SECTIONS = {
  Purpose: ["purpose", "goal"],
  "System Context": ["system context", "context"],
  Components: ["components", "component model"],
  "Dependency Rules": ["dependency rules", "dependency direction"],
  "Data Flow": ["data flow", "data flows"],
  "Entry Points": ["entry points", "entry point"],
  "Cross-Cutting Constraints": [
    "cross-cutting constraints",
    "cross cutting constraints",
    "system constraints",
  ],
};

const MODULE_SECTIONS = {
  Purpose: ["purpose", "goal"],
  Responsibilities: ["responsibilities", "responsibility"],
  "Key Files": ["key files", "important files"],
  Dependencies: ["dependencies", "dependency"],
  Tests: ["tests", "testing"],
};

const BROAD_EXCLUDES = new Set([
  "*",
  "**",
  "**/*",
  "app/**",
  "components/**",
  "lib/**",
  "libs/**",
  "modules/**",
  "packages/**",
  "services/**",
  "src/**",
]);

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

function absolutePath(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function normalizeRelativePath(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(`${fieldName} paths must be non-empty strings`);
  }

  let normalized = toPosix(value.trim());
  while (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  const parts = normalized.split("/");
  if (
    normalized === "" ||
    normalized === "." ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    parts.includes("..")
  ) {
    throw new ConfigError(`${fieldName} contains an unsafe path: ${JSON.stringify(value)}`);
  }
  return path.posix.normalize(normalized);
}

function positiveInteger(value, fieldName, defaultValue) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new ConfigError(`${fieldName} must be a positive integer`);
  }
  return value;
}

function numberInRange(value, fieldName, defaultValue, minimum, maximum) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ConfigError(`${fieldName} must be a number`);
  }
  if (value < minimum || value > maximum) {
    throw new ConfigError(`${fieldName} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function loadExemptions(value, fieldName) {
  if (value === undefined || value === null) {
    return {};
  }
  if (!isPlainObject(value)) {
    throw new ConfigError(`${fieldName} must map paths to reasons`);
  }

  const result = {};
  for (const [rawPath, reason] of Object.entries(value)) {
    const normalized = normalizeRelativePath(rawPath, fieldName);
    if (typeof reason !== "string" || reason.trim() === "") {
      throw new ConfigError(`${fieldName}.${normalized} must have a non-empty reason`);
    }
    result[normalized] = reason.trim();
  }
  return result;
}

export function loadConfig(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  const configPath = path.join(root, CONFIG_NAME);
  let raw = {};

  if (fs.existsSync(configPath)) {
    try {
      raw = JSON.parse(readUtf8(configPath));
    } catch (error) {
      throw new ConfigError(`cannot read ${CONFIG_NAME}: ${error.message}`);
    }
    if (!isPlainObject(raw)) {
      throw new ConfigError(`${CONFIG_NAME} must contain a JSON object`);
    }
  }

  if ((raw.version ?? 1) !== 1) {
    throw new ConfigError(`${CONFIG_NAME}.version must be 1`);
  }

  const excludes = raw.exclude ?? [];
  if (
    !Array.isArray(excludes) ||
    !excludes.every((item) => typeof item === "string" && item.trim() !== "")
  ) {
    throw new ConfigError(`${CONFIG_NAME}.exclude must be a list of non-empty strings`);
  }
  const excludePatterns = excludes.map((item) => toPosix(item.trim()));
  for (const pattern of excludePatterns) {
    if (BROAD_EXCLUDES.has(pattern.toLowerCase().replace(/\/+$/, ""))) {
      throw new ConfigError(
        `${CONFIG_NAME}.exclude cannot hide an entire source root: ${pattern}`,
      );
    }
  }

  const extensionValues = raw.sourceExtensions ?? [];
  if (
    !Array.isArray(extensionValues) ||
    !extensionValues.every(
      (item) => typeof item === "string" && item.trim() !== "",
    )
  ) {
    throw new ConfigError(`${CONFIG_NAME}.sourceExtensions must be a list of extensions`);
  }
  const sourceExtensions = new Set(DEFAULT_SOURCE_EXTENSIONS);
  for (const extension of extensionValues) {
    const normalized = extension.trim().toLowerCase();
    sourceExtensions.add(normalized.startsWith(".") ? normalized : `.${normalized}`);
  }

  const significantDirectoryMinFiles = positiveInteger(
    raw.significantDirectoryMinFiles,
    "significantDirectoryMinFiles",
    3,
  );
  const significantDirectoryRecursiveFiles = positiveInteger(
    raw.significantDirectoryRecursiveFiles,
    "significantDirectoryRecursiveFiles",
    5,
  );
  const recommendedMaxLines = positiveInteger(
    raw.recommendedMaxLines,
    "recommendedMaxLines",
    800,
  );
  const hardMaxLines = positiveInteger(raw.hardMaxLines, "hardMaxLines", 2000);
  if (recommendedMaxLines > hardMaxLines) {
    throw new ConfigError("recommendedMaxLines cannot exceed hardMaxLines");
  }

  const exemptions = raw.exemptions ?? {};
  if (!isPlainObject(exemptions)) {
    throw new ConfigError(`${CONFIG_NAME}.exemptions must be an object`);
  }

  return {
    excludePatterns,
    sourceExtensions,
    significantDirectoryMinFiles,
    significantDirectoryRecursiveFiles,
    recommendedMaxLines,
    hardMaxLines,
    minScore: numberInRange(raw.minScore, "minScore", 85, 0, 100),
    oversizedFileExemptions: loadExemptions(
      exemptions.oversizedFiles,
      "exemptions.oversizedFiles",
    ),
    moduleGuideExemptions: loadExemptions(
      exemptions.moduleGuides,
      "exemptions.moduleGuides",
    ),
    mapFileExemptions: loadExemptions(
      exemptions.mapFiles,
      "exemptions.mapFiles",
    ),
    fileHeaderExemptions: loadExemptions(
      exemptions.fileHeaders,
      "exemptions.fileHeaders",
    ),
  };
}

function globToRegExp(glob) {
  let expression = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === "*") {
      if (glob[index + 1] === "*") {
        if (glob[index + 2] === "/") {
          expression += "(?:.*/)?";
          index += 2;
        } else {
          expression += ".*";
          index += 1;
        }
      } else {
        expression += "[^/]*";
      }
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    }
  }
  return new RegExp(`${expression}$`);
}

function pathMatchesPattern(relativePath, pattern) {
  const normalizedPath = toPosix(relativePath).replace(/^\/+|\/+$/g, "");
  const normalizedPattern = toPosix(pattern).replace(/^\/+|\/+$/g, "");
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3).replace(/\/+$/, "");
    if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  const target = normalizedPattern.includes("/")
    ? normalizedPath
    : path.posix.basename(normalizedPath);
  return globToRegExp(normalizedPattern).test(target);
}

function isExcluded(relativePath, config) {
  const parts = toPosix(relativePath).split("/");
  if (parts.some((part) => DEFAULT_EXCLUDED_DIRECTORIES.has(part))) {
    return true;
  }
  return [...DEFAULT_EXCLUDE_PATTERNS, ...config.excludePatterns].some((pattern) =>
    pathMatchesPattern(relativePath, pattern),
  );
}

export function discoverSourceFiles(repositoryRoot, config) {
  const root = path.resolve(repositoryRoot);
  const files = [];

  function visit(directory) {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const fullPath = path.join(directory, entry.name);
      const relativePath = toPosix(path.relative(root, fullPath));
      if (isExcluded(relativePath, config)) {
        continue;
      }
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (
        entry.isFile() &&
        config.sourceExtensions.has(path.extname(entry.name).toLowerCase())
      ) {
        files.push(relativePath);
      }
    }
  }

  visit(root);
  return files.sort();
}

export function computeSourceFingerprint(repositoryRoot, sourceFiles) {
  const root = path.resolve(repositoryRoot);
  const digest = crypto.createHash("sha256");
  for (const relativePath of [...sourceFiles].sort()) {
    const content = fs
      .readFileSync(absolutePath(root, relativePath))
      .toString("utf8")
      .replace(/\r\n?/g, "\n");
    digest.update(relativePath, "utf8");
    digest.update(Buffer.from([0]));
    digest.update(content, "utf8");
    digest.update(Buffer.from([0]));
  }
  return digest.digest("hex");
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function directoryHasManifest(root, relativeDirectory) {
  const directory = absolutePath(root, relativeDirectory);
  return fs.readdirSync(directory, { withFileTypes: true }).some((entry) => {
    if (!entry.isFile()) {
      return false;
    }
    return (
      MANIFEST_NAMES.has(entry.name) ||
      entry.name.endsWith(".csproj") ||
      entry.name.endsWith(".fsproj")
    );
  });
}

export function findModuleDirectories(repositoryRoot, sourceFiles, config) {
  const root = path.resolve(repositoryRoot);
  const directCounts = new Map();
  const recursiveCounts = new Map();

  for (const sourceFile of sourceFiles) {
    let parent = path.posix.dirname(sourceFile);
    if (parent !== ".") {
      increment(directCounts, parent);
    }
    while (parent !== ".") {
      increment(recursiveCounts, parent);
      parent = path.posix.dirname(parent);
    }
  }

  const result = new Set();
  for (const [directory, count] of directCounts) {
    if (count >= config.significantDirectoryMinFiles) {
      result.add(directory);
    }
  }
  for (const [directory, count] of recursiveCounts) {
    if (
      SOURCE_ROOT_NAMES.has(path.posix.basename(directory).toLowerCase()) &&
      count >= config.significantDirectoryRecursiveFiles
    ) {
      result.add(directory);
    }
    if (count > 0 && directoryHasManifest(root, directory)) {
      result.add(directory);
    }
  }
  return [...result].sort();
}

function normalizeHeading(title) {
  return title.replace(/[`*_]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function markdownSections(text) {
  const headingPattern = /^[ \t]{0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
  const matches = [...text.matchAll(headingPattern)];
  return matches.map((match, index) => {
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index : text.length;
    return {
      heading: normalizeHeading(match[1]),
      body: text.slice(bodyStart, bodyEnd),
    };
  });
}

function sectionPresence(filePath, requirements) {
  const sections = markdownSections(readUtf8(filePath));
  return Object.fromEntries(
    Object.entries(requirements).map(([canonical, aliases]) => {
      const present = sections.some(
        (section) =>
          section.body.trim() !== "" &&
          aliases.some((alias) => section.heading.includes(normalizeHeading(alias))),
      );
      return [canonical, present];
    }),
  );
}

function meaningfulPurpose(value) {
  return (
    typeof value === "string" &&
    value.replace(/\s+/g, "").length >= MEANINGFUL_PURPOSE_LENGTH
  );
}

function safeMapPath(value) {
  try {
    return normalizeRelativePath(value, "repo-map");
  } catch {
    return null;
  }
}

function validTimestamp(value) {
  return (
    typeof value === "string" &&
    /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value.trim()) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isExistingFile(root, relativePath) {
  if (relativePath === null) {
    return false;
  }
  try {
    return fs.statSync(absolutePath(root, relativePath)).isFile();
  } catch {
    return false;
  }
}

function isExistingDirectory(root, relativePath) {
  if (relativePath === null) {
    return false;
  }
  try {
    return fs.statSync(absolutePath(root, relativePath)).isDirectory();
  } catch {
    return false;
  }
}

function countLines(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  if (text.length === 0) {
    return 0;
  }
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines.length;
}

function finding(severity, code, findingPath, message) {
  return { severity, code, path: findingPath, message };
}

function scoreRootGuide(root, findings) {
  const guide = path.join(root, "AGENTS.md");
  if (!fs.existsSync(guide) || !fs.statSync(guide).isFile()) {
    findings.push(
      finding("error", "ROOT_GUIDE_MISSING", "AGENTS.md", "Root AGENTS.md is required."),
    );
    return 0;
  }

  const presence = sectionPresence(guide, ROOT_AGENT_SECTIONS);
  for (const [section, present] of Object.entries(presence)) {
    if (!present) {
      findings.push(
        finding(
          "error",
          "ROOT_SECTION_MISSING",
          "AGENTS.md",
          `Required non-empty section is missing: ${section}.`,
        ),
      );
    }
  }
  const presentCount = Object.values(presence).filter(Boolean).length;
  return 10 + (20 * presentCount) / Object.keys(ROOT_AGENT_SECTIONS).length;
}

function scoreArchitecture(root, findings) {
  const architecture = path.join(root, "ARCHITECTURE.md");
  if (!fs.existsSync(architecture) || !fs.statSync(architecture).isFile()) {
    findings.push(
      finding(
        "error",
        "ARCHITECTURE_MISSING",
        "ARCHITECTURE.md",
        "Root ARCHITECTURE.md is required.",
      ),
    );
    return 0;
  }

  const presence = sectionPresence(architecture, ARCHITECTURE_SECTIONS);
  for (const [section, present] of Object.entries(presence)) {
    if (!present) {
      findings.push(
        finding(
          "error",
          "ARCHITECTURE_SECTION_MISSING",
          "ARCHITECTURE.md",
          `Required non-empty section is missing: ${section}.`,
        ),
      );
    }
  }
  const presentCount = Object.values(presence).filter(Boolean).length;
  return 10 + (20 * presentCount) / Object.keys(ARCHITECTURE_SECTIONS).length;
}

function scoreModuleGuides(root, directories, config, findings) {
  if (directories.length === 0) {
    return 25;
  }

  let earned = 0;
  for (const directory of directories) {
    const exemption = config.moduleGuideExemptions[directory];
    if (exemption) {
      earned += 1;
      findings.push(
        finding(
          "info",
          "MODULE_GUIDE_EXEMPT",
          directory,
          `Guide exemption: ${exemption}`,
        ),
      );
      continue;
    }

    const guideRelative = `${directory}/MODULE.md`;
    const guide = absolutePath(root, guideRelative);
    if (!fs.existsSync(guide) || !fs.statSync(guide).isFile()) {
      findings.push(
        finding(
          "error",
          "MODULE_GUIDE_MISSING",
          guideRelative,
          "A detected module directory requires a MODULE.md.",
        ),
      );
      continue;
    }

    earned += 0.5;
    const presence = sectionPresence(guide, MODULE_SECTIONS);
    const presentCount = Object.values(presence).filter(Boolean).length;
    earned += (0.5 * presentCount) / Object.keys(MODULE_SECTIONS).length;
    for (const [section, present] of Object.entries(presence)) {
      if (!present) {
        findings.push(
          finding(
            "error",
            "MODULE_SECTION_MISSING",
            guideRelative,
            `Required non-empty section is missing: ${section}.`,
          ),
        );
      }
    }
  }
  return (25 * earned) / directories.length;
}

function firstSectionSummary(filePath, aliases) {
  const section = markdownSections(readUtf8(filePath)).find((candidate) =>
    aliases.some((alias) => candidate.heading.includes(normalizeHeading(alias))),
  );
  if (!section) {
    return null;
  }
  const withoutComments = section.body.replace(/<!--[\s\S]*?-->/g, " ");
  const paragraph = withoutComments
    .split(/\n\s*\n/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .find(Boolean);
  if (!paragraph || paragraph.includes("{{")) {
    return null;
  }
  return paragraph.replace(/^[>*#\-\s]+/, "").trim();
}

function readAgentHeader(root, sourceFile) {
  const firstLines = fs
    .readFileSync(absolutePath(root, sourceFile), "utf8")
    .split(/\r\n|\r|\n/)
    .slice(0, 50);
  const markerIndex = firstLines.findIndex((line) =>
    /@agent-file(?:\s|$)/.test(line),
  );
  const tags = [
    "@agent-purpose",
    "@agent-public-api",
    "@agent-invariants",
    "@agent-side-effects",
  ];
  const values = {};
  const indexes = {};
  for (const tag of tags) {
    const tagIndex = firstLines.findIndex(
      (line, index) => index > markerIndex && headerTagValue(line, tag) !== null,
    );
    indexes[tag] = tagIndex;
    values[tag] = tagIndex === -1 ? null : headerTagValue(firstLines[tagIndex], tag);
  }
  const ordered =
    markerIndex !== -1 &&
    tags.every(
      (tag, index) =>
        indexes[tag] !== -1 &&
        (index === 0 || indexes[tag] > indexes[tags[index - 1]]),
    );
  const span =
    markerIndex === -1 || tags.some((tag) => indexes[tag] === -1)
      ? null
      : Math.max(...tags.map((tag) => indexes[tag])) - markerIndex + 1;
  const valid =
    markerIndex !== -1 &&
    ordered &&
    span <= 15 &&
    meaningfulPurpose(values["@agent-purpose"]) &&
    tags
      .slice(1)
      .every(
        (tag) => typeof values[tag] === "string" && values[tag].length > 0,
      );
  return { firstLines, markerIndex, tags, values, indexes, ordered, span, valid };
}

function publicSymbolsFromHeader(value) {
  if (typeof value !== "string" || value.trim().toLowerCase() === "none") {
    return [];
  }
  return value
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);
}

function inferSourceKind(sourceFile, headerExemption) {
  if (headerExemption) {
    return "generated";
  }
  const normalized = sourceFile.toLowerCase();
  if (
    /(^|\/)(__tests__|tests?|specs?)(\/|$)/.test(normalized) ||
    /(?:\.test|\.spec|_test)\.[^/]+$/.test(normalized)
  ) {
    return "test";
  }
  return "source";
}

function buildExpectedMapFiles(root, sourceFiles, config, strict = false) {
  const exemptMapFiles = new Set(Object.keys(config.mapFileExemptions));
  return sourceFiles
    .filter((sourceFile) => !exemptMapFiles.has(sourceFile))
    .map((sourceFile) => {
      const headerExemption = config.fileHeaderExemptions[sourceFile];
      if (headerExemption) {
        return {
          path: sourceFile,
          kind: "generated",
          purpose: `Generated source file: ${headerExemption}`,
          publicSymbols: [],
        };
      }

      const header = readAgentHeader(root, sourceFile);
      if (!header.valid && strict) {
        throw new ConfigError(
          `cannot generate ${MAP_PATH}: ${sourceFile} has an invalid @agent-* header`,
        );
      }
      return {
        path: sourceFile,
        kind: inferSourceKind(sourceFile, headerExemption),
        purpose:
          header.values["@agent-purpose"] ??
          "Missing valid source-file agent purpose",
        publicSymbols: publicSymbolsFromHeader(
          header.values["@agent-public-api"],
        ),
      };
    });
}

function buildExpectedMapModules(root, moduleDirectories, config, strict = false) {
  const exemptDirectories = new Set(Object.keys(config.moduleGuideExemptions));
  return moduleDirectories
    .filter((directory) => !exemptDirectories.has(directory))
    .map((directory) => {
      const guide = `${directory}/MODULE.md`;
      const guidePath = absolutePath(root, guide);
      const purpose = isExistingFile(root, guide)
        ? firstSectionSummary(guidePath, MODULE_SECTIONS.Purpose)
        : null;
      if ((!isExistingFile(root, guide) || !meaningfulPurpose(purpose)) && strict) {
        throw new ConfigError(
          `cannot generate ${MAP_PATH}: ${guide} needs a meaningful Purpose section`,
        );
      }
      return {
        path: directory,
        purpose: purpose ?? "Missing valid module purpose",
        guide,
      };
    });
}

export function generateRepositoryMap(repository) {
  const root = validateRepositoryRoot(repository);
  const config = loadConfig(root);
  const sourceFiles = discoverSourceFiles(root, config);
  const moduleDirectories = findModuleDirectories(root, sourceFiles, config);
  const preparationFindings = [];

  scoreRootGuide(root, preparationFindings);
  scoreArchitecture(root, preparationFindings);
  scoreModuleGuides(root, moduleDirectories, config, preparationFindings);
  scoreFileHeaders(root, sourceFiles, config, preparationFindings);

  const errors = preparationFindings.filter(
    (item) => item.severity === "error",
  );
  if (errors.length > 0) {
    const preview = errors
      .slice(0, 5)
      .map((item) => `${item.path}: ${item.message}`)
      .join("; ");
    const suffix = errors.length > 5 ? ` (+${errors.length - 5} more)` : "";
    throw new ConfigError(
      `cannot generate ${MAP_PATH} until required documentation is valid: ${preview}${suffix}`,
    );
  }

  const map = {
    schemaVersion: MAP_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: MAP_GENERATOR,
    sourceFingerprint: computeSourceFingerprint(root, sourceFiles),
    modules: buildExpectedMapModules(
      root,
      moduleDirectories,
      config,
      true,
    ),
    files: buildExpectedMapFiles(root, sourceFiles, config, true),
  };
  const mapFile = absolutePath(root, MAP_PATH);
  fs.mkdirSync(path.dirname(mapFile), { recursive: true });
  fs.writeFileSync(mapFile, `${JSON.stringify(map, null, 2)}\n`, "utf8");
  return { path: mapFile, map };
}

function mapEntryMatches(actual, expected) {
  return (
    actual.path === expected.path &&
    actual.kind === expected.kind &&
    actual.purpose === expected.purpose &&
    Array.isArray(actual.publicSymbols) &&
    JSON.stringify(actual.publicSymbols) === JSON.stringify(expected.publicSymbols)
  );
}

function validateMapFiles(data, expectedEntries, findings) {
  const entries = data.files;
  if (!Array.isArray(entries)) {
    findings.push(
      finding("error", "MAP_FILES_INVALID", MAP_PATH, "files must be a JSON array."),
    );
    return { score: 0, mappedPaths: new Set() };
  }

  const expectedByPath = new Map(
    expectedEntries.map((entry) => [entry.path, entry]),
  );
  const expectedFiles = new Set(expectedByPath.keys());
  const mappedPaths = new Set();
  const qualityByPath = new Map();
  entries.forEach((entry, index) => {
    const location = `${MAP_PATH}#files[${index}]`;
    if (!isPlainObject(entry)) {
      findings.push(
        finding("error", "MAP_FILE_INVALID", location, "Entry must be an object."),
      );
      return;
    }

    const entryPath = safeMapPath(entry.path);
    if (entryPath === null) {
      findings.push(
        finding(
          "error",
          "MAP_FILE_PATH_INVALID",
          location,
          "Entry has an invalid repository-relative path.",
        ),
      );
      return;
    }
    if (mappedPaths.has(entryPath)) {
      findings.push(
        finding(
          "error",
          "MAP_FILE_DUPLICATE",
          entryPath,
          "File appears more than once in repo-map.json.",
        ),
      );
      return;
    }
    mappedPaths.add(entryPath);

    const purposeOk = meaningfulPurpose(entry.purpose);
    const symbolsOk =
      Array.isArray(entry.publicSymbols) &&
      entry.publicSymbols.every(
        (symbol) => typeof symbol === "string" && symbol.trim() !== "",
      );
    const kindOk = typeof entry.kind === "string" && entry.kind.trim() !== "";
    const expected = expectedByPath.get(entryPath);
    const generatedMatch =
      expected !== undefined && mapEntryMatches(entry, expected);
    qualityByPath.set(
      entryPath,
      purposeOk && symbolsOk && kindOk && generatedMatch,
    );

    if (!purposeOk) {
      findings.push(
        finding(
          "error",
          "MAP_FILE_PURPOSE_INVALID",
          entryPath,
          `purpose must contain at least ${MEANINGFUL_PURPOSE_LENGTH} non-space characters.`,
        ),
      );
    }
    if (!symbolsOk) {
      findings.push(
        finding(
          "error",
          "MAP_FILE_SYMBOLS_INVALID",
          entryPath,
          "publicSymbols must be an array of non-empty strings.",
        ),
      );
    }
    if (!kindOk) {
      findings.push(
        finding(
          "error",
          "MAP_FILE_KIND_INVALID",
          entryPath,
          "kind must be a non-empty string.",
        ),
      );
    }
    if (purposeOk && symbolsOk && kindOk && expected && !generatedMatch) {
      findings.push(
        finding(
          "error",
          "MAP_FILE_STALE",
          entryPath,
          "Generated file metadata differs from the source header; regenerate the map.",
        ),
      );
    }
  });

  const missing = [...expectedFiles].filter((item) => !mappedPaths.has(item)).sort();
  if (missing.length > 0) {
    const preview = missing.slice(0, 10).join(", ");
    const suffix = missing.length > 10 ? ` (+${missing.length - 10} more)` : "";
    findings.push(
      finding(
        "error",
        "MAP_FILE_COVERAGE",
        MAP_PATH,
        `Missing ${missing.length} source file(s): ${preview}${suffix}`,
      ),
    );
  }

  const extra = [...mappedPaths].filter((item) => !expectedFiles.has(item)).sort();
  if (extra.length > 0) {
    const preview = extra.slice(0, 10).join(", ");
    const suffix = extra.length > 10 ? ` (+${extra.length - 10} more)` : "";
    findings.push(
      finding(
        "error",
        "MAP_FILE_EXTRA",
        MAP_PATH,
        `Map contains ${extra.length} non-source or excluded file(s): ${preview}${suffix}`,
      ),
    );
  }

  if (expectedFiles.size === 0) {
    return { score: 15, mappedPaths };
  }
  const coveredCount = [...expectedFiles].filter((item) => mappedPaths.has(item)).length;
  const qualityCount = [...expectedFiles].filter(
    (item) => qualityByPath.get(item) === true,
  ).length;
  const coverage = coveredCount / expectedFiles.size;
  const quality = qualityCount / expectedFiles.size;
  return { score: 15 * (0.7 * coverage + 0.3 * quality), mappedPaths };
}

function validateMapModules(
  root,
  data,
  expectedModules,
  findings,
) {
  const modules = data.modules;
  const expectedByPath = new Map(
    expectedModules.map((module) => [module.path, module]),
  );
  const requiredModules = new Set(expectedByPath.keys());
  const mappedModules = new Set();
  const validModules = new Set();

  if (!Array.isArray(modules)) {
    findings.push(
      finding("error", "MAP_MODULES_INVALID", MAP_PATH, "modules must be a JSON array."),
    );
  } else {
    modules.forEach((module, index) => {
      const location = `${MAP_PATH}#modules[${index}]`;
      const modulePath = isPlainObject(module) ? safeMapPath(module.path) : null;
      const guidePath = isPlainObject(module) ? safeMapPath(module.guide) : null;
      const expected = expectedByPath.get(modulePath);
      if (modulePath !== null) {
        if (mappedModules.has(modulePath)) {
          findings.push(
            finding(
              "error",
              "MAP_MODULE_DUPLICATE",
              modulePath,
              "Module appears more than once in repo-map.json.",
            ),
          );
          return;
        }
        mappedModules.add(modulePath);
      }
      const valid =
        isPlainObject(module) &&
        isExistingDirectory(root, modulePath) &&
        isExistingFile(root, guidePath) &&
        meaningfulPurpose(module.purpose) &&
        expected !== undefined &&
        module.path === expected.path &&
        module.guide === expected.guide &&
        module.purpose === expected.purpose;
      if (!valid) {
        findings.push(
          finding(
            "error",
            "MAP_MODULE_INVALID",
            location,
            "Module metadata must match its generated MODULE.md summary.",
          ),
        );
      } else {
        validModules.add(modulePath);
      }
    });

    const missingModules = [...requiredModules]
      .filter((item) => !validModules.has(item))
      .sort();
    if (missingModules.length > 0) {
      findings.push(
        finding(
          "error",
          "MAP_MODULE_COVERAGE",
          MAP_PATH,
          `Missing detected module(s): ${missingModules.join(", ")}`,
        ),
      );
    }
    const extraModules = [...mappedModules].filter(
      (item) => !requiredModules.has(item),
    );
    if (extraModules.length > 0) {
      findings.push(
        finding(
          "error",
          "MAP_MODULE_EXTRA",
          MAP_PATH,
          `Map contains unexpected module(s): ${extraModules.join(", ")}`,
        ),
      );
    }
  }
  return requiredModules.size === 0
    ? 5
    : (5 *
        [...requiredModules].filter((item) => validModules.has(item)).length) /
      requiredModules.size;
}

function scoreRepositoryMap(
  root,
  sourceFiles,
  moduleDirectories,
  config,
  findings,
) {
  const mapFile = absolutePath(root, MAP_PATH);
  if (sourceFiles.length === 0 && !fs.existsSync(mapFile)) {
    findings.push(
      finding(
        "info",
        "MAP_NOT_APPLICABLE",
        MAP_PATH,
        "No source files were discovered; repository map is not required.",
      ),
    );
    return 30;
  }
  if (!fs.existsSync(mapFile) || !fs.statSync(mapFile).isFile()) {
    findings.push(
      finding(
        "error",
        "MAP_MISSING",
        MAP_PATH,
        "Repository map is required; run the auditor with --generate-map.",
      ),
    );
    return 0;
  }

  let data;
  try {
    data = JSON.parse(readUtf8(mapFile));
  } catch (error) {
    findings.push(
      finding(
        "error",
        "MAP_JSON_INVALID",
        MAP_PATH,
        `Cannot parse repository map: ${error.message}`,
      ),
    );
    return 0;
  }
  if (!isPlainObject(data)) {
    findings.push(
      finding(
        "error",
        "MAP_JSON_INVALID",
        MAP_PATH,
        "Repository map must contain a JSON object.",
      ),
    );
    return 0;
  }

  let score = 0;
  if (data.schemaVersion === MAP_SCHEMA_VERSION) {
    score += 3;
  } else {
    findings.push(
      finding(
        "error",
        "MAP_SCHEMA_VERSION",
        MAP_PATH,
        `schemaVersion must be the integer ${MAP_SCHEMA_VERSION}; regenerate the map.`,
      ),
    );
  }

  if (validTimestamp(data.generatedAt)) {
    score += 2;
  } else {
    findings.push(
      finding(
        "error",
        "MAP_GENERATED_AT",
        MAP_PATH,
        "generatedAt must be an ISO 8601 timestamp with a timezone.",
      ),
    );
  }

  if (data.generatedBy === MAP_GENERATOR) {
    score += 2;
  } else {
    findings.push(
      finding(
        "error",
        "MAP_GENERATOR",
        MAP_PATH,
        `generatedBy must be ${MAP_GENERATOR}; do not maintain the map manually.`,
      ),
    );
  }

  const expectedFingerprint = computeSourceFingerprint(root, sourceFiles);
  if (data.sourceFingerprint === expectedFingerprint) {
    score += 3;
  } else {
    findings.push(
      finding(
        "error",
        "MAP_FINGERPRINT",
        MAP_PATH,
        "sourceFingerprint is missing or stale; regenerate after source changes.",
      ),
    );
  }

  const expectedFiles = buildExpectedMapFiles(root, sourceFiles, config);
  const expectedModules = buildExpectedMapModules(
    root,
    moduleDirectories,
    config,
  );
  score += validateMapFiles(data, expectedFiles, findings).score;
  score += validateMapModules(root, data, expectedModules, findings);

  for (const [filePath, reason] of Object.entries(config.mapFileExemptions)) {
    findings.push(
      finding("info", "MAP_FILE_EXEMPT", filePath, `Map exemption: ${reason}`),
    );
  }
  return score;
}

function scoreFileSizes(root, sourceFiles, config, findings) {
  if (sourceFiles.length === 0) {
    return 15;
  }

  let earned = 0;
  for (const sourceFile of sourceFiles) {
    const lines = countLines(absolutePath(root, sourceFile));
    const exemption = config.oversizedFileExemptions[sourceFile];
    if (exemption) {
      earned += 1;
      findings.push(
        finding(
          "info",
          "FILE_SIZE_EXEMPT",
          sourceFile,
          `${lines} lines; exemption: ${exemption}`,
        ),
      );
    } else if (lines > config.hardMaxLines) {
      findings.push(
        finding(
          "error",
          "FILE_TOO_LARGE",
          sourceFile,
          `${lines} lines exceeds hard limit ${config.hardMaxLines}.`,
        ),
      );
    } else if (lines > config.recommendedMaxLines) {
      earned += 0.5;
      findings.push(
        finding(
          "warning",
          "FILE_LARGE",
          sourceFile,
          `${lines} lines exceeds recommended limit ${config.recommendedMaxLines}.`,
        ),
      );
    } else {
      earned += 1;
    }
  }
  return (15 * earned) / sourceFiles.length;
}

function headerTagValue(line, tag) {
  const marker = `${tag}:`;
  const markerIndex = line.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }
  return line
    .slice(markerIndex + marker.length)
    .replace(/(?:\*\/|-->|"""|''')\s*$/, "")
    .trim();
}

function scoreFileHeaders(root, sourceFiles, config, findings) {
  if (sourceFiles.length === 0) {
    return 20;
  }

  const requiredTags = [
    ["@agent-purpose", true],
    ["@agent-public-api", false],
    ["@agent-invariants", false],
    ["@agent-side-effects", false],
  ];
  let earned = 0;

  for (const sourceFile of sourceFiles) {
    const exemption = config.fileHeaderExemptions[sourceFile];
    if (exemption) {
      earned += 1;
      findings.push(
        finding(
          "info",
          "FILE_HEADER_EXEMPT",
          sourceFile,
          `Header exemption: ${exemption}`,
        ),
      );
      continue;
    }

    const firstLines = fs
      .readFileSync(absolutePath(root, sourceFile), "utf8")
      .split(/\r\n|\r|\n/)
      .slice(0, 50);
    const markerIndex = firstLines.findIndex((line) =>
      /@agent-file(?:\s|$)/.test(line),
    );
    if (markerIndex === -1) {
      findings.push(
        finding(
          "error",
          "FILE_HEADER_MISSING",
          sourceFile,
          "The first 50 lines must contain an @agent-file metadata header.",
        ),
      );
      continue;
    }

    let filePoints = 1;
    const tagIndexes = [];
    for (const [tag, requiresMeaningfulPurpose] of requiredTags) {
      const tagIndex = firstLines.findIndex(
        (line, index) => index > markerIndex && headerTagValue(line, tag) !== null,
      );
      tagIndexes.push(tagIndex);
      if (tagIndex === -1) {
        findings.push(
          finding(
            "error",
            "FILE_HEADER_FIELD_MISSING",
            sourceFile,
            `Required header field is missing: ${tag}.`,
          ),
        );
        continue;
      }

      const value = headerTagValue(firstLines[tagIndex], tag);
      const valid = requiresMeaningfulPurpose
        ? meaningfulPurpose(value)
        : typeof value === "string" && value.length > 0;
      if (!valid) {
        findings.push(
          finding(
            "error",
            "FILE_HEADER_FIELD_INVALID",
            sourceFile,
            requiresMeaningfulPurpose
              ? `${tag} must contain at least ${MEANINGFUL_PURPOSE_LENGTH} non-space characters.`
              : `${tag} must have a value; use "none" when not applicable.`,
          ),
        );
        continue;
      }
      filePoints += 1;
    }

    if (tagIndexes.every((index) => index !== -1)) {
      const ordered = tagIndexes.every(
        (index, position) =>
          position === 0 || index > tagIndexes[position - 1],
      );
      const span = Math.max(...tagIndexes) - markerIndex + 1;
      if (!ordered) {
        findings.push(
          finding(
            "error",
            "FILE_HEADER_ORDER",
            sourceFile,
            "Header fields must follow purpose, public API, invariants, side effects order.",
          ),
        );
      }
      if (span > 15) {
        findings.push(
          finding(
            "error",
            "FILE_HEADER_TOO_LONG",
            sourceFile,
            `Agent header spans ${span} lines; maximum is 15.`,
          ),
        );
      }
      if (!ordered || span > 15) {
        filePoints = Math.min(filePoints, 4);
      }
    }

    earned += filePoints / 5;
  }

  return (20 * earned) / sourceFiles.length;
}

function validateRepositoryRoot(repository) {
  const root = path.resolve(repository);
  try {
    if (!fs.statSync(root).isDirectory()) {
      throw new ConfigError(`repository is not a directory: ${root}`);
    }
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(`repository is not a directory: ${root}`);
  }
  return root;
}

export function auditRepository(repository, minimumScore) {
  const root = validateRepositoryRoot(repository);
  const config = loadConfig(root);
  const effectiveMinimum =
    minimumScore === undefined
      ? config.minScore
      : numberInRange(minimumScore, "min-score", 85, 0, 100);
  const sourceFiles = discoverSourceFiles(root, config);
  const moduleDirectories = findModuleDirectories(root, sourceFiles, config);
  const findings = [];

  const categories = {
    agentInstructions: (10 * scoreRootGuide(root, findings)) / 30,
    architecture: (15 * scoreArchitecture(root, findings)) / 30,
    moduleGuides:
      (20 *
        scoreModuleGuides(
          root,
          moduleDirectories,
          config,
          findings,
        )) /
      25,
    repositoryMap:
      (25 *
        scoreRepositoryMap(
          root,
          sourceFiles,
          moduleDirectories,
          config,
          findings,
        )) /
      30,
    fileHeaders: scoreFileHeaders(root, sourceFiles, config, findings),
    fileSize: (10 * scoreFileSizes(root, sourceFiles, config, findings)) / 15,
  };
  for (const [name, value] of Object.entries(categories)) {
    categories[name] = Math.round(value * 10) / 10;
  }
  const score =
    Math.round(
      Object.values(categories).reduce((total, value) => total + value, 0) * 10,
    ) / 10;

  const severityOrder = { error: 0, warning: 1, info: 2 };
  findings.sort(
    (left, right) =>
      (severityOrder[left.severity] ?? 9) - (severityOrder[right.severity] ?? 9) ||
      left.path.localeCompare(right.path) ||
      left.code.localeCompare(right.code),
  );
  const hasErrors = findings.some((item) => item.severity === "error");

  return {
    repository: root,
    standardVersion: "1.1",
    score,
    minimumScore: effectiveMinimum,
    passed: score >= effectiveMinimum && !hasErrors,
    status: score >= effectiveMinimum && !hasErrors ? "pass" : "fail",
    categories,
    metrics: {
      sourceFiles: sourceFiles.length,
      moduleDirectories: moduleDirectories.length,
      errors: findings.filter((item) => item.severity === "error").length,
      warnings: findings.filter((item) => item.severity === "warning").length,
      exemptions: findings.filter((item) => item.code.endsWith("_EXEMPT")).length,
    },
    findings,
  };
}

function printText(result) {
  const status = result.passed ? "PASS" : "FAIL";
  console.log(`Agent readability audit: ${result.repository}`);
  console.log(
    `Score: ${result.score.toFixed(1)}/100 ` +
      `(required ${result.minimumScore.toFixed(1)}) - ${status}`,
  );
  console.log(
    `Categories: ${Object.entries(result.categories)
      .map(([name, score]) => `${name}=${score.toFixed(1)}`)
      .join(", ")}`,
  );
  console.log(
    `Scope: ${result.metrics.sourceFiles} source file(s), ` +
      `${result.metrics.moduleDirectories} documented module directorie(s)`,
  );
  if (result.findings.length === 0) {
    console.log("No findings.");
    return;
  }
  console.log();
  for (const item of result.findings) {
    console.log(
      `[${item.severity.toUpperCase()}] ${item.code} ${item.path}: ${item.message}`,
    );
  }
}

function printHelp() {
  console.log(`Usage: node check-agent-readability.mjs [repository] [options]

Audit a repository for coding-agent readability.

Options:
  --format <text|json>  Report format (default: text)
  --min-score <0-100>   Override the configured passing score
  --generate-map        Generate .agent/repo-map.json from maintained metadata
  --fingerprint         Print only the current source fingerprint
  --version             Print checker version
  -h, --help            Show this help`);
}

export function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        format: { type: "string", default: "text" },
        "min-score": { type: "string" },
        "generate-map": { type: "boolean", default: false },
        fingerprint: { type: "boolean", default: false },
        version: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 2;
  }

  if (parsed.values.help) {
    printHelp();
    return 0;
  }
  if (parsed.values.version) {
    console.log(TOOL_VERSION);
    return 0;
  }
  if (parsed.positionals.length > 1) {
    console.error("error: only one repository path may be provided");
    return 2;
  }
  if (!["text", "json"].includes(parsed.values.format)) {
    console.error("error: --format must be text or json");
    return 2;
  }
  if (parsed.values.fingerprint && parsed.values["generate-map"]) {
    console.error("error: --fingerprint and --generate-map cannot be combined");
    return 2;
  }

  let minimumScore;
  if (parsed.values["min-score"] !== undefined) {
    minimumScore = Number(parsed.values["min-score"]);
    if (!Number.isFinite(minimumScore)) {
      console.error("error: --min-score must be a number");
      return 2;
    }
  }

  try {
    const root = validateRepositoryRoot(parsed.positionals[0] ?? ".");
    if (parsed.values.fingerprint) {
      const config = loadConfig(root);
      const sourceFiles = discoverSourceFiles(root, config);
      console.log(computeSourceFingerprint(root, sourceFiles));
      return 0;
    }
    if (parsed.values["generate-map"]) {
      const generated = generateRepositoryMap(root);
      console.log(`Generated ${generated.path}`);
      return 0;
    }

    const result = auditRepository(root, minimumScore);
    if (parsed.values.format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printText(result);
    }
    return result.passed ? 0 : 1;
  } catch (error) {
    if (error instanceof ConfigError || error?.code) {
      console.error(`error: ${error.message}`);
      return 2;
    }
    throw error;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  process.exitCode = main();
}
