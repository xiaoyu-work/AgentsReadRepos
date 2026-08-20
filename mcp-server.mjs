#!/usr/bin/env node

/**
 * @agent-file
 * @agent-purpose: Exposes repository migration guidance, task selection, map generation, and auditing through MCP.
 * @agent-public-api: createServer, selectNextTask, resolveRepository
 * @agent-invariants: Every repository path remains inside the configured MCP root and stdout carries protocol traffic only.
 * @agent-side-effects: Reads repositories; generate_repository_map writes .agent/repo-map.json; logs startup errors to stderr.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

import {
  TOOL_VERSION,
  auditRepository,
  generateRepositoryMap,
} from "./check-agent-readability.mjs";

const SERVER_NAME = "agent-readable-repository";
const SERVER_VERSION = "1.0.0";
const TOOL_ROOT = path.dirname(fileURLToPath(import.meta.url));
const STANDARD_URI = "agent-readable://standard";
const PROMPT_URI = "agent-readable://migration-prompt";
const TEMPLATE_URI = "agent-readable://root-agents-template";

const repositoryInputSchema = z.object({
  repository: z
    .string()
    .optional()
    .describe(
      "Repository path relative to the MCP server's configured root. Defaults to the configured root.",
    ),
});

function readToolkitFile(filename) {
  return fs.readFileSync(path.join(TOOL_ROOT, filename), "utf8");
}

function migrationInstructions() {
  const document = readToolkitFile("CODING_AGENT_PROMPT.md");
  const fenced = document.match(/```text\s*\n([\s\S]*?)\n```/);
  const prompt = fenced ? fenced[1] : document;
  return prompt
    .replace(
      /node "<CHECKER_PATH>" \. --generate-map/g,
      "Call the MCP tool generate_repository_map.",
    )
    .replace(
      /node "<CHECKER_PATH>" \./g,
      "Call the MCP tool audit_repository.",
    );
}

function normalizedForComparison(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isInsideRoot(root, candidate) {
  const normalizedRoot = normalizedForComparison(root);
  const normalizedCandidate = normalizedForComparison(candidate);
  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`)
  );
}

export function resolveRepository(allowedRoot, requestedPath = ".") {
  if (typeof requestedPath !== "string" || requestedPath.trim() === "") {
    throw new Error("repository must be a non-empty path");
  }
  const candidate = path.resolve(allowedRoot, requestedPath);
  let realCandidate;
  try {
    realCandidate = fs.realpathSync(candidate);
  } catch {
    throw new Error(`repository does not exist: ${candidate}`);
  }
  if (!isInsideRoot(allowedRoot, realCandidate)) {
    throw new Error(
      `repository resolves outside the configured MCP root: ${requestedPath}`,
    );
  }
  if (!fs.statSync(realCandidate).isDirectory()) {
    throw new Error(`repository is not a directory: ${realCandidate}`);
  }
  return realCandidate;
}

function findingsFor(result, predicate) {
  return result.findings.filter(
    (finding) => finding.severity === "error" && predicate(finding),
  );
}

function task(phase, target, instruction, findings = []) {
  return {
    phase,
    target,
    instruction,
    findings: findings.map(({ code, path: findingPath, message }) => ({
      code,
      path: findingPath,
      message,
    })),
  };
}

export function selectNextTask(result) {
  const rootFindings = findingsFor(result, (finding) =>
    finding.code.startsWith("ROOT_"),
  );
  if (rootFindings.length > 0) {
    return task(
      "global-agent-prompt",
      "AGENTS.md",
      "Create or repair the single root AGENTS.md as a global prompt. Keep architecture and module details out of it. After completing this file, call next_migration_task again.",
      rootFindings,
    );
  }

  const architectureFindings = findingsFor(result, (finding) =>
    finding.code.startsWith("ARCHITECTURE_"),
  );
  if (architectureFindings.length > 0) {
    return task(
      "project-architecture",
      "ARCHITECTURE.md",
      "Create or repair the root architecture document using verified source facts. Do not include agent workflow instructions. After completing it, call next_migration_task again.",
      architectureFindings,
    );
  }

  const oversized = findingsFor(
    result,
    (finding) => finding.code === "FILE_TOO_LARGE",
  );
  if (oversized.length > 0) {
    const current = oversized[0];
    return task(
      "single-file-refactor",
      current.path,
      "Process only this file and its directory. Split only at a natural, testable responsibility boundary, keep extracted files in the same directory, repair references, run relevant validation, and update affected metadata. If a safe split is impossible, add one narrow justified exemption. Do not start another file before calling next_migration_task.",
      oversized.filter((finding) => finding.path === current.path),
    );
  }

  const moduleFindings = findingsFor(
    result,
    (finding) => finding.code.startsWith("MODULE_"),
  );
  if (moduleFindings.length > 0) {
    const current = moduleFindings[0];
    const target = current.path.endsWith("MODULE.md")
      ? current.path
      : `${current.path}/MODULE.md`;
    return task(
      "module-guide",
      target,
      "Create or repair only this module guide using facts local to the module. Do not duplicate project-wide architecture. After completing it, call next_migration_task again.",
      moduleFindings.filter(
        (finding) =>
          finding.path === current.path ||
          finding.path === target ||
          `${finding.path}/MODULE.md` === target,
      ),
    );
  }

  const headerFindings = findingsFor(result, (finding) =>
    finding.code.startsWith("FILE_HEADER_"),
  );
  if (headerFindings.length > 0) {
    const current = headerFindings[0];
    return task(
      "source-file-header",
      current.path,
      "Update only this source file's first-50-line @agent-* header from verified code facts. Do not list ordinary private helpers. After completing the file, call next_migration_task again.",
      headerFindings.filter((finding) => finding.path === current.path),
    );
  }

  const mapFindings = findingsFor(result, (finding) =>
    finding.code.startsWith("MAP_"),
  );
  if (mapFindings.length > 0) {
    return task(
      "generated-repository-map",
      ".agent/repo-map.json",
      "Call generate_repository_map. Never edit repo-map.json manually. Then call next_migration_task; when it reports complete, call audit_repository once for the final report.",
      mapFindings,
    );
  }

  const remainingErrors = findingsFor(result, () => true);
  if (remainingErrors.length > 0) {
    const current = remainingErrors[0];
    return task(
      "audit-error",
      current.path,
      "Resolve this audit error without broad exclusions or unrelated changes, then call next_migration_task again.",
      [current],
    );
  }

  if (result.passed) {
    return task(
      "complete",
      result.repository,
      "The repository conforms. Call audit_repository once for the final report, then report the score and any explicit exemptions without optional unrelated refactors.",
    );
  }

  const firstWarning = result.findings.find(
    (finding) => finding.severity === "warning",
  );
  return task(
    "score-improvement",
    firstWarning?.path ?? result.repository,
    "The repository has no blocking errors but is below the required score. Address the highest-impact warning without unrelated refactoring, then call audit_repository.",
    firstWarning ? [firstWarning] : [],
  );
}

function auditSummary(result) {
  return {
    repository: result.repository,
    score: result.score,
    minimumScore: result.minimumScore,
    passed: result.passed,
    categories: result.categories,
    metrics: result.metrics,
  };
}

function textResult(value) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorResult(error) {
  return {
    content: [
      {
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true,
  };
}

function parseConfiguredRoot(argv) {
  let root = process.cwd();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--root requires a directory");
      }
      root = value;
      index += 1;
    } else {
      throw new Error(`unknown MCP server argument: ${argument}`);
    }
  }
  const resolved = path.resolve(root);
  const realRoot = fs.realpathSync(resolved);
  if (!fs.statSync(realRoot).isDirectory()) {
    throw new Error(`configured MCP root is not a directory: ${realRoot}`);
  }
  return realRoot;
}

function registerDocumentResource(server, name, uri, filename, description) {
  server.registerResource(
    name,
    uri,
    {
      title: name,
      description,
      mimeType: "text/markdown",
    },
    async (requestedUri) => ({
      contents: [
        {
          uri: requestedUri.href,
          mimeType: "text/markdown",
          text: readToolkitFile(filename),
        },
      ],
    }),
  );
}

export function createServer(allowedRoot) {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerDocumentResource(
    server,
    "Agent-Friendly Repository Standard",
    STANDARD_URI,
    "AGENT_READABILITY_STANDARD.md",
    "Normative repository structure, metadata, scoring, and update rules.",
  );
  registerDocumentResource(
    server,
    "Repository Migration Prompt",
    PROMPT_URI,
    "CODING_AGENT_PROMPT.md",
    "Complete fallback migration instructions.",
  );
  registerDocumentResource(
    server,
    "Root AGENTS Template",
    TEMPLATE_URI,
    "ROOT_AGENTS_TEMPLATE.md",
    "Template for the target repository's single global AGENTS.md.",
  );

  server.registerPrompt(
    "migrate-repository",
    {
      title: "Make Repository Agent-Readable",
      description:
        "Start the complete migration without copying the repository migration prompt manually.",
      argsSchema: repositoryInputSchema,
    },
    ({ repository }) => {
      const root = resolveRepository(allowedRoot, repository);
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Make ${root} agent-readable. Begin by calling start_migration ` +
                "for this repository, follow the returned task one item at a time, " +
                "and continue with next_migration_task until it reports complete.",
            },
          },
        ],
      };
    },
  );

  server.registerTool(
    "start_migration",
    {
      title: "Start Agent-Readability Migration",
      description:
        "Use this first when asked to make a repository agent-readable. Returns the full migration rules, current audit summary, and exactly one next task.",
      inputSchema: repositoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ repository }) => {
      try {
        const root = resolveRepository(allowedRoot, repository);
        const result = auditRepository(root);
        return textResult({
          repository: root,
          instructions: migrationInstructions(),
          audit: auditSummary(result),
          nextTask: selectNextTask(result),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "next_migration_task",
    {
      title: "Get Next Migration Task",
      description:
        "Re-audit after completing one migration item and return exactly one next directory or file task. Call repeatedly until phase is complete.",
      inputSchema: repositoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ repository }) => {
      try {
        const root = resolveRepository(allowedRoot, repository);
        const result = auditRepository(root);
        return textResult({
          audit: auditSummary(result),
          nextTask: selectNextTask(result),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "generate_repository_map",
    {
      title: "Generate Repository Map",
      description:
        "Generate .agent/repo-map.json from valid MODULE.md Purpose sections and source-file @agent-* headers. Never use this before maintained metadata is valid.",
      inputSchema: repositoryInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ repository }) => {
      try {
        const root = resolveRepository(allowedRoot, repository);
        const generated = generateRepositoryMap(root);
        return textResult({
          repository: root,
          generatedPath: generated.path,
          schemaVersion: generated.map.schemaVersion,
          modules: generated.map.modules.length,
          files: generated.map.files.length,
          nextAction:
            "Call next_migration_task. When it reports complete, call audit_repository once for the final report.",
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "audit_repository",
    {
      title: "Audit Agent Readability",
      description:
        "Return the full conformance score and findings. Use after map generation and before declaring migration complete.",
      inputSchema: repositoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ repository }) => {
      try {
        const root = resolveRepository(allowedRoot, repository);
        const result = auditRepository(root);
        return textResult({
          ...result,
          nextTask: selectNextTask(result),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}

async function main() {
  const allowedRoot = parseConfiguredRoot(process.argv.slice(2));
  console.error(
    `${SERVER_NAME} MCP server ${SERVER_VERSION} (auditor ${TOOL_VERSION}) ` +
      `serving ${allowedRoot}`,
  );
  await serveStdio(() => createServer(allowedRoot));
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
