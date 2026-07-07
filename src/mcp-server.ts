#!/usr/bin/env node
/**
 * CISO Swarm — stdio MCP server entry point.
 * Serves the 20 tool definitions from mcp-tools.ts to any MCP client.
 * Register with: claude mcp add ciso-agents -- node <repo>/dist/mcp-server.js
 *
 * NOTE: stdout is the JSON-RPC channel — all human-facing logging uses stderr.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './mcp-server-core.js';

const server = buildServer();
await server.connect(new StdioServerTransport());
console.error('[ciso-agents] MCP server ready — 20 tools registered');
