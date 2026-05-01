#!/usr/bin/env node
// packages/create-donotdev/src/index.ts

/**
 * @fileoverview create-donotdev — One command to scaffold a DoNotDev project
 * @description Installs CLI globally (npm -g), scaffolds project, installs deps, prints next steps.
 * On permission failure, exits with platform-specific fix instructions + `dndev init` command.
 *
 * Usage: bunx create-donotdev [project-name]
 *        npx create-donotdev [project-name]
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 * @reminder Run `dn bundle --package create-donotdev` before publishing to keep dist/ in sync.
 */

import { execSync, execFileSync } from 'node:child_process';
import { join } from 'node:path';

import * as clack from '@clack/prompts';

/** Validate project name: letters, numbers, dashes, underscores only. No path traversal. */
const PROJECT_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
function isValidProjectName(name: string): boolean {
  return PROJECT_NAME_REGEX.test(name) && !name.includes('..');
}

clack.intro('DoNotDev — Create a new project');

// Step 1: Install CLI globally via npm (only reliable way to get a global binary on $PATH)
const installSpinner = clack.spinner();
installSpinner.start('Installing @donotdev/cli globally...');

try {
  execSync('npm i -g @donotdev/cli@latest', { stdio: 'pipe' });
  installSpinner.stop('CLI installed globally (dndev)');
} catch {
  installSpinner.stop('Global install failed');

  const isWindows = process.platform === 'win32';
  const shell = process.env.SHELL?.includes('zsh') ? 'zshrc' : 'bashrc';
  const name = process.argv[2] || '<project-name>';

  if (isWindows) {
    clack.log.error(
      'Run this terminal as Administrator and try again.\n\n' +
        'Or install manually:\n' +
        '  npm i -g @donotdev/cli@latest\n' +
        `  dndev init ${name}`
    );
  } else {
    clack.log.error(
      'Permission issue. Pick one:\n\n' +
        '  Option A — quick:\n' +
        '    sudo npm i -g @donotdev/cli@latest\n' +
        `    dndev init ${name}\n\n` +
        '  Option B — fix once, no sudo ever again:\n' +
        '    mkdir -p ~/.npm-global\n' +
        '    npm config set prefix ~/.npm-global\n' +
        `    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.${shell}\n` +
        `    source ~/.${shell}\n` +
        '    npm i -g @donotdev/cli@latest\n' +
        `    dndev init ${name}`
    );
  }
  process.exit(1);
}

// Step 2: Get project name from CLI arg or ask
let projectName = process.argv[2] || '';

// Validate CLI-provided name before using it
if (projectName && !isValidProjectName(projectName)) {
  clack.log.error(
    'Invalid project name. Use only letters, numbers, dashes, underscores.'
  );
  process.exit(1);
}

if (!projectName) {
  const nameInput = await clack.text({
    message: 'Project name?',
    placeholder: 'my-app',
    validate: (value) => {
      const v = value?.trim();
      if (!v) return 'Project name is required';
      if (!/^[a-zA-Z0-9_-]+$/.test(v))
        return 'Use only letters, numbers, dashes, underscores';
      return undefined;
    },
  });

  if (clack.isCancel(nameInput)) {
    clack.outro('Cancelled.');
    process.exit(0);
  }

  projectName = (nameInput as string).trim();

  if (!isValidProjectName(projectName)) {
    clack.log.error(
      'Invalid project name. Use only letters, numbers, dashes, underscores.'
    );
    process.exit(1);
  }
}

// Step 3: Scaffold with dndev init (guaranteed available — we exit on install failure)
clack.log.info(`Scaffolding "${projectName}"...`);

try {
  execFileSync('dndev', ['init', projectName], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
} catch {
  clack.log.error('Scaffolding failed. Check the output above.');
  process.exit(1);
}

// Step 4: Install dependencies
const projectDir = join(process.cwd(), projectName);
clack.log.step('Installing dependencies...');

try {
  execSync('bun install', { stdio: 'inherit', cwd: projectDir });
  clack.log.success('Dependencies installed');
} catch {
  clack.log.warn(
    `Dependencies failed to install. Run manually:\n  cd ${projectName} && bun install`
  );
}

// Step 5: Next steps
clack.note(
  `cd ${projectName}\n` +
    `Open your IDE and tell your AI agent:\n\n` +
    `  "Read AGENTS.md and build my app"\n\n` +
    `Cursor: enable MCP in Settings > Tools & MCP > toggle "donotdev" ON\n` +
    `Claude Code / Windsurf: MCP auto-connects\n\n` +
    `Dev server: dndev dev`,
  'Next Steps'
);

clack.outro('Happy building!');
