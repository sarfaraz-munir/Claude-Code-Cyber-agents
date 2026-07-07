import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../src/mcp-server-core.js';

describe('CISO MCP server', () => {
  async function connectedClient() {
    const server = buildServer('test-mcp');
    const client = new Client({ name: 'test', version: '0.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return client;
  }

  it('lists all 20 tools including the posture review', async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(20);
    expect(tools.map(t => t.name)).toContain('ciso_security_posture_review');
  });

  it('round-trips ciso_swarm_status returning parseable swarm state', async () => {
    const client = await connectedClient();
    const res = await client.callTool({ name: 'ciso_swarm_status', arguments: {} });
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    expect(JSON.parse(text).topology).toBe('hierarchical');
  });

  it('returns isError for an unknown tool', async () => {
    const client = await connectedClient();
    const bad = await client.callTool({ name: 'nope', arguments: {} });
    expect(bad.isError).toBe(true);
  });

  it('surfaces handler errors as isError (unknown compliance framework)', async () => {
    const client = await connectedClient();
    const res = await client.callTool({ name: 'ciso_compliance_gap_analysis', arguments: { framework: 'SOC2' } });
    expect(res.isError).toBe(true);
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toMatch(/Unknown compliance framework/);
  });
});
