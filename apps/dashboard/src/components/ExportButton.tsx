import { api } from '../api.ts';

export default function ExportButton({ runId }: { runId: string }) {
  return (
    <div className="form-row no-print">
      <a href={api.markdownUrl(runId)} download>
        <button>⬇ Export Markdown briefing</button>
      </a>
      <button onClick={() => window.print()}>🖨 Print / Save as PDF</button>
    </div>
  );
}
