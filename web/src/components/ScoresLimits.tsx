import { useState } from "react";
import { messages } from "../api/messages";
import { DEFAULT_SCALE, H2H_COPY, POOLED } from "../evidence/headToHead";
import { LIMITS_COPY as T, limitsView, type LimitsView, type Shown, type YearsRow } from "../evidence/limits";
import type { Evidence } from "../evidence/types";
import { ByYear, Choices, Fig, Pairs, Run, ScoresTable } from "./HeadToHead";
import "./ScoresLimits.css";

// Story 5.6. Prints each figure's `display` and each claim's text as evidence.json
// holds them; the browser rounds, compares and computes nothing (AD-8).

/** The stateful sections: hold the reader's choice of region and scale in the reported-only run. */
export function ScoresLimits({ evidence }: { evidence: Evidence }) {
  const [choice, setChoice] = useState({ region: POOLED, scale: DEFAULT_SCALE });
  const view = limitsView(evidence, choice);
  return <ScoresLimitsSections view={view} onChoose={(next) => setChoice({ region: view.reported.choice.region, scale: view.reported.choice.scale, ...next })} />;
}

function Parts({ parts }: { parts: Shown[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "text" ? <span key={i}>{p.text}</span> : p.kind === "fig" ? <Fig key={i} f={p.f} /> : <span key={i} className="claim-inline" data-claim={p.claim.id}>{p.claim.text}</span>,
      )}
    </>
  );
}

function Years({ rows, name }: { rows: YearsRow[]; name: string }) {
  return (
    <dl className="limit-years" data-years={name}>
      {rows.map((r) => (
        <div key={r.key}>
          <dt>{r.label}</dt>
          <dd>
            {r.years.map((y, i) => (
              <span key={y.source.pointer}>{i > 0 && ", "}<Fig f={y} /></span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Both sections for one choice. Pure, so the tests can render each choice. */
export function ScoresLimitsSections({ view, onChoose }: { view: LimitsView; onChoose?: (next: Partial<{ region: string; scale: string }>) => void }) {
  const pick = onChoose ?? (() => undefined);
  const ro = view.reported;
  return (
    <>
      <section className="h2h limits" aria-labelledby="limits-title">
        <h2 id="limits-title">{T.heading}</h2>
        <p className="intro">{T.intro}</p>
        <ol className="limit-list">
          {view.limits.map((l) => (
            <li key={l.id} data-limit={l.id}>
              <strong className="limit-title">{l.title}</strong> <Parts parts={l.body} />
              {l.years && <Years rows={l.years} name={l.id} />}
            </li>
          ))}
        </ol>

        <div className="limit-block" data-note="tiers">
          <h3>{T.tiersHeading}</h3>
          <p>
            {T.tiersBefore} <span className="claim-inline" data-claim={view.tiers.id}>{view.tiers.text}</span>
          </p>
        </div>

        <div className="limit-block" data-note="noaa20" data-ran={String(view.noaa20.ran)}>
          <h3>{T.noaaHeading}</h3>
          {view.noaa20.ran ? (
            <>
              <p>{messages.notes.noaa20_check}</p>
              <p className="setlabel">{view.noaa20.label} · {view.noaa20.file}</p>
              <dl className="h2h-blocks noaa20">
                {view.noaa20.rows.map((r) => (
                  <div key={r.key}>
                    <dt>{r.label}</dt>
                    <dd><Fig f={r.figure} /></dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="not-run">{messages.notes.noaa20_check_not_run}</p>
          )}
        </div>
      </section>

      <section className="h2h reported" aria-labelledby="reported-title" data-for-pick="false" data-region={ro.choice.region} data-scale={ro.choice.scale}>
        <h2 id="reported-title">{T.reportedHeading}</h2>
        <p className="not-for-pick"><span className="tag">{T.notForPick}</span> <span className="setlabel">{ro.label} · {ro.file}</span></p>
        <dl className="h2h-blocks about">
          {ro.about.map((a) => (
            <div key={a.key}>
              <dt>{a.label}</dt>
              <dd><Fig f={a.figure} /></dd>
            </div>
          ))}
        </dl>
        <p className="intro">{T.reportedIntro}</p>
        {ro.claims.map((c) => (
          <p key={c.id} className="claim" data-claim={c.id} data-for-pick={String(c.used_for_pick)}>{c.text}</p>
        ))}

        <h3>{T.yearsHeading}</h3>
        <Years rows={ro.years} name="reported_only" />

        <h3>{T.testsHeading}</h3>
        <p className="aside">{T.testsIntro}</p>
        <div className="h2h-scroll" role="region" aria-label={T.testsHeading} tabIndex={0}>
          <table className="h2h-table tests ro-tests">
            <thead>
              <tr>
                <th scope="col">{H2H_COPY.approachHeader}</th>
                <th scope="col">{H2H_COPY.testA}</th>
                <th scope="col">{H2H_COPY.testB}</th>
                <th scope="col">{T.testC}</th>
              </tr>
            </thead>
            <tbody>
              {ro.tests.map((t) => (
                <tr key={t.key} data-approach={t.key}>
                  <th scope="row">{t.label}</th>
                  <td data-col="a"><Fig f={t.a} />{t.aWorseOn.length > 0 && <span className="sub">{H2H_COPY.worseOn} <Run parts={t.aWorseOn} /></span>}</td>
                  <td data-col="b"><Fig f={t.b} />{t.bWorseOn.length > 0 && <span className="sub">{H2H_COPY.worseOn} <Run parts={t.bWorseOn} /></span>}</td>
                  <td data-col="c"><Fig f={t.c} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>{ro.scores.title}</h3>
        <p className="aside">{T.scoresIntro}</p>
        <form className="h2h-controls" onSubmit={(e) => e.preventDefault()}>
          <Choices legend={H2H_COPY.regionLegend} name="ro-region" options={ro.regions} value={ro.choice.region} onPick={(region) => pick({ region })} />
          <Choices legend={H2H_COPY.scaleLegend} name="ro-scale" options={ro.scales} value={ro.choice.scale} onPick={(scale) => pick({ scale })} />
        </form>
        <ScoresTable scores={ro.scores} rowClass={(key) => (key === "cmp" ? "comparator" : key === "a" || key === "b" ? "baseline" : undefined)} />
        <p className="aside">{H2H_COPY.dashNote}</p>

        <ByYear byYear={ro.byYear} />

        <Pairs pairs={ro.pairs} />

        <h4>{H2H_COPY.runHeading}</h4>
        <dl className="h2h-blocks">
          {ro.blocks.map((b) => (
            <div key={b.label}>
              <dt>{b.label}</dt>
              <dd><Fig f={b.figure} /></dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
