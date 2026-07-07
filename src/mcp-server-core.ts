/**
 * CISO Swarm — MCP server construction.
 *
 * Builds a low-level MCP `Server` that serves the 20 tool definitions from
 * mcp-tools.ts. The low-level API accepts JSON Schema `inputSchema` objects
 * directly, so no tool definition needs rewriting into zod.
 *
 * Kept separate from the stdio entry point (mcp-server.ts) so tests can wire
 * the server to an in-memory transport without spawning a process.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CISOOrchestrator } from './ciso-orchestrator.js';
import { createMcpTools } from './mcp-tools.js';

export function buildServer(namespace = process.env['CISO_NAMESPACE'] ?? 'ciso-swarm'): Server {
  const orchestrator = new CISOOrchestrator(namespace);
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

  return server;
}
