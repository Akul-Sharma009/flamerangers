import { useState, type ReactNode } from "react";
import { DEFAULT_SCALE, H2H_COPY as T, POOLED, headToHeadView, sourceOf, type Choice, type HeadToHeadView, type Option, type PairRow } from "../evidence/headToHead";
import type { Evidence, Figure } from "../evidence/types";
import "./HeadToHead.css";

// Story 5.4. Prints each figure's `display` as evidence.json holds it; the browser
// rounds, compares and computes nothing (AD-8).

/** The stateful section: holds the reader's choice of set, region and scale. */
export function HeadToHead({ evidence }: { evidence: Evidence }) {
  const [choice, setChoice] = useState<Choice>({ set: "final", region: POOLED, scale: DEFAULT_SCALE });
  const view = headToHeadView(evidence, choice);
  return <HeadToHeadSection view={view} onChoose={(next) => setChoice({ ...view.choice, ...next })} />;
}

/** One figure, with its source field as a tooltip. A missing figure is a dash. */
export function Fig({ f, className }: { f: Figure | null | undefined; className?: string }) {
  if (!f) {
    return <span className={`none ${className ?? ""}`} title={T.noValue}><span aria-hidden="true">—</span><span className="sr">{T.noValue}</span></span>;
  }
  return <span className={className} title={sourceOf(f)} data-source={sourceOf(f)}>{f.display}</span>;
}

/** Words and figures run together, as in "3,059 right of 4,343 raised". */
export function Run({ parts }: { parts: (string | Figure | null)[] }) {
  const out: ReactNode[] = [];
  parts.forEach((p, i) => {
    if (i > 0) out.push(" ");
    out.push(typeof p === "string" ? p : <Fig key={i} f={p} />);
  });
  return <>{out}</>;
}

export function Choices({ legend, name, options, value, onPick }: { legend: string; name: string; options: Option[]; value: string; onPick: (key: string) => void }) {
  return (
    <fieldset className="choices">
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.key} className={o.key === value ? "on" : undefined}>
          <input type="radio" name={name} value={o.key} checked={o.key === value} onChange={() => onPick(o.key)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

export function Noise({ f }: { f: Figure }) {
  const beyond = f.beyond_noise === true;
  return (
    <span className={beyond ? "mark beyond" : "mark within"} title={beyond ? T.beyond : T.within}>
      <span aria-hidden="true">{beyond ? T.beyondMark : T.withinMark}</span>
      <span className="sr">{beyond ? T.beyond : T.within}</span>
    </span>
  );
}

function PairRows({ rows, columns }: { rows: PairRow[]; columns: { key: string }[] }) {
  return (
    <>
      {rows.map((r) => (
        <tr key={r.key} data-pair={r.key}>
          <th scope="row">{r.label}</th>
          {columns.map((c) => {
            const f = r.cells[c.key];
            return (
              <td key={c.key}>
                {f ? (
                  <>
                    <Fig f={f} /> <Noise f={f} />
                    <span className="sub">{f.interval?.display}</span>
                  </>
                ) : (
                  <Fig f={null} />
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/** A score table: one row per approach, the measures the level holds, counts under the rate they explain. */
export function ScoresTable({ scores, rowClass }: { scores: HeadToHeadView["scores"]; rowClass?: (key: string) => string | undefined }) {
  return (
    <div className="h2h-scroll" role="region" aria-label={scores.title} tabIndex={0}>
      <table className="h2h-table scores">
        <thead>
          <tr>
            <th scope="col">{T.approachHeader}</th>
            {scores.columns.map((c) => (
              <th scope="col" key={c.key}>
                {c.label}
                {c.unit && <span className="unit">{c.unit}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scores.rows.map((r) => (
            <tr key={r.key} data-approach={r.key} className={rowClass?.(r.key)}>
              <th scope="row">{r.label}</th>
              {scores.columns.map((c) => {
                const parts = c.sub(r.cells);
                return (
                  <td key={c.key} data-col={c.key}>
                    <Fig f={r.cells[c.key]} />
                    {parts && <span className="sub"><Run parts={parts} /></span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The section for one choice. Pure, so the tests can render each choice. */
export function HeadToHeadSection({ view, onChoose }: { view: HeadToHeadView; onChoose?: (next: Partial<Choice>) => void }) {
  const pick = onChoose ?? (() => undefined);
  const { scores, pairs } = view;
  return (
    <section className="h2h" aria-labelledby="h2h-title" data-set={view.choice.set} data-region={view.choice.region} data-scale={view.choice.scale}>
      <h2 id="h2h-title">{T.heading}</h2>
      <p className="intro">{T.intro}</p>

      <form className="h2h-controls" onSubmit={(e) => e.preventDefault()}>
        <Choices legend={T.setLegend} name="h2h-set" options={view.sets} value={view.choice.set} onPick={(set) => pick({ set: set as Choice["set"] })} />
        <Choices legend={T.regionLegend} name="h2h-region" options={view.regions} value={view.choice.region} onPick={(region) => pick({ region })} />
        <Choices legend={T.scaleLegend} name="h2h-scale" options={view.scales} value={view.choice.scale} onPick={(scale) => pick({ scale })} />
      </form>

      {view.final && (
        <div className="h2h-set-note" data-note="final">
          <h3>{T.finalHeading}</h3>
          <p className="setlabel">{view.final.label}</p>
          <p className="claim" data-claim={view.final.bestOfThree.id}>{view.final.bestOfThree.text}</p>
        </div>
      )}
      {view.selection && (
        <div className="h2h-set-note" data-note="selection">
          <h3>{T.selectionHeading}</h3>
          <p className="setlabel">{view.selection.label}</p>
          <p><Fig f={view.selection.evidenceNote} /></p>
        </div>
      )}

      <h3>{scores.title}</h3>
      <ScoresTable scores={scores} rowClass={(key) => (key === "cmp" ? "comparator" : key === "a" || key === "b" ? "baseline" : undefined)} />
      <p className="aside">{T.dashNote}</p>

      <h3>{view.byYear.title}</h3>
      <p className="aside">{T.byYearScope}</p>
      <div className="h2h-scroll" role="region" aria-label={view.byYear.title} tabIndex={0}>
        <table className="h2h-table years">
          <thead>
            <tr>
              <th scope="col">{T.yearHeader}</th>
              {view.byYear.approaches.map((a) => <th scope="col" key={a.key}>{a.label}</th>)}
            </tr>
          </thead>
          {view.byYear.groups.map((g) => (
            <tbody key={g.period.display} data-period={g.period.display}>
              <tr className="group"><th colSpan={view.byYear.approaches.length + 1} scope="rowgroup">{T.periodWord}: <Fig f={g.period} /></th></tr>
              {g.rows.map((r) => (
                <tr key={r.key} data-year={r.key}>
                  <th scope="row">{r.label}</th>
                  {view.byYear.approaches.map((a) => (
                    <td key={a.key}>
                      <Fig f={r.cells[`${a.key}.mae`]} />
                      <span className="sub"><Fig f={r.cells[`${a.key}.bias`]} /></span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="aside" data-note="periods">{view.byYear.note}</p>

      <h3>{T.differencesHeading}</h3>
      <p className="aside">{T.differencesScope}</p>
      <p className="aside legend">
        <span className="mark beyond" aria-hidden="true">{T.beyondMark}</span> {T.legendBeyond}{" "}
        <span className="mark within" aria-hidden="true">{T.withinMark}</span> {T.legendWithin}
      </p>
      <div className="h2h-scroll" role="region" aria-label={T.differencesHeading} tabIndex={0}>
        <table className="h2h-table pairs">
          <thead>
            <tr>
              <th scope="col">{T.pairHeader}</th>
              {pairs.columns.map((c) => <th scope="col" key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="group"><th colSpan={pairs.columns.length + 1} scope="rowgroup">{T.leadPairs}</th></tr>
            <PairRows rows={pairs.c1} columns={pairs.columns} />
            <tr className="group"><th colSpan={pairs.columns.length + 1} scope="rowgroup">{T.otherPairs}</th></tr>
            <PairRows rows={pairs.others} columns={pairs.columns} />
          </tbody>
        </table>
      </div>
      <p className="aside" data-note="intervals">{pairs.note}</p>

      <h4>{T.runHeading}</h4>
      <dl className="h2h-blocks">
        {view.blocks.map((b) => (
          <div key={b.label}>
            <dt>{b.label}</dt>
            <dd><Fig f={b.figure} /></dd>
          </div>
        ))}
      </dl>

      {view.final && (
        <div className="h2h-rule" data-note="rule">
          <h3>{T.ruleHeading}</h3>
          <p>{T.ruleText}</p>
          <table className="h2h-table tests">
            <thead>
              <tr>
                <th scope="col">{T.approachHeader}</th>
                <th scope="col">{T.testA}</th>
                <th scope="col">{T.testB}</th>
              </tr>
            </thead>
            <tbody>
              {view.final.tests.map((t) => (
                <tr key={t.approach}>
                  <th scope="row">{t.approach}</th>
                  <td><Fig f={t.a} />{t.aWorseOn.length > 0 && <span className="sub">{T.worseOn} <Run parts={t.aWorseOn} /></span>}</td>
                  <td><Fig f={t.b} />{t.bWorseOn.length > 0 && <span className="sub">{T.worseOn} <Run parts={t.bWorseOn} /></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            {T.marginLine}, <Fig f={view.final.marginTest.combination} /> {T.against} <Fig f={view.final.marginTest.single} />:{" "}
            <Fig f={view.final.marginTest.pass} />, <Fig f={view.final.marginTest.winner} />.
          </p>
          <p className="claim" data-claim={view.final.margin.id}>{view.final.margin.text}</p>
          <p>{T.outcomeLine}: <Fig f={view.final.outcome} /></p>
        </div>
      )}
    </section>
  );
}
