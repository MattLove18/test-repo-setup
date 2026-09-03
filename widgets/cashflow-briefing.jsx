// Übersicht desktop widget for the Cash Flow Architects desk briefing.
// 1. Install Übersicht: https://tracesof.net/uebersicht/
// 2. Replace FEED_URL with your deployed /api/widget address (add ?token= if set).
// 3. Save this file into the Übersicht widgets folder (Overview → Open Widgets Folder).

export const FEED_URL = "https://YOUR-VERCEL-DOMAIN/api/widget";

export const command = `curl -s "${FEED_URL}"`;
export const refreshFrequency = 60 * 60 * 1000;
export const className = `
  left: 24px;
  top: 24px;
  width: 360px;
  color: #f3ead8;
  font-family: "Avenir Next", "Helvetica Neue", sans-serif;
`;

export function render(output) {
  let data;
  try {
    data = JSON.parse(output);
  } catch {
    return <div style={card}>Waiting for the desk feed…</div>;
  }
  if (data.error) {
    return <div style={card}>{data.error}</div>;
  }
  return (
    <div style={card}>
      <p style={kicker}>{data.deskOpen ? "Desk briefing · 60 min" : "Desk closed"}</p>
      <h1 style={title}>{data.headline}</h1>
      <p style={summary}>{data.summary}</p>
      {data.deskOpen ? (
        <div style={stats}>
          <span>
            <strong>{data.inProcess}</strong> in process
          </span>
          <span>
            <strong>{data.stuck}</strong> behind
          </span>
        </div>
      ) : null}
      <ul style={list}>
        {(data.items || []).map((item) => (
          <li key={item.id} style={item.stuck ? stuckRow : row}>
            <div>
              <strong>{item.name}</strong>
              <div style={next}>
                {item.bay} · {item.next}
              </div>
            </div>
            <em style={age}>{item.age}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

const card = {
  padding: "16px",
  background: "rgba(12, 16, 24, 0.88)",
  border: "1px solid rgba(212, 175, 77, 0.45)",
};
const kicker = {
  margin: "0 0 8px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontSize: "10px",
  color: "#d4af4d",
};
const title = { margin: "0 0 8px", fontSize: "22px", fontWeight: 500, color: "#f3ead8" };
const summary = { margin: 0, fontSize: "13px", color: "#b7b1a3" };
const stats = { display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px" };
const list = { listStyle: "none", margin: "12px 0 0", padding: 0 };
const row = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  marginTop: "8px",
  padding: "8px",
  border: "1px solid rgba(212, 175, 77, 0.25)",
};
const stuckRow = { ...row, boxShadow: "0 0 0 1px rgba(214, 90, 70, 0.7)" };
const next = { marginTop: "2px", fontSize: "11px", color: "#e0c57a" };
const age = { fontStyle: "normal", fontSize: "11px", color: "#8c877c" };
