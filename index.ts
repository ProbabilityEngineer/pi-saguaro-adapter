import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

async function hasCommand(pi: ExtensionAPI, name: string): Promise<boolean> {
	const { code } = await pi.exec("bash", [
		"-lc",
		`command -v ${name} >/dev/null 2>&1`,
	]);
	return code === 0;
}

async function gitRoot(
	pi: ExtensionAPI,
	cwd: string,
): Promise<string | undefined> {
	const { stdout, code } = await pi.exec(
		"git",
		["rev-parse", "--show-toplevel"],
		{ cwd },
	);
	return code === 0 ? stdout.trim() || undefined : undefined;
}

async function gitHead(
	pi: ExtensionAPI,
	cwd: string,
): Promise<string | undefined> {
	const { stdout, code } = await pi.exec("git", ["rev-parse", "HEAD"], { cwd });
	return code === 0 ? stdout.trim() || undefined : undefined;
}

async function gitDiff(pi: ExtensionAPI, cwd: string): Promise<string> {
	const { stdout } = await pi.exec(
		"git",
		["diff", "--no-ext-diff", "--ignore-submodules=dirty", "HEAD"],
		{ cwd },
	);
	return stdout;
}

async function runSagReview(
	pi: ExtensionAPI,
	cwd: string,
): Promise<{ output: string; code: number }> {
	const { stdout, stderr, code } = await pi.exec("sag", ["review"], {
		cwd,
		timeout: 10 * 60 * 1000,
	});
	return {
		output: [stdout.trim(), stderr.trim()].filter(Boolean).join("\n"),
		code,
	};
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
		if (ctx.hasUI) ctx.ui.notify("Saguaro turn_end check…", "info");

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
			const result = await pi.exec("sag", ["rules", ...parts], {
				cwd: state.repoRoot!,
				timeout: 60_000,
			});
			ctx.ui.notify(
				result.stdout?.trim() ||
					result.stderr?.trim() ||
					"Saguaro rules updated.",
				result.code === 0 ? "info" : "warning",
			);
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
