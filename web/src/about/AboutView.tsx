import type { Meta } from "../api/client";
import { messages } from "../api/messages";
import { repoLink } from "../evidence/outcome";
import { ROUTES } from "../route";
import { ABOUT_CLAIMS, SATELLITES, aboutValues, countingLimits, fill, type ClaimTexts } from "./about";
import { CITATIONS, FIRMS_ACKNOWLEDGEMENT } from "./citations";
import { COPY } from "./copy";
import "./about.css";

const EVIDENCE_HASH = ROUTES.find((r) => r.id === "evidence")!.hash;
const CLEANING_DOC = "docs/cleaning-differences.md";

/** A contract sentence, marked with its key so a test can find it. */
function Note({ k, text, className }: { k: string; text: string; className?: string }) {
  return <p className={className} data-note={k}>{text}</p>;
}

/** A fixed claim from evidence.json, quoted whole; the contract's sentence if it is missing. */
function Claim({ id, text }: { id: string; text: string | null }) {
  return text === null ? (
    <p className="problem" role="alert">{messages.client.evidence_unavailable}</p>
  ) : (
    <p className="claim" data-claim={id}>{text}</p>
  );
}

/** Story 5.7: the about-the-data page, in the ledger page form of the evidence view. */
export function AboutView({
  meta,
  claims,
  repoUrl,
  limits = countingLimits(),
}: {
  meta: Meta;
  claims: ClaimTexts;
  repoUrl: string | null;
  limits?: ReturnType<typeof countingLimits>;
}) {
  const v = aboutValues(meta);
  const t = (s: string) => fill(s, v);
  const sat = messages.labels.satellite;
  const notes = messages.notes;
  const cleaningDoc = repoLink(repoUrl, CLEANING_DOC);

  return (
    <main className="page about">
      <article className="explainer" aria-labelledby="about-title">
        <p className="kicker">{COPY.kicker}</p>
        <h1 id="about-title">{COPY.title}</h1>
        <Note k="hotspot_definition" className="lead" text={notes.hotspot_definition} />
        <p>
          {COPY.intro} {COPY.introEvidence} <a href={EVIDENCE_HASH}>{COPY.introEvidenceLink}</a>.
        </p>

        <section id="unit" aria-labelledby="unit-title">
          <h2 id="unit-title">{COPY.unit.heading}</h2>
          <p>{COPY.unit.pixel}</p>
          <p className="emph">{COPY.unit.notAFire}</p>
          <p>{t(COPY.unit.countUnit)}</p>
          <p>{t(COPY.unit.parts)}</p>
          <dl className="labels">
            <dt>{sat.AQUA}</dt>
            <dd data-note="source.aqua_real">{messages.labels.source.aqua_real}</dd>
            <dt>VIIRS</dt>
            <dd data-note="source.viirs_converted">{messages.labels.source.viirs_converted}</dd>
          </dl>
        </section>

        <section id="sources" aria-labelledby="sources-title">
          <h2 id="sources-title">{COPY.sources.heading}</h2>
          <p>{COPY.sources.intro}</p>
          <ul className="satellites">
            {SATELLITES.map((id) => (
              <li key={id} data-satellite={id}>
                <strong>{sat[id]}:</strong> {t(COPY.sources.roles[id])}
              </li>
            ))}
          </ul>
          <p>{COPY.sources.citations}</p>
        </section>

        <section id="switch" aria-labelledby="switch-title">
          <h2 id="switch-title">{COPY.switch.heading}</h2>
          <Note k="record_switch" className="rule" text={notes.record_switch} />
          <p>{t(COPY.switch.whyIntro)}</p>
          <Claim id={ABOUT_CLAIMS.switch} text={claims.switch} />
          <p>{COPY.switch.drift}</p>
          <p>{t(COPY.switch.method)}</p>
          <Note k="satellite_switch" className="rule" text={notes.satellite_switch} />
        </section>

        <section id="cleaning" aria-labelledby="cleaning-title">
          <h2 id="cleaning-title">{COPY.cleaning.heading}</h2>
          <p>{COPY.cleaning.intro}</p>
          <ul className="rules">
            {COPY.cleaning.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="marks-label">{COPY.cleaning.marksLabel}</p>
          <ul className="marks">
            <li data-note="excluded_reason.offshore">{messages.labels.excluded_reason.offshore}</li>
            <li data-note="excluded_reason.static">{messages.labels.excluded_reason.static}</li>
          </ul>
          <h3>{COPY.cleaning.diffHeading}</h3>
          <ul className="rules" data-section="cleaning-differences">
            {COPY.cleaning.diffs.map((d) => (
              <li key={d}>{t(d)}</li>
            ))}
          </ul>
          {cleaningDoc && (
            <p className="aside">
              <a href={cleaningDoc}>{COPY.cleaning.diffLink}</a> <code>{CLEANING_DOC}</code>
            </p>
          )}
        </section>

        <section id="quality" aria-labelledby="quality-title">
          <h2 id="quality-title">{COPY.quality.heading}</h2>
          <dl className="labels">
            <dt>{COPY.quality.labels.SP}</dt>
            <dd data-note="quality.SP">{messages.labels.quality.SP}</dd>
            <dt>{COPY.quality.labels.NRT}</dt>
            <dd data-note="quality.NRT">{messages.labels.quality.NRT}</dd>
          </dl>
          <p>{COPY.quality.body}</p>
          <p>{COPY.quality.differ}</p>
        </section>

        <section id="validation" aria-labelledby="validation-title">
          <h2 id="validation-title">{COPY.validation.heading}</h2>
          <Claim id={ABOUT_CLAIMS.validation} text={claims.validation} />
          <p>{t(COPY.validation.noaa21)}</p>
          <p>{t(COPY.validation.fed)}</p>
          <Note k="validated_satellite_false" className="quoted" text={notes.validated_satellite_false} />
          <Note k="monthly_validation_only" text={notes.monthly_validation_only} />
          <p>
            {COPY.validation.more} <a href={EVIDENCE_HASH}>{COPY.margin.evidenceLink}</a>.
          </p>
        </section>

        <section id="detection" aria-labelledby="detection-title">
          <h2 id="detection-title">{COPY.detection.heading}</h2>
          <p>{COPY.detection.passes}</p>
          <p>{COPY.detection.cloud}</p>
          <p>{COPY.detection.smoke}</p>
          <p>{COPY.detection.small}</p>
        </section>

        <section id="limits" aria-labelledby="limits-title">
          <h2 id="limits-title">{COPY.limits.heading}</h2>
          <p>{COPY.limits.intro}</p>
          <ol className="limits" data-from={limits.from}>
            {limits.items.map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ol>
        </section>
      </article>

      <aside className="margin" aria-label="Record and sources">
        <section aria-labelledby="record-title">
          <h2 id="record-title">{COPY.margin.recordHeading}</h2>
          <dl className="facts">
            <dt>{COPY.margin.facts.version}</dt>
            <dd data-fact="record_version"><code>{v.record_version}</code></dd>
            <dt>{COPY.margin.facts.start}</dt>
            <dd data-fact="record_start">{v.record_start}</dd>
            <dt>{COPY.margin.facts.aquaThrough}</dt>
            <dd data-fact="aqua_through">{v.aqua_through}</dd>
            <dt>{COPY.margin.facts.viirsFrom}</dt>
            <dd data-fact="viirs_from">{v.viirs_from}</dd>
            <dt>{COPY.margin.facts.snppThrough}</dt>
            <dd data-fact="snpp_through">{v.snpp_through}</dd>
            <dt>{COPY.margin.facts.noaa20From}</dt>
            <dd data-fact="noaa20_from">{v.noaa20_from}</dd>
            <dt>{COPY.margin.facts.dataThrough}</dt>
            <dd data-fact="data_through">{v.data_through}</dd>
            <dt>{COPY.margin.facts.unit}</dt>
            <dd data-fact="unit">{v.unit}</dd>
          </dl>
        </section>

        <section aria-labelledby="sources-list-title">
          <h2 id="sources-list-title">{COPY.margin.sourcesHeading}</h2>
          <ol className="sources">
            {COPY.margin.sources.map((s) => (
              <li key={s.id} data-source={s.id}>
                <span className="name">{s.name}</span>
                {s.satellites.length > 0 && <span className="sats">{s.satellites.map((id) => sat[id]).join(", ")}</span>}
                <span className="citation" data-citation={s.id}>
                  {CITATIONS[s.id].text}{" "}
                  {CITATIONS[s.id].links.map((l, i) => (
                    <span key={l.href}>
                      {i > 0 ? " · " : null}
                      <a href={l.href} rel="noopener noreferrer">{l.label}</a>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
          <p className="aside" data-note="firms-acknowledgement">{FIRMS_ACKNOWLEDGEMENT}</p>
        </section>

        <section aria-labelledby="evidence-link-title">
          <h2 id="evidence-link-title">{COPY.margin.evidenceHeading}</h2>
          <p>
            <a href={EVIDENCE_HASH} data-link="evidence">{COPY.margin.evidenceLink}</a>
          </p>
        </section>
      </aside>
    </main>
  );
}
