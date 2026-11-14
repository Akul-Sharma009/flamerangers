import { useState } from "react";
import { AQUA_COPY as T, aquaOnlyView, type AquaOnlyView, type TestRow } from "../evidence/aquaOnly";
import { DEFAULT_SCALE, H2H_COPY, POOLED, type Choice } from "../evidence/headToHead";
import type { Evidence } from "../evidence/types";
import { Choices, Fig, Noise, ScoresTable } from "./HeadToHead";
import "./AquaOnly.css";

// Story 5.5. Prints each figure's `display` as evidence.json holds it; the browser
// rounds, compares and computes nothing (AD-8).

/** The stateful section: holds the reader's choice of set, region and scale. */
export function AquaOnly({ evidence }: { evidence: Evidence }) {
  const [choice, setChoice] = useState<Choice>({ set: "final", region: POOLED, scale: DEFAULT_SCALE });
  const view = aquaOnlyView(evidence, choice);
  return <AquaOnlySection view={view} onChoose={(next) => setChoice({ ...view.choice, ...next })} />;
}

function TestRows({ rows }: { rows: TestRow[] }) {
  return (
    <>
      {rows.map((r) => (
        <tr key={r.key} data-approach={r.key} data-for-pick={r.forPick === null ? undefined : String(r.forPick)}>
          <th scope="row">{r.label}</th>
          <td data-col="pass"><Fig f={r.pass} /></td>
          {r.checks.map((c) => (
            <td key={c.key} data-col={c.key}>
              <Fig f={c.result} />
              {c.diff ? (
                <span className="sub">
                  <Fig f={c.diff} /> <Noise f={c.diff} /> <span className="iv">{c.diff.interval?.display}</span>
                </span>
              ) : (
                <span className="sub"><Fig f={null} /></span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** The section for one choice. Pure, so the tests can render each choice. */
export function AquaOnlySection({ view, onChoose }: { view: AquaOnlyView; onChoose?: (next: Partial<Choice>) => void }) {
  const pick = onChoose ?? (() => undefined);
  const { test, referee } = view;
  const span = test.checks.length + 2;
  return (
    <section className="h2h aqua" aria-labelledby="aqua-title" data-set={view.choice.set} data-region={view.choice.region} data-scale={view.choice.scale}>
      <h2 id="aqua-title">{T.heading}</h2>
      <p className="intro">{T.intro}</p>

      <div className="aqua-cols">
        <div>
          <h3>{T.recordHeading}</h3>
          <p className="claim" data-claim={view.record.id}>{view.record.text}</p>
          <p>{T.recordAfter}</p>
        </div>
        <div>
          <h3>{T.whyHeading}</h3>
          {T.why.map((p) => <p key={p}>{p}</p>)}
        </div>
      </div>

      <form className="h2h-controls" onSubmit={(e) => e.preventDefault()}>
        <Choices legend={H2H_COPY.setLegend} name="aqua-set" options={view.sets} value={view.choice.set} onPick={(set) => pick({ set: set as Choice["set"] })} />
        <Choices legend={H2H_COPY.regionLegend} name="aqua-region" options={view.regions} value={view.choice.region} onPick={(region) => pick({ region })} />
        <Choices legend={H2H_COPY.scaleLegend} name="aqua-scale" options={view.scales} value={view.choice.scale} onPick={(scale) => pick({ scale })} />
      </form>
      <p className="setlabel">{view.setLabel}</p>

      <h3>{T.testHeading}</h3>
      <p className="claim" data-claim={test.claim.id}>{test.claim.text}</p>
      <p className="aside">{T.testIntro} {H2H_COPY.differencesScope}</p>
      <p className="aside legend">
        <span className="mark beyond" aria-hidden="true">{H2H_COPY.beyondMark}</span> {H2H_COPY.legendBeyond}{" "}
        <span className="mark within" aria-hidden="true">{H2H_COPY.withinMark}</span> {H2H_COPY.legendWithin}
      </p>
      <div className="h2h-scroll" role="region" aria-label={T.testHeading} tabIndex={0}>
        <table className="h2h-table aqua-test">
          <thead>
            <tr>
              <th scope="col">{T.approachHeader}</th>
              <th scope="col">{T.passHeader}</th>
              {test.checks.map((c) => <th scope="col" key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="group"><th colSpan={span} scope="rowgroup">{T.candidatesGroup}</th></tr>
            <TestRows rows={test.candidates} />
            <tr className="group"><th colSpan={span} scope="rowgroup">{T.othersGroup}</th></tr>
            <TestRows rows={test.others} />
          </tbody>
        </table>
      </div>
      {test.hasNotForPick && <p className="aside" data-note="for-pick">{T.forPickNote}</p>}
      <p className="aside" data-note="intervals">{test.note}</p>

      <h3>{T.refereeHeading}</h3>
      <p className="aside">{T.refereeIntro}</p>
      <h4>{referee.title}</h4>
      <ScoresTable scores={referee} rowClass={(key) => (key === "c" ? "incumbent" : key === "cmp" ? "comparator" : key === "a" || key === "b" ? "baseline" : undefined)} />
      <p className="aside" data-note="referee">{referee.note}</p>
      <p className="aside">{H2H_COPY.dashNote}</p>

      <h3>{T.otherHeading}</h3>
      <dl className="aqua-incumbents">
        <div data-incumbent="gwis">
          <dt>{T.gwisName}</dt>
          <dd><strong><Fig f={view.gwis} /></strong>. {T.gwisReason}</dd>
        </div>
        <div data-incumbent="firms">
          <dt>{T.firmsName}</dt>
          <dd>{T.firmsReason}</dd>
        </div>
      </dl>
    </section>
  );
}
