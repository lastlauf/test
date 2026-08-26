import type { Hole, MatchView } from "@/lib/payloads";
import { subjectsForSide } from "@/lib/scoring";

/** Full 18-hole card for one match — used in the archive and match views. */
export function Scorecard({ match, holes }: { match: MatchView; holes: Hole[] }) {
  const subjects = match.sides.flatMap((side) => subjectsForSide(side, match.format));
  const lookup = new Map(
    match.scores.map((row) => [`${row.hole}|${row.subjectType}|${row.subjectId}`, row]),
  );
  const front = holes.filter((h) => h.number <= 9);
  const back = holes.filter((h) => h.number > 9);

  return (
    <div className="tsi-scroll">
      <table className="w-full min-w-[680px] border-collapse text-center">
        <thead>
          <tr>
            <th
              className="sticky left-0 z-10 px-2 py-1 text-left text-xs font-bold uppercase"
              style={{ background: "var(--tsi-shell)" }}
            >
              Hole
            </th>
            {front.map((h) => (
              <th key={h.number} className="tsi-num px-1 py-1 text-xs font-bold">
                {h.number}
              </th>
            ))}
            <th className="px-1 py-1 text-xs font-bold tsi-muted">Out</th>
            {back.map((h) => (
              <th key={h.number} className="tsi-num px-1 py-1 text-xs font-bold">
                {h.number}
              </th>
            ))}
            <th className="px-1 py-1 text-xs font-bold tsi-muted">In</th>
            <th className="px-2 py-1 text-xs font-bold">Tot</th>
          </tr>
          <tr className="tsi-muted">
            <th
              className="sticky left-0 z-10 px-2 py-1 text-left text-[11px] font-bold"
              style={{ background: "var(--tsi-shell)" }}
            >
              Par
            </th>
            {front.map((h) => (
              <td key={h.number} className="tsi-num px-1 text-[11px] font-bold">
                {h.par}
              </td>
            ))}
            <td className="tsi-num px-1 text-[11px] font-bold">
              {front.reduce((s, h) => s + h.par, 0)}
            </td>
            {back.map((h) => (
              <td key={h.number} className="tsi-num px-1 text-[11px] font-bold">
                {h.par}
              </td>
            ))}
            <td className="tsi-num px-1 text-[11px] font-bold">
              {back.reduce((s, h) => s + h.par, 0)}
            </td>
            <td className="tsi-num px-2 text-[11px] font-bold">
              {holes.reduce((s, h) => s + h.par, 0)}
            </td>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => {
            const cell = (h: Hole) =>
              lookup.get(`${h.number}|${subject.type}|${subject.id}`)?.gross ?? null;
            const sum = (list: Hole[]) =>
              list.reduce((total, h) => total + (cell(h) ?? 0), 0);
            return (
              <tr
                key={`${subject.type}:${subject.id}`}
                className="tsi-rule-t"
                              >
                <th
                  className="sticky left-0 z-10 max-w-[8rem] truncate px-2 py-1 text-left text-xs font-bold"
                  style={{ background: "var(--tsi-shell)" }}
                >
                  {subject.label}
                </th>
                {front.map((h) => (
                  <td key={h.number} className="tsi-num px-1 py-1 text-sm font-bold">
                    {cell(h) ?? "·"}
                  </td>
                ))}
                <td className="tsi-num px-1 py-1 text-sm font-bold">{sum(front) || "·"}</td>
                {back.map((h) => (
                  <td key={h.number} className="tsi-num px-1 py-1 text-sm font-bold">
                    {cell(h) ?? "·"}
                  </td>
                ))}
                <td className="tsi-num px-1 py-1 text-sm font-bold">{sum(back) || "·"}</td>
                <td className="tsi-num px-2 py-1 text-sm font-bold">{sum(holes) || "·"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
