import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("Plugin Directory Initialization", () => {
  let previousXdgConfigHome: string | undefined;
  let testConfigHome: string;
  let testPluginDir: string;

  beforeEach(() => {
    previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
    testConfigHome = mkdtempSync(join(tmpdir(), "opencode-cursor-test-"));
    process.env.XDG_CONFIG_HOME = testConfigHome;
    testPluginDir = join(testConfigHome, "opencode", "plugin");

    if (existsSync(testPluginDir)) {
      rmSync(testPluginDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(testConfigHome)) {
      rmSync(testConfigHome, { recursive: true, force: true });
    }
    if (previousXdgConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
    }
  });

  it("should create plugin directory when it does not exist", async () => {
    expect(existsSync(testPluginDir)).toBe(false);
    
    const { ensurePluginDirectory } = await import("../../src/plugin");
    await ensurePluginDirectory();
    
    expect(existsSync(testPluginDir)).toBe(true);
  });

  it("should not fail when plugin directory already exists", async () => {
    mkdirSync(testPluginDir, { recursive: true });
    expect(existsSync(testPluginDir)).toBe(true);
    
    const { ensurePluginDirectory } = await import("../../src/plugin");
    await expect(ensurePluginDirectory()).resolves.toBeUndefined();
  });

  it("should create parent directories recursively", async () => {
    const parentDir = join(testConfigHome, "opencode");
    if (existsSync(parentDir)) {
      rmSync(parentDir, { recursive: true, force: true });
    }
    
    const { ensurePluginDirectory } = await import("../../src/plugin");
    await ensurePluginDirectory();
    
    expect(existsSync(testPluginDir)).toBe(true);
  });
});

describe("Plugin tool-call collection", () => {
  it("collects multiple allowed task calls from one cursor-agent output", async () => {
    const { findAllowedToolCallsInOutput } = await import("../../src/plugin");
    const { createProviderBoundary } = await import("../../src/provider/boundary");
    const { createToolLoopGuard } = await import("../../src/provider/tool-loop-guard");

    const output = [
      ["call_routes", "Inbound API inventory"],
      ["call_clients", "Client API inventory"],
      ["call_contracts", "Contracts/docs/tests inventory"],
      ["call_crosscheck", "API inventory cross-check"],
    ]
      .map(([callId, prompt]) =>
        JSON.stringify({
          type: "tool_call",
          call_id: callId,
          tool_call: {
            taskToolCall: {
              args: { prompt, subagent_type: "build" },
            },
          },
        }),
      )
      .join("\n");

    const boundaryContext: Parameters<typeof findAllowedToolCallsInOutput>[1]["boundaryContext"] = {
      getBoundary: () => createProviderBoundary("v1", "cursor-acp"),
      activateLegacyFallback: () => {},
    };

    const result = await findAllowedToolCallsInOutput(output, {
      toolLoopMode: "opencode",
      allowedToolNames: new Set(["task"]),
      toolSchemaMap: new Map(),
      toolLoopGuard: createToolLoopGuard([], 3),
      boundaryContext,
      responseMeta: { id: "resp-multi-task", created: 123, model: "cursor-acp/auto" },
      subagentNames: ["build"],
    });

    expect(result.terminationMessage).toBeNull();
    expect(result.toolCalls).toHaveLength(4);
    expect(result.toolCalls.map((toolCall) => toolCall.id)).toEqual([
      "call_routes",
      "call_clients",
      "call_contracts",
      "call_crosscheck",
    ]);
    expect(JSON.parse(result.toolCalls[0].function.arguments).prompt).toBe("Inbound API inventory");
  });
});
