import { buildAvailableToolsSystemMessage } from "../../src/plugin";

describe("Plugin MCP system transform", () => {
  it("includes OpenCode tools in the system message", () => {
    const systemMessage = buildAvailableToolsSystemMessage(
      ["read", "write"],
      [{ id: "skill_search", name: "search" }],
      [],
    );

    expect(systemMessage).toContain("read, write");
    expect(systemMessage).toContain("skill_search -> search");
  });

  it("does not advertise MCP tools through mcptool Shell commands", () => {
    const systemMessage = buildAvailableToolsSystemMessage(
      ["read", "write"],
      [],
      [
        {
          type: "function",
          function: { name: "mcp__hybrid_memory__memory_search" },
        },
      ],
      [
        {
          serverName: "hybrid-memory",
          toolName: "memory_search",
          description: "Search memories",
          params: ["query", "limit"],
        },
        {
          serverName: "hybrid-memory",
          toolName: "memory_stats",
          description: "Get stats",
        },
      ],
    );

    expect(systemMessage).not.toContain("mcptool");
    expect(systemMessage).not.toContain("Shell");
    expect(systemMessage).not.toContain("hybrid-memory");
    expect(systemMessage).not.toContain("memory_search");
  });

  it("returns null when only MCP summaries are available", () => {
    const systemMessage = buildAvailableToolsSystemMessage(
      [],
      [],
      [],
      [
        {
          serverName: "hybrid-memory",
          toolName: "memory_stats",
          description: "Get stats",
        },
        {
          serverName: "test-filesystem",
          toolName: "list_directory",
          description: "List dir",
          params: ["path"],
        },
      ],
    );

    expect(systemMessage).toBeNull();
  });

  it("returns null when no tools at all", () => {
    const result = buildAvailableToolsSystemMessage([], [], []);
    expect(result).toBeNull();
  });
});
