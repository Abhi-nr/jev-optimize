import { mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import fetch from "node-fetch";
import { execa } from "execa";
import type { AppConfig } from "./config.js";
import type {
  FindSkillsInput,
  SkillInfo,
  InstallSkillOutput,
  InstalledSkill,
} from "./types.js";

export class SkillsManager {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async findSkills(
    input: FindSkillsInput
  ): Promise<SkillInfo[]> {
    const url = new URL(
      `${this.config.skillsShBaseUrl}/api/skills`
    );
    if (input.query) {
      url.searchParams.set("q", input.query);
    }
    if (input.task_domain) {
      url.searchParams.set("domain", input.task_domain);
    }

    try {
      const res = await fetch(url.toString(), {
        timeout: 5000,
      });
      if (!res.ok) {
        return [];
      }
      const json = await res.json();
      const items: unknown[] = Array.isArray(json)
        ? json
        : json.skills ?? [];
      return items
        .map((x) => {
          const obj = x as Record<string, unknown>;
          return {
            name: String(obj.name ?? ""),
            description: String(obj.description ?? ""),
            repo_url: String(obj.repo_url ?? obj.html_url ?? ""),
            install_url: String(
              obj.install_url ?? obj.html_url ?? ""
            ),
            stars:
              typeof obj.stars === "number"
                ? Math.floor(obj.stars)
                : undefined,
            tags: Array.isArray(obj.tags)
              ? obj.tags.map((t) => String(t))
              : undefined,
          } as SkillInfo;
        })
        .filter((s) => s.name && s.install_url);
    } catch {
      return [];
    }
  }

  async installSkill(
    skillUrl: string
  ): Promise<InstallSkillOutput> {
    try {
      await mkdir(this.config.skillsCacheDir, {
        recursive: true,
      });
      const { stdout, stderr } = await execa(
        "npx",
        ["skills", "add", skillUrl],
        {
          cwd: this.config.skillsCacheDir,
          timeout: 60000,
        }
      );
      const pathMatch = stdout.match(
        /installed.*?\s+(\/[^\s]+)/i
      );
      const path = pathMatch ? pathMatch[1] : skillUrl;
      return {
        success: true,
        path,
      };
    } catch (err) {
      const e = err as Error & { stderr?: string };
      return {
        success: false,
        error: e.stderr ?? e.message,
      };
    }
  }

  async listInstalledSkills(): Promise<InstalledSkill[]> {
    try {
      const entries = await readdir(this.config.skillsCacheDir, {
        withFileTypes: true,
      });
      const skills: InstalledSkill[] = [];
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const skillPath = join(
          this.config.skillsCacheDir,
          e.name
        );
        let version: string | undefined;
        try {
          const pkgRaw = await readFile(
            join(skillPath, "package.json"),
            "utf-8"
          );
          const pkg = JSON.parse(pkgRaw) as {
            version?: string;
          };
          version = pkg.version;
        } catch {
          // ignore
        }
        skills.push({
          name: e.name,
          path: skillPath,
          version,
        });
      }
      return skills;
    } catch {
      return [];
    }
  }

  async updateSkills(
    updateAll: boolean
  ): Promise<{ updated: string[]; errors: string[] }> {
    const installed = await this.listInstalledSkills();
    const updated: string[] = [];
    const errors: string[] = [];

    for (const s of installed) {
      if (!updateAll) {
        continue;
      }
      try {
        await execa("npx", ["skills", "update", s.name], {
          cwd: this.config.skillsCacheDir,
          timeout: 60000,
        });
        updated.push(s.name);
      } catch (err) {
        const e = err as Error;
        errors.push(`${s.name}: ${e.message}`);
      }
    }

    return { updated, errors };
  }
}