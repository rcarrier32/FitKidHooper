#!/usr/bin/env node
/**
 * Catch ReferenceErrors from missing imports before deploy.
 * Run: node scripts/verify-imports.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import globals from "globals";

const traverse = traverseModule.default ?? traverseModule;
const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

const ALLOWED = new Set([
  ...Object.keys(globals.browser),
  ...Object.keys(globals.es2021),
  "React",
  "require",
  "module",
  "exports",
  "__dirname",
  "__filename",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(path);
  }
  return out;
}

function checkFile(filePath) {
  const code = readFileSync(filePath, "utf8");
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx"],
      errorRecovery: false,
    });
  } catch (err) {
    throw new Error(`${relative(ROOT, filePath)}: parse failed — ${err.message}`);
  }

  const issues = [];
  traverse(ast, {
    ReferencedIdentifier(path) {
      if (!path.isReferencedIdentifier()) return;
      const { name, loc } = path.node;
      if (path.scope.getBinding(name)) return;
      if (ALLOWED.has(name)) return;
      issues.push({ name, line: loc?.start?.line ?? "?" });
    },
  });
  return issues;
}

const files = walk(SRC);
const allIssues = [];

for (const file of files) {
  const issues = checkFile(file);
  for (const issue of issues) {
    allIssues.push({ file: relative(ROOT, file), ...issue });
  }
}

if (allIssues.length) {
  console.error("Missing imports / undefined identifiers:\n");
  for (const { file, name, line } of allIssues) {
    console.error(`  ${file}:${line}  ${name} is not defined`);
  }
  console.error(`\n${allIssues.length} issue(s). Fix imports before shipping.`);
  process.exit(1);
}

console.log(`verify-imports: OK (${files.length} files)`);
