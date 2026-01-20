/**
 * Skills Installer Utility
 *
 * Copies bundled skills from app resources to user's ~/.claude/skills/ directory.
 * This enables the Agent SDK to discover and use skills via settingSources: ["user"].
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the path to bundled skills directory.
 * In development: project_root/skills
 * In production: resources/skills (packaged with app)
 */
function getBundledSkillsPath(): string {
  // Go up from dist/electron/utils to project root
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  const devPath = path.join(projectRoot, 'skills');

  // Check if we're in development (skills folder at project root)
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  // Production: skills bundled in resources
  const prodPath = path.join(process.resourcesPath || projectRoot, 'skills');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // Fallback to project root
  return devPath;
}

/**
 * Get the user's skills directory path.
 * ~/.claude/skills/ on all platforms
 */
function getUserSkillsPath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'skills');
}

/**
 * Recursively copy a directory.
 */
function copyDirectorySync(src: string, dest: string): void {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Result of skills installation.
 */
export interface SkillsInstallResult {
  success: boolean;
  installedSkills: string[];
  skippedSkills: string[];
  errors: string[];
  userSkillsPath: string;
  bundledSkillsPath: string;
}

/**
 * Install bundled skills to user's ~/.claude/skills/ directory.
 * Only copies skills that don't already exist (to preserve user customizations).
 *
 * @param force - If true, overwrite existing skills
 * @returns Installation result with details
 */
export function installBundledSkills(force: boolean = false): SkillsInstallResult {
  const result: SkillsInstallResult = {
    success: true,
    installedSkills: [],
    skippedSkills: [],
    errors: [],
    userSkillsPath: getUserSkillsPath(),
    bundledSkillsPath: getBundledSkillsPath(),
  };

  try {
    // Check if bundled skills directory exists
    if (!fs.existsSync(result.bundledSkillsPath)) {
      result.errors.push(`Bundled skills directory not found: ${result.bundledSkillsPath}`);
      result.success = false;
      return result;
    }

    // Create ~/.claude/skills/ if it doesn't exist
    if (!fs.existsSync(result.userSkillsPath)) {
      fs.mkdirSync(result.userSkillsPath, { recursive: true });
      console.log(`[SkillsInstaller] Created user skills directory: ${result.userSkillsPath}`);
    }

    // Get list of bundled skills (directories containing SKILL.md)
    const bundledEntries = fs.readdirSync(result.bundledSkillsPath, { withFileTypes: true });

    for (const entry of bundledEntries) {
      if (!entry.isDirectory()) continue;

      const skillName = entry.name;
      const bundledSkillPath = path.join(result.bundledSkillsPath, skillName);
      const userSkillPath = path.join(result.userSkillsPath, skillName);
      const skillMdPath = path.join(bundledSkillPath, 'SKILL.md');

      // Skip if not a valid skill (no SKILL.md)
      if (!fs.existsSync(skillMdPath)) {
        continue;
      }

      // Check if skill already exists in user directory
      if (fs.existsSync(userSkillPath) && !force) {
        result.skippedSkills.push(skillName);
        continue;
      }

      try {
        // Copy the skill directory
        copyDirectorySync(bundledSkillPath, userSkillPath);
        result.installedSkills.push(skillName);
        console.log(`[SkillsInstaller] Installed skill: ${skillName}`);
      } catch (copyError) {
        const message = copyError instanceof Error ? copyError.message : String(copyError);
        result.errors.push(`Failed to install skill ${skillName}: ${message}`);
      }
    }

    console.log(`[SkillsInstaller] Installation complete:`, {
      installed: result.installedSkills.length,
      skipped: result.skippedSkills.length,
      errors: result.errors.length,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Skills installation failed: ${message}`);
    result.success = false;
  }

  return result;
}

/**
 * Check if skills are installed in user directory.
 */
export function areSkillsInstalled(): boolean {
  const userSkillsPath = getUserSkillsPath();

  if (!fs.existsSync(userSkillsPath)) {
    return false;
  }

  // Check if there's at least one skill directory
  const entries = fs.readdirSync(userSkillsPath, { withFileTypes: true });
  return entries.some(entry => {
    if (!entry.isDirectory()) return false;
    const skillMdPath = path.join(userSkillsPath, entry.name, 'SKILL.md');
    return fs.existsSync(skillMdPath);
  });
}

/**
 * Get list of installed skills in user directory.
 */
export function getInstalledSkills(): string[] {
  const userSkillsPath = getUserSkillsPath();

  if (!fs.existsSync(userSkillsPath)) {
    return [];
  }

  const skills: string[] = [];
  const entries = fs.readdirSync(userSkillsPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = path.join(userSkillsPath, entry.name, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      skills.push(entry.name);
    }
  }

  return skills;
}

/**
 * Initialize skills on app startup.
 * Installs bundled skills if not already present.
 */
export function initializeSkills(): SkillsInstallResult {
  console.log('[SkillsInstaller] Initializing skills...');

  if (areSkillsInstalled()) {
    const installed = getInstalledSkills();
    console.log(`[SkillsInstaller] Skills already installed: ${installed.length} skills found`);

    // Still try to install any new bundled skills
    return installBundledSkills(false);
  }

  return installBundledSkills(false);
}
