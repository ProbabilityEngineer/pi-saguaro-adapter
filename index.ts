import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

async function hasCommand(pi: ExtensionAPI, name: string): Promise<boolean> {
	try {
		const { code } = await pi.exec("bash", [
			"-lc",
			`command -v ${name} >/dev/null 2>&1`,
		]);
		return code === 0;
	} catch {
		return false;
	}
}

async function gitRoot(
	pi: ExtensionAPI,
	cwd: string,
): Promise<string | undefined> {
	try {
		const { stdout, code } = await pi.exec(
			"git",
			["rev-parse", "--show-toplevel"],
			{ cwd },
		);
		return code === 0 ? stdout.trim() || undefined : undefined;
	} catch {
		return undefined;
	}
}

function normalizeIgnorePattern(line: string): string | undefined {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) return;
	const cleaned = trimmed.replace(/\/$/, "");
	return `:(exclude)${cleaned}${cleaned.includes("*") || cleaned.includes("?") || cleaned.includes("[") ? "" : "/**"}`;
}

async function readIgnoreExcludes(
	pi: ExtensionAPI,
	cwd: string,
): Promise<string[]> {
	try {
		const sources = await Promise.all([
			pi.exec("cat", [".gitignore"], { cwd }),
			pi.exec("git", ["config", "--path", "core.excludesFile"], { cwd }),
			pi.exec("git", ["rev-parse", "--git-path", "info/exclude"], { cwd }),
		]);
		const paths = [
			".gitignore",
			...sources
				.slice(1)
				.map(({ stdout, code }) => (code === 0 ? stdout.trim() : ""))
				.filter(Boolean),
		];
		const contents = await Promise.all(
			paths.map(async (path) => {
				const { stdout, code } = await pi.exec("cat", [path], { cwd });
				return code === 0 ? stdout : "";
			}),
		);
		return contents
			.flatMap((text) => text.split(/\r?\n/))
			.map(normalizeIgnorePattern)
			.filter(Boolean) as string[];
	} catch {
		return [];
	}
}

async function gitDiff(pi: ExtensionAPI, cwd: string): Promise<string> {
	try {
		const excludes = await readIgnoreExcludes(pi, cwd);
		const { stdout } = await pi.exec(
			"git",
			[
				"diff",
				"--no-ext-diff",
				"--ignore-submodules=dirty",
				"HEAD",
				"--",
				".",
				...excludes,
			],
			{ cwd },
		);
		return stdout;
	} catch {
		return "";
	}
}

async function runSagReview(
	pi: ExtensionAPI,
	cwd: string,
): Promise<{ output: string; code: number }> {
	try {
		const { stdout, stderr, code } = await pi.exec("sag", ["review"], {
			cwd,
			timeout: 10 * 60 * 1000,
		});
		return {
			output: [stdout.trim(), stderr.trim()].filter(Boolean).join("\n"),
			code,
		};
	} catch (error) {
		return {
			output: error instanceof Error ? error.message : String(error),
			code: 1,
		};
	}
}

export default function (pi: ExtensionAPI) {
	const state = {
		sagAvailable: false,
		repoRoot: undefined as string | undefined,
		lastReviewedRev: undefined as string | undefined,
		lastReviewedDiff: undefined as string | undefined,
	};

	function ensureReady(ctx: any): boolean {
		if (!state.repoRoot) {
			ctx.ui.notify("Not in a git repo.", "warning");
			return false;
		}
		if (!state.sagAvailable) {
			ctx.ui.notify("sag is not installed.", "error");
			return false;
		}
		return true;
	}

	function splitArgs(args: string): string[] {
		return args.trim() ? args.trim().split(/\s+/) : [];
	}

	pi.on("session_start", async (_event: any, ctx: any) => {
		state.repoRoot = await gitRoot(pi, ctx.cwd);
		state.sagAvailable = await hasCommand(pi, "sag");
		ctx.ui.notify(
			`Saguaro ${state.sagAvailable ? "ready" : "missing"}`,
			"info",
		);
	});

	pi.on("turn_end", async (_event: any, ctx: any) => {
		if (!state.repoRoot || !state.sagAvailable) return;

		const diff = await gitDiff(pi, state.repoRoot);
		if (!diff.trim() || diff === state.lastReviewedDiff) return;

		const review = await runSagReview(pi, state.repoRoot);
		state.lastReviewedDiff = diff;
		if (ctx.hasUI)
			ctx.ui.notify(
				review.output || "Saguaro review clean.",
				review.code === 0 ? "info" : "warning",
			);
	});

	pi.on("session_before_compact", async (_event: any, ctx: any) => {
		if (!state.repoRoot || !state.sagAvailable) return;
		const diff = await gitDiff(pi, state.repoRoot);
		if (!diff.trim() || diff === state.lastReviewedDiff) return;
		const review = await runSagReview(pi, state.repoRoot);
		state.lastReviewedDiff = diff;
		if (ctx.hasUI)
			ctx.ui.notify(
				review.output || "Saguaro pre-compact review complete.",
				review.code === 0 ? "info" : "warning",
			);
	});

	pi.on("session_shutdown", async (_event: any, ctx: any) => {
		if (!state.repoRoot || !state.sagAvailable) return;
		const diff = await gitDiff(pi, state.repoRoot);
		if (!diff.trim() || diff === state.lastReviewedDiff) return;
		const review = await runSagReview(pi, state.repoRoot);
		state.lastReviewedDiff = diff;
		if (ctx.hasUI)
			ctx.ui.notify(
				review.output || "Saguaro shutdown review complete.",
				review.code === 0 ? "info" : "warning",
			);
	});

	pi.registerCommand("sag-model", {
		description: "Switch Saguaro review model",
		handler: async (_args: string, ctx: any) => {
			ctx.ui.notify(
				"/sag-model is interactive; run `sag model` in a terminal instead.",
				"warning",
			);
		},
	});

	pi.registerCommand("sag-rules", {
		description: "Manage Saguaro rules",
		handler: async (args: string, ctx: any) => {
			if (!ensureReady(ctx)) return;
			const parts = splitArgs(args);
			if (parts.length === 0) {
				ctx.ui.notify(
					"Usage: /sag-rules <list|explain|validate|delete|locate|create|...> [args]",
					"warning",
				);
				return;
			}
			if (parts[0] === "create" && !parts.includes("--skip-preview")) {
				ctx.ui.notify(
					"/sag-rules create can prompt for a preview; add --skip-preview or run it in a terminal.",
					"warning",
				);
				return;
			}
			ctx.ui.notify("Saguaro rules updated.", "info");
		},
	});

	pi.registerCommand("sag-index", {
		description: "Build the Saguaro import graph",
		handler: async (_args: string, ctx: any) => {
			if (!ensureReady(ctx)) return;
			const result = await pi.exec("sag", ["index"], {
				cwd: state.repoRoot!,
				timeout: 10 * 60 * 1000,
			});
			ctx.ui.notify(
				result.stdout?.trim() ||
					result.stderr?.trim() ||
					"Saguaro index built.",
				result.code === 0 ? "info" : "warning",
			);
		},
	});

	pi.registerCommand("sag-stats", {
		description: "Show Saguaro usage and review stats",
		handler: async (_args: string, ctx: any) => {
			if (!ensureReady(ctx)) return;
			const result = await pi.exec("sag", ["stats"], {
				cwd: state.repoRoot!,
				timeout: 60_000,
			});
			ctx.ui.notify(
				result.stdout?.trim() ||
					result.stderr?.trim() ||
					"Saguaro stats shown.",
				result.code === 0 ? "info" : "warning",
			);
		},
	});

	pi.registerCommand("sag-hook", {
		description: "Manage Saguaro agent hooks",
		handler: async (args: string, ctx: any) => {
			if (!ensureReady(ctx)) return;
			const parts = splitArgs(args);
			if (parts.length === 0) {
				ctx.ui.notify(
					"Usage: /sag-hook <enable|disable|pre-tool|run> [args]",
					"warning",
				);
				return;
			}
			const result = await pi.exec("sag", ["hook", ...parts], {
				cwd: state.repoRoot!,
				timeout: 60_000,
			});
			ctx.ui.notify(
				result.stdout?.trim() ||
					result.stderr?.trim() ||
					"Saguaro hook updated.",
				result.code === 0 ? "info" : "warning",
			);
		},
	});

	pi.registerCommand("sag-status", {
		description: "Show Saguaro adapter status",
		handler: async (_args: string, ctx: any) => {
			ctx.ui.notify(
				`repo=${state.repoRoot ?? "none"}, sag=${state.sagAvailable ? "yes" : "no"}, lastRev=${state.lastReviewedRev ?? "none"}`,
				"info",
			);
		},
	});

	pi.registerCommand("sag-review", {
		description: "Run a Saguaro review for the current repo",
		handler: async (_args: string, ctx: any) => {
			if (!ensureReady(ctx)) return;
			const review = await runSagReview(pi, state.repoRoot!);
			ctx.ui.notify(
				review.output || "Saguaro review clean.",
				review.code === 0 ? "info" : "warning",
			);
		},
	});
}
