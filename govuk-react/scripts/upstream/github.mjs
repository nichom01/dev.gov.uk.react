// Thin wrapper over the GitHub CLI (preinstalled on GitHub Actions runners;
// authenticates with GH_TOKEN). Keeps the watcher dependency-free.

import { execFileSync } from "node:child_process";

function gh(args, { input, json = true } = {}) {
  const out = execFileSync("gh", args, { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  return json ? (out.trim() ? JSON.parse(out) : null) : out.trim();
}

export function currentRepo() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  return gh(["repo", "view", "--json", "nameWithOwner"]).nameWithOwner;
}

export function createGitHub(repo) {
  const api = (method, path, body) =>
    gh(["api", "-X", method, `repos/${repo}/${path}`, ...(body ? ["--input", "-"] : [])], { input: body ? JSON.stringify(body) : undefined });

  return {
    repo,

    /** All issues (open and closed) with a label, newest first. */
    listIssues(label) {
      return gh(["api", "--paginate", "--slurp", `repos/${repo}/issues?state=all&labels=${encodeURIComponent(label)}&per_page=100`])
        .flat()
        .filter((i) => !i.pull_request);
    },

    createIssue({ title, body, labels, milestone, assignees }) {
      return api("POST", "issues", { title, body, labels, ...(milestone ? { milestone } : {}), ...(assignees?.length ? { assignees } : {}) });
    },

    comment(number, body) {
      return api("POST", `issues/${number}/comments`, { body });
    },

    close(number, reason = "not_planned") {
      return api("PATCH", `issues/${number}`, { state: "closed", state_reason: reason });
    },

    /** Create any missing labels; never changes existing ones (bob:* labels belong to the pipeline). */
    ensureLabels(wanted) {
      const existing = new Set(gh(["api", "--paginate", "--slurp", `repos/${repo}/labels?per_page=100`]).flat().map((l) => l.name));
      for (const l of wanted) if (!existing.has(l.name)) api("POST", "labels", l);
    },

    /** Milestone number for a title, creating it if needed. */
    milestone(title, description) {
      const all = gh(["api", "--paginate", "--slurp", `repos/${repo}/milestones?state=all&per_page=100`]).flat();
      const found = all.find((m) => m.title === title);
      return (found ?? api("POST", "milestones", { title, description })).number;
    },

    /** Record "issue `number` is blocked by `blocker`" (GitHub issue dependencies). */
    addBlockedBy(number, blocker) {
      const { id } = api("GET", `issues/${blocker}`);
      try {
        api("POST", `issues/${number}/dependencies/blocked_by`, { issue_id: id });
      } catch (error) {
        console.warn(`  could not record #${number} blocked by #${blocker}: ${String(error.stderr ?? error.message).trim()}`);
      }
    },

    /** Body of the GitHub release for a govuk-frontend tag, or "" if unavailable. */
    releaseNotes(version) {
      try {
        return gh(["api", `repos/alphagov/govuk-frontend/releases/tags/v${version}`]).body ?? "";
      } catch {
        return "";
      }
    },
  };
}
