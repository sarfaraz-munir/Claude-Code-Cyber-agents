# PLAN: Ship a Real MCP Server (the README already advertises one)

**Rank: 3 of 5. Prerequisite: PLAN-fix-build-and-ci (the server entry point must compile). Recommended after PLAN-posture-review-correctness so the exposed tools return correct data.**

## Goal

`README.md` says "20 MCP tools exposed for use in Claude Code and MCP-compatible clients", but the repo contains only `src/mcp-tools.ts` — an array of tool *definitions* with no server, no transport, no binary. Nothing can actually call these tools today. This plan adds a stdio MCP server that wraps the existing 20 definitions unchanged, a `bin` entry, and registration instructions, turning the repo's main advertised feature into reality.

## Files to touch

| Action | File |
|--------|------|
| Modify | `package.json` (dependency, `bin`, script) |
| Create | `src/mcp-server.ts` |
| Create | `.mcp.json.example` |
| Modify | `README.md` (MCP section: real instructions) |
| Create | `__tests__/mcp-server.test.ts` |

## Step-by-step implementation order

### Step 1 — Add the SDK dependency

```bash
npm install @modelcontextprotocol/sdk@^1.0
```

This is the project's **first runtime dependency** (currently devDependencies only). That is acceptable and expected for an MCP server.

### Step 2 — Create `src/mcp-server.ts`

Use the **low-level `Server` API, not `McpServer.tool()`**. Reason: `McpServer`'s high-level `tool()`/`registerTool()` methods take **zod** schemas, but `createMcpTools()` already provides plain JSON Schema objects in `inputSchema`. The low-level API accepts JSON Schema directly, so the 20 existing definitions can be served without rewriting any of them.

```typescript
#!/usr/bin/env node
/**
 * CISO Swarm — stdio MCP server.
 * Serves the 20 tool definitions from mcp-tools.ts to any MCP client.
 * Register with: claude mcp add ciso-agents -- node <repo>/dist/mcp-server.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CISOOrchestrator } from './ciso-orchestrator.js';
import { createMcpTools } from './mcp-tools.js';

const orchestrator = new CISOOrchestrator(process.env['CISO_NAMESPACE'] ?? 'ciso-swarm');
const tools = createMcpTools(orchestrator);
const toolsByName = new Map(tools.map(t => [t.name, t]));

const server = new Server(
  { name: 'ciso-agents', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = toolsByName.get(request.params.name);
  if (!tool) {
    return { content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }], isError: true };
  }
  try {
    const result = await tool.handler((request.params.arguments ?? {}) as never);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Tool ${request.params.name} failed: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    };
  }
});

await server.connect(new StdioServerTransport());
console.error('[ciso-agents] MCP server ready — 20 tools registered');
```

Adjust details only if the installed SDK version's API differs (check `node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.d.ts`); the shapes above match SDK 1.x.

### Step 3 — Wire up `package.json`

Add:

```json
"bin": { "ciso-agents-mcp": "dist/mcp-server.js" },
```

and a convenience script:

```json
"mcp:serve": "tsx src/mcp-server.ts"
```

The shebang in Step 2 plus `bin` makes `npx ciso-agents-mcp` work after `npm run build` (and after publish). `tsc` preserves the shebang line.

### Step 4 — Create `.mcp.json.example`

```json
{
  "mcpServers": {
    "ciso-agents": {
      "command": "npx",
      "args": ["tsx", "/Users/smuneer/CISO-agents/src/mcp-server.ts"]
    }
  }
}
```

Include a comment-free variant in README for the built form (`node /path/to/CISO-agents/dist/mcp-server.js`).

### Step 5 — Update README's MCP section

Replace the aspirational text under "## MCP Tools" with working registration steps:

```bash
# one-time, from the repo:
npm install && npm run build

# register with Claude Code (project scope):
claude mcp add ciso-agents -- node /Users/smuneer/CISO-agents/dist/mcp-server.js

# verify:
claude mcp list   # should show ciso-agents ✓ connected
```

Also fix the tool-name typo `ciso_threat_modeling` → `ciso_threat_model` if PLAN-posture-review-correctness hasn't already done it.

### Step 6 — Add a protocol-level smoke test

Create `__tests__/mcp-server.test.ts`. Do **not** test by spawning a subprocess and hand-writing JSON-RPC frames (fragile). Use the SDK's in-memory transport, which exists precisely for this:

```typescript
import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
```

Structure: refactor `src/mcp-server.ts` minimally so the server construction is an exported function `buildServer(): Server` and the `connect(new StdioServerTransport())` call happens only under `if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1])))` — or simpler and more robust: move server construction into a new module `src/mcp-server-core.ts` exporting `buildServer()`, and keep `src/mcp-server.ts` as a 5-line entry that imports it and connects stdio. The test then does:

```typescript
const server = buildServer();
const client = new Client({ name: 'test', version: '0.0.0' });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

const { tools } = await client.listTools();
expect(tools).toHaveLength(20);
expect(tools.map(t => t.name)).toContain('ciso_security_posture_review');

const res = await client.callTool({ name: 'ciso_swarm_status', arguments: {} });
const text = (res.content as Array<{ type: string; text: string }>)[0].text;
expect(JSON.parse(text).topology).toBe('hierarchical');

const bad = await client.callTool({ name: 'nope', arguments: {} });
expect(bad.isError).toBe(true);
```

## Edge cases a weaker model would miss

- **Never write to stdout in a stdio MCP server.** stdout is the JSON-RPC channel; a single `console.log` corrupts the protocol and the client silently disconnects. All human-facing logging must be `console.error` (stderr). Audit: `CISOOrchestrator` and agents never log, so only the server file matters — but keep it in mind if adding debug output.
- **JSON Schema vs zod.** The high-level `McpServer.tool()` API wants zod shapes; passing the existing JSON Schema objects there fails at runtime or types. The low-level `Server` + `ListToolsRequestSchema`/`CallToolRequestSchema` handlers accept JSON Schema as-is. Do not convert the 20 schemas to zod — that's a large, error-prone rewrite for zero benefit.
- **Handler input casts.** The handlers in `mcp-tools.ts` have specifically-typed parameters (e.g. `AISystemProfile`). `request.params.arguments` is `unknown`-ish; the `as never` cast in the dispatch loop is the pragmatic bridge. Type-safe per-tool dispatch would require a union refactor — out of scope.
- **`request.params.arguments` may be `undefined`** for zero-arg tools (`ciso_swarm_status` etc.). Default it to `{}` before calling the handler (shown in Step 2), or handlers that destructure will throw.
- **One orchestrator instance for the server's lifetime** means swarm state (task counts, `completedTasks`) accumulates across calls — that's the intended "live swarm" behaviour of `ciso_swarm_status`; don't construct a fresh orchestrator per call.
- **Top-level `await`** (`await server.connect(...)`) is legal here because `package.json` has `"type": "module"` and tsconfig targets ES2022 — don't wrap in an IIFE.
- **The shebang must be line 1** of the emitted `dist/mcp-server.js`. `tsc` preserves it only if it's line 1 of the source. Don't put the file-header comment above it.
- **`.mcp.json.example`, not `.mcp.json`**: committing a real `.mcp.json` with an absolute path breaks other clones; the example file with a placeholder path is the convention.

## Acceptance criteria

1. `npm run typecheck && npm run build` exit 0; `dist/mcp-server.js` exists and its first line is `#!/usr/bin/env node`.
2. `npm test` passes, including the new `mcp-server.test.ts` with: 20 tools listed, `ciso_swarm_status` round-trip returns parseable JSON with `topology: 'hierarchical'`, unknown tool returns `isError: true`.
3. Manual smoke: `claude mcp add ciso-agents -- node /Users/smuneer/CISO-agents/dist/mcp-server.js` then `claude mcp list` shows the server connected; in a Claude Code session, calling the `ciso_owasp_llm_top10` tool returns 10 entries.
4. `printf '' | node dist/mcp-server.js; echo $?` exits 0 (clean shutdown on closed stdin) — or at minimum does not hang; if it hangs, add a `process.stdin.on('end', () => process.exit(0))` guard.
5. README MCP section contains the `claude mcp add` command and no longer implies the tools work without a server.
