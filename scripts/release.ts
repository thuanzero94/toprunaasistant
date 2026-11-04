#!/usr/bin/env node
/**
 * TOPRunAssistant - Release Versioning & AI Changelog Generator
 *
 * Rules & Features:
 * - CalVer YY.MM.Ver versioning scheme (e.g. 26.11.0, 26.11.1).
 * - Extracts git commit history from previous git tag (or initial commit) to HEAD.
 * - Uses `agy` CLI to synthesize clean, categorized GitHub-style markdown release notes.
 * - Built-in Conventional Commits fallback parser if `agy` CLI is unavailable.
 * - Updates root CHANGELOG.md, root package.json, and all monorepo workspace package.json files.
 * - Verifies clean git working tree, creates git commit & annotated tag, and pushes to remote.
 * - Supports --dry-run, --allow-dirty, --skip-push flags.
 */

import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function logInfo(msg: string): void {
  console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`);
}

function logSuccess(msg: string): void {
  console.log(`${colors.green}✔ ${msg}${colors.reset}`);
}

function logWarn(msg: string): void {
  console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
}

function logError(msg: string): void {
  console.error(`${colors.red}✖ ${msg}${colors.reset}`);
}

function runGit(args: string[], silent = false): string {
  try {
    const stdout = execFileSync('git', args, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
    });
    return stdout.trim();
  } catch (error: any) {
    if (!silent) {
      logError(`Git command failed: git ${args.join(' ')}`);
      if (error.stderr) console.error(error.stderr.toString());
    }
    throw error;
  }
}

/**
 * Returns latest git tag if present, or null if no tags exist
 */
function getLatestTag(): string | null {
  try {
    const latest = runGit(['describe', '--tags', '--abbrev=0'], true);
    return latest || null;
  } catch {
    // Fallback: check if any tag exists
    try {
      const tags = runGit(['tag', '--sort=-creatordate'], true)
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);
      return tags.length > 0 ? tags[0] : null;
    } catch {
      return null;
    }
  }
}

/**
 * Computes default CalVer YY.MM.Ver based on current year/month
 */
function computeNextCalVer(latestTag: string | null): string {
  const now = new Date();
  const currentYY = String(now.getFullYear()).slice(-2);
  const currentMM = String(now.getMonth() + 1).padStart(2, '0');
  const targetPrefix = `${currentYY}.${currentMM}`;

  if (!latestTag) {
    return `${targetPrefix}.0`;
  }

  // Parse existing tag: e.g. v26.11.0 or 26.11.0
  const match = latestTag.match(/^v?(\d{2})\.(\d{1,2})\.(\d+)$/);
  if (match) {
    const [, tagYY, tagMM, tagVer] = match;
    const paddedTagMM = tagMM.padStart(2, '0');
    if (tagYY === currentYY && paddedTagMM === currentMM) {
      const nextVer = parseInt(tagVer, 10) + 1;
      return `${targetPrefix}.${nextVer}`;
    }
  }

  return `${targetPrefix}.0`;
}

/**
 * Retrieves commit list between latest tag and HEAD (or all commits if no tag)
 */
function getCommits(latestTag: string | null): Array<{ hash: string; subject: string; author: string }> {
  const gitArgs = latestTag
    ? ['log', `${latestTag}..HEAD`, '--pretty=format:%h%x09%s%x09%an']
    : ['log', '--pretty=format:%h%x09%s%x09%an'];

  try {
    const output = runGit(gitArgs, true);
    if (!output) return [];
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [hash, subject, author] = line.split('\t');
        return { hash, subject: subject || '', author: author || '' };
      });
  } catch (err) {
    logError('Failed to retrieve git commit history');
    throw err;
  }
}

/**
 * Conventional Commits Fallback Parser
 */
function generateFallbackChangelog(
  commits: Array<{ hash: string; subject: string; author: string }>,
  version: string
): string {
  const features: string[] = [];
  const fixes: string[] = [];
  const performance: string[] = [];
  const refactors: string[] = [];
  const breaking: string[] = [];
  const chores: string[] = [];
  const others: string[] = [];

  for (const c of commits) {
    const msg = c.subject;
    const entry = `- ${msg} (\`${c.hash}\` by ${c.author})`;

    if (msg.includes('BREAKING CHANGE:') || /^[a-z]+(\([a-z0-9_-]+\))?!:/.test(msg)) {
      breaking.push(entry);
    } else if (/^feat(\([a-z0-9_-]+\))?:/i.test(msg)) {
      features.push(entry);
    } else if (/^fix(\([a-z0-9_-]+\))?:/i.test(msg)) {
      fixes.push(entry);
    } else if (/^perf(\([a-z0-9_-]+\))?:/i.test(msg)) {
      performance.push(entry);
    } else if (/^refactor(\([a-z0-9_-]+\))?:/i.test(msg)) {
      refactors.push(entry);
    } else if (/^(docs|chore|style|test|ci|build)(\([a-z0-9_-]+\))?:/i.test(msg)) {
      chores.push(entry);
    } else {
      others.push(entry);
    }
  }

  const sections: string[] = [];

  if (breaking.length > 0) {
    sections.push(`### ⚠️ Breaking Changes\n\n${breaking.join('\n')}`);
  }
  if (features.length > 0) {
    sections.push(`### 🚀 Features\n\n${features.join('\n')}`);
  }
  if (fixes.length > 0) {
    sections.push(`### 🐛 Bug Fixes\n\n${fixes.join('\n')}`);
  }
  if (performance.length > 0) {
    sections.push(`### ⚡ Performance & Optimization\n\n${performance.join('\n')}`);
  }
  if (refactors.length > 0) {
    sections.push(`### ♻️ Refactoring & Code Quality\n\n${refactors.join('\n')}`);
  }
  if (chores.length > 0) {
    sections.push(`### 📝 Documentation & Chores\n\n${chores.join('\n')}`);
  }
  if (others.length > 0) {
    sections.push(`### 📦 Other Changes\n\n${others.join('\n')}`);
  }

  return sections.join('\n\n') || '- Minor internal improvements and maintenance.';
}

/**
 * Generate changelog via agy CLI, falling back to regex parser
 */
function generateChangelogWithAgy(
  commits: Array<{ hash: string; subject: string; author: string }>,
  version: string
): string {
  if (commits.length === 0) {
    return '- No code changes in this release.';
  }

  logInfo(`Synthesizing release changelog for v${version} via agy CLI...`);

  const commitListStr = commits
    .map((c) => `- ${c.hash}: ${c.subject} (${c.author})`)
    .join('\n');

  const prompt = [
    `You are an expert technical release engineer writing release notes for version v${version}.`,
    `Below is the list of git commits since the previous release:`,
    '',
    commitListStr,
    '',
    `Instructions:`,
    `1. Generate release notes strictly in clean, professional GitHub-flavored Markdown.`,
    `2. Categorize the items under these exact headings (omit empty headings):`,
    `   - ### 🚀 Features`,
    `   - ### 🐛 Bug Fixes`,
    `   - ### ⚡ Performance & Optimization`,
    `   - ### ♻️ Refactoring & Code Quality`,
    `   - ### ⚠️ Breaking Changes`,
    `   - ### 📝 Documentation & Chores`,
    '3. Write concise, meaningful bullet points in English explaining the user/developer impact. Include commit hash references where appropriate (e.g. `abc1234`).',
    `4. Output ONLY the markdown release notes content without conversational intro or outro.`,
  ].join('\n');

  try {
    // Run agy with print flag
    const agyCommand = process.platform === 'win32' ? 'agy.exe' : 'agy';
    const result = spawnSync(agyCommand, ['--print', prompt], {
      encoding: 'utf-8',
      timeout: 120000,
    });

    if (result.status === 0 && result.stdout && result.stdout.trim().length > 0) {
      logSuccess('Changelog successfully synthesized by agy CLI!');
      let cleanOutput = result.stdout.trim();
      // Remove possible markdown fenced blocks wrapping the entire output if agy wrapped it
      if (cleanOutput.startsWith('```markdown') && cleanOutput.endsWith('```')) {
        cleanOutput = cleanOutput.slice(11, -3).trim();
      }
      return cleanOutput;
    } else {
      logWarn('agy CLI execution returned empty or non-zero exit code. Switching to fallback parser.');
      if (result.stderr) console.error(result.stderr);
      return generateFallbackChangelog(commits, version);
    }
  } catch (err: any) {
    logWarn(`agy CLI invocation failed (${err?.message || err}). Switching to fallback parser.`);
    return generateFallbackChangelog(commits, version);
  }
}

function cleanReleaseNotes(raw: string): string {
  let cleaned = raw.trim();
  // Strip redundant top-level # Release ... heading if generated
  cleaned = cleaned.replace(/^#\s+(?:Release\s+)?v?\d+(?:\.\d+)*\s*\n+/i, '');
  return cleaned.trim();
}

/**
 * Updates CHANGELOG.md file
 */
function updateChangelogFile(changelogPath: string, version: string, releaseNotes: string, dryRun: boolean): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const newReleaseHeader = `## [v${version}] - ${dateStr}`;
  const cleanedNotes = cleanReleaseNotes(releaseNotes);
  const newReleaseSection = `${newReleaseHeader}\n\n${cleanedNotes}\n`;

  let content = '';
  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, 'utf-8');
  } else {
    content = `# Changelog\n\nAll notable changes to the TOPRunAssistant monorepo are documented in this file.\n\n`;
  }

  // Prepend new release after initial title/description
  let updatedContent = '';
  const titleMatch = content.match(/^# Changelog.*?\n\n/s);
  if (titleMatch) {
    const headerPart = titleMatch[0];
    const rest = content.slice(headerPart.length);
    updatedContent = `${headerPart}${newReleaseSection}\n---\n\n${rest}`;
  } else {
    updatedContent = `# Changelog\n\n${newReleaseSection}\n---\n\n${content}`;
  }

  if (dryRun) {
    logInfo(`[Dry Run] Would update ${changelogPath} with ${newReleaseHeader}`);
  } else {
    fs.writeFileSync(changelogPath, updatedContent, 'utf-8');
    logSuccess(`Updated ${changelogPath}`);
  }
}

/**
 * Discover and update all package.json files
 */
function updatePackageJsonVersions(rootDir: string, version: string, dryRun: boolean): string[] {
  const targetFiles: string[] = [
    path.join(rootDir, 'package.json'),
    path.join(rootDir, 'apps', 'api', 'package.json'),
    path.join(rootDir, 'apps', 'mobile', 'package.json'),
    path.join(rootDir, 'apps', 'web', 'package.json'),
    path.join(rootDir, 'packages', 'database', 'package.json'),
    path.join(rootDir, 'packages', 'shared', 'package.json'),
  ];

  const updatedFiles: string[] = [];

  for (const file of targetFiles) {
    if (!fs.existsSync(file)) continue;

    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const pkg = JSON.parse(raw);
      pkg.version = version;
      const serialized = JSON.stringify(pkg, null, 2) + '\n';

      if (dryRun) {
        logInfo(`[Dry Run] Would update ${path.relative(rootDir, file)} version to "${version}"`);
      } else {
        fs.writeFileSync(file, serialized, 'utf-8');
        logSuccess(`Updated ${path.relative(rootDir, file)} -> v${version}`);
      }
      updatedFiles.push(file);
    } catch (err: any) {
      logError(`Failed to update ${file}: ${err.message}`);
    }
  }

  return updatedFiles;
}

/**
 * Interactive prompt helper
 */
async function promptQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Main release script entrypoint
 */
async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');

  // Command-line flag parsing
  const rawArgs = process.argv.slice(2);
  const isDryRun = rawArgs.includes('--dry-run');
  const allowDirty = rawArgs.includes('--allow-dirty');
  const skipPush = rawArgs.includes('--skip-push');
  const showHelp = rawArgs.includes('--help') || rawArgs.includes('-h');

  if (showHelp) {
    console.log(`
${colors.bold}TOPRunAssistant Release Script${colors.reset}

Usage:
  npm run release [version] [flags]
  npx tsx scripts/release.ts [version] [flags]

Flags:
  --dry-run        Simulate the release process without modifying files, tagging, or pushing
  --allow-dirty    Allow releasing even with uncommitted changes in git
  --skip-push      Do not push git commits and tags to remote
  -h, --help       Show this help message

Version format:
  CalVer: YY.MM.Ver (e.g. 26.11.0, 26.11.1)
  If omitted, automatically computes the next CalVer for the current month.
`);
    process.exit(0);
  }

  const explicitVersionArg = rawArgs.find((arg) => !arg.startsWith('--'));

  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold} 🏃 TOPRunAssistant Release Assistant (CalVer + agy CLI) ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  if (isDryRun) {
    logWarn('DRY-RUN MODE ENABLED: No files will be permanently modified, no git tags will be created or pushed.\n');
  }

  // 1. Check Git Status
  if (!allowDirty) {
    const status = runGit(['status', '--porcelain'], true);
    if (status.length > 0) {
      logError('Git working tree has uncommitted changes!');
      console.log(status);
      console.log(`\nPlease commit or stash your changes before releasing, or use ${colors.yellow}--allow-dirty${colors.reset}.`);
      process.exit(1);
    }
  }

  // 2. Determine Latest Tag & Next Version
  const latestTag = getLatestTag();
  const currentBranch = runGit(['branch', '--show-current'], true) || 'main';
  logInfo(`Current branch: ${colors.bold}${currentBranch}${colors.reset}`);
  logInfo(`Latest release tag: ${colors.bold}${latestTag || 'None (Initial Release)'}${colors.reset}`);

  const suggestedVersion = computeNextCalVer(latestTag);
  let targetVersion = explicitVersionArg;

  if (targetVersion) {
    // Strip leading 'v' if user typed v26.11.0
    targetVersion = targetVersion.replace(/^v/, '');
  } else {
    // If running in interactive terminal, confirm or allow custom input
    if (process.stdin.isTTY) {
      const answer = await promptQuestion(
        `\nTarget version to release [${colors.green}${suggestedVersion}${colors.reset}]: `
      );
      targetVersion = answer ? answer.replace(/^v/, '') : suggestedVersion;
    } else {
      targetVersion = suggestedVersion;
    }
  }

  // Validate CalVer or SemVer
  if (!/^\d{2}\.\d{1,2}\.\d+$/.test(targetVersion) && !/^\d+\.\d+\.\d+$/.test(targetVersion)) {
    logError(`Invalid version format: "${targetVersion}". Expected CalVer YY.MM.Ver (e.g. 26.11.0)`);
    process.exit(1);
  }

  const tagName = `v${targetVersion}`;
  logInfo(`Release target version: ${colors.bold}${colors.magenta}${targetVersion}${colors.reset} (${tagName})`);

  // Check if tag already exists
  try {
    const existing = runGit(['rev-parse', tagName], true);
    if (existing) {
      logError(`Git tag "${tagName}" already exists! Please choose a higher version.`);
      process.exit(1);
    }
  } catch {
    // Expected: tag does not exist yet
  }

  // 3. Extract Commits
  const commits = getCommits(latestTag);
  logInfo(`Found ${colors.bold}${commits.length}${colors.reset} commit(s) since ${latestTag || 'initial commit'}.`);

  if (commits.length === 0) {
    logWarn('No new commits found since last tag.');
    if (process.stdin.isTTY) {
      const cont = await promptQuestion('Do you still want to proceed with release? (y/N): ');
      if (cont.toLowerCase() !== 'y') {
        logInfo('Release aborted.');
        process.exit(0);
      }
    }
  }

  // 4. Generate Changelog with agy CLI
  const changelogText = generateChangelogWithAgy(commits, targetVersion);

  console.log(`\n${colors.dim}--- Generated Changelog Preview ---${colors.reset}`);
  console.log(changelogText);
  console.log(`${colors.dim}-----------------------------------${colors.reset}\n`);

  // 5. Update Monorepo Files
  logInfo('Updating monorepo files...');
  updateChangelogFile(changelogPath, targetVersion, changelogText, isDryRun);
  const updatedPkgFiles = updatePackageJsonVersions(rootDir, targetVersion, isDryRun);

  if (isDryRun) {
    logSuccess(`\n[Dry Run Completed] Version v${targetVersion} verified successfully.`);
    process.exit(0);
  }

  // 6. Git Commit, Tag, Push
  logInfo('Staging files for release commit...');
  const filesToStage = ['CHANGELOG.md', 'package.json', 'package-lock.json'];
  for (const pkgFile of updatedPkgFiles) {
    filesToStage.push(path.relative(rootDir, pkgFile));
  }

  runGit(['add', ...new Set(filesToStage)]);

  const commitMsg = `chore(release): ${tagName}`;
  logInfo(`Creating release commit: "${commitMsg}"`);
  runGit(['commit', '-m', commitMsg]);

  logInfo(`Creating annotated git tag: "${tagName}"`);
  runGit(['tag', '-a', tagName, '-m', `Release ${tagName}`]);
  logSuccess(`Git commit & tag created: ${tagName}`);

  if (skipPush) {
    logWarn(`Skipping git push due to --skip-push flag.`);
  } else {
    logInfo(`Pushing commit & tags to remote (${currentBranch})...`);
    runGit(['push', 'origin', currentBranch, '--tags']);
    logSuccess('Pushed successfully to remote origin!');
  }

  console.log(`\n${colors.bold}${colors.green}🎉 Successfully released ${tagName}!${colors.reset}\n`);
}

main().catch((err) => {
  logError(`Release failed: ${err.message || err}`);
  process.exit(1);
});
