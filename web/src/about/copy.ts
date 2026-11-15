// Story 5.7: the words of the about-the-data page that are neither a contract
// sentence (contract/messages.yaml) nor a fixed claim (evidence/claims.yaml).
// Approved by the lead on 15 Nov (DECISIONS.md, "Story 5.7"). The counting limits
// here are the fallback for the contract's `counting_limits` list (about.ts).
//
// Dates and satellite names are {placeholders}, filled from /meta and the
// contract's labels (about.ts). The only digits typed here are the fixed rules
// and facts listed in TYPED_NUMBERS, which no response serves; about.test.tsx
// checks that no other digit appears. Hotspots are never called "fires".

export const COPY = {
  kicker: "About the data",
  title: "What the numbers are, and what they are not",
  intro:
    "This page explains, for readers without a remote-sensing background, where the counts come from, how they are cleaned and joined into one record, and what they can miss.",
  introEvidence: "How well the conversion scored, and what the scores can't show, is on the",
  introEvidenceLink: "evidence page",

  unit: {
    heading: "What a hotspot is",
    pixel:
      "A satellite records a hotspot when one pixel of its image is clearly hotter than the ground around it as it passes over. A pixel is about 1 km across for MODIS and about 375 m for VIIRS.",
    notAFire:
      "A hotspot is not a fire. One large burn can show as dozens of hotspots on one pass and keep showing for days. Several small burns inside one pixel show as one. A burn that is small, cool or brief, or that happens between passes, may not show at all. Some hotspots are not burning vegetation: gas flares, volcanoes and hot industrial sites show up too, and the cleaning removes the ones that keep coming back to the same place.",
    countUnit: "Every count on this site is in one unit: {unit}.",
    parts:
      "Through {aqua_through} a count is the number of Aqua MODIS hotspots. From {viirs_from} it is the number of VIIRS hotspots converted to what Aqua MODIS would have counted, so it can have a decimal part.",
  },

  sources: {
    heading: "Where the data come from",
    intro:
      "Every hotspot comes from NASA's Fire Information for Resource Management System (FIRMS), which publishes the detections of two instruments: MODIS on two satellites and VIIRS on three. Each satellite plays one part here:",
    roles: {
      AQUA: "the record, from {record_start} through {aqua_through}.",
      TERRA: "held and given in downloads, never counted in the record. The validation used it as an independent check on Aqua.",
      SNPP: "converted, from {viirs_from} through {snpp_through}. The conversion was fitted and tested on this satellite.",
      NOAA20: "converted with the same fixed method, from {noaa20_from}.",
      NOAA21: "not used: none of its hotspots is downloaded, counted or given in downloads.",
    },
    citations: "The datasets and their citations are listed in the margin.",
  },

  switch: {
    heading: "The sensor change",
    whyIntro: "The change sits after {aqua_through} for two reasons. The first is a result of the validation:",
    drift:
      "The second: Aqua and Terra are drifting from their orbits, so each now passes over a place at a different time of day than it used to, and both are near the end of their missions. How much that drift changes hotspot counts has not been measured.",
    method:
      "From {viirs_from}, VIIRS hotspots are converted by a fixed method, C1, so that both parts of the record are on one scale. C1 was frozen before its final test and is never refitted. The calendar marks the change with a ruled line; the colours use the same scale on both sides of it.",
  },

  cleaning: {
    heading: "How the hotspots are cleaned",
    intro: "The same rules apply to every area and every year. Nothing is deleted: a hotspot left out of the counts is marked with its reason and still given in downloads.",
    rules: [
      "Land only. A hotspot counts only if it falls on land, by the Natural Earth land outline. Offshore hotspots, such as those from oil and gas platforms, are left out.",
      "Fixed heat sources. A square about 1 km across is treated as a fixed heat source, such as a gas flare or a volcano, when it has hotspots on 50 or more different days in any one of the years 2014, 2016, 2017 and 2020. Its hotspots are left out of the counts in every year.",
      "No confidence filter. FIRMS gives each hotspot a confidence value. Every hotspot is kept, whatever its confidence, as in the validation.",
      "Day and night are both counted, and each hotspot is placed in its UTC calendar month.",
    ],
    marksLabel: "In downloads, a hotspot left out of the counts reads:",
    diffHeading: "Where the cleaning differs from the validation's",
    diffs: [
      "The validation looked for fixed heat sources only inside the regions the conversion was tuned on, so in the regions it was tested on but not tuned on, nothing was masked. This site applies the same rule everywhere it holds data, so counts in those regions can be lower here than in the data the validation scored.",
      "Inside the tuning regions, this site looks for fixed heat sources across the whole rectangle of loaded data rather than inside the region's outline. In Sumatra this changes nothing: the site's Aqua counts for the four tuning years match the validation's exactly.",
      "The validation used standard-quality data from Suomi NPP only. This site also uses near-real-time data and, from {noaa20_from}, {noaa20}. Both are explained below.",
    ],
    diffLink: "The Sumatra comparison",
  },

  quality: {
    heading: "Standard and near-real-time data",
    labels: { SP: "Standard", NRT: "Near real time" },
    body:
      "FIRMS publishes near-real-time hotspots within hours of each pass, so the latest months can be shown. Standard-quality files follow about two to three months later. Each day uses standard-quality data once it exists, and near-real-time data until then.",
    differ:
      "The two are not the same. Near-real-time positions can be off by several kilometres after a satellite manoeuvre, the two set day and night differently, and near-real-time files lack the field standard MODIS files use to mark the kind of heat source. The validation used standard-quality data only, so it says nothing about how near-real-time counts compare.",
  },

  validation: {
    heading: "What the validation does not cover",
    noaa21: "{noaa21} is not covered either. This site does not use its hotspots.",
    fed:
      "The conversion was fitted and tested on {snpp}. Since {noaa20_from} the record has been fed by {noaa20}, converted with the same method, on the untested assumption that it detects hotspots the way {snpp} did. A month fed by a satellite outside the validation says so:",
    // Shown only when /meta carries the NOAA-20 comparison and it reads higher (Story 2.10). No figure is typed here:
    // the figures are on the evidence page, from the evidence file.
    noaa20High:
      "Compared over the same months, converted {noaa20} counts read higher than converted {snpp} counts, so a month fed by {noaa20}, such as the current month, may read high. The figures, region by region, are on the evidence page:",
    noaa20Link: "NOAA-20 against Suomi NPP",
    more: "The evidence page lists the other limits of the scores.",
  },

  detection: {
    heading: "What a satellite can't see",
    passes:
      "A satellite sees a place only when it passes over, at most a few times a day and at roughly fixed local times, and only through a clear view of the ground.",
    cloud:
      "Thick cloud hides the ground, so no hotspot is recorded under it. The hotspot files do not say where it was cloudy or where data are missing, so a cloudy month can look quieter than it was, and nothing on this site can tell a cloudy month from a quiet one.",
    smoke:
      "Heavy smoke can also hide burning beneath it, according to FIRMS and others, though not every agency agrees. This matters most in equatorial haze seasons, such as Sumatra's, when smoke can cover a region for weeks: in the worst weeks the counts may understate the burning. No measure of this effect for Southeast Asian haze was found.",
    small:
      "Small, cool or brief burns can fall below what a sensor detects. VIIRS, with its smaller pixels, sees more of them than MODIS, which is one reason VIIRS counts are converted rather than used as they are.",
  },

  limits: {
    heading: "Counting limits",
    intro: "These limits apply to every count on this site, whatever the area or month:",
    items: [
      "Hotspot location files carry no cloud or missing-data information, and do not remove detections duplicated by overlapping orbits, so where passes overlap the same burning can be counted twice.",
      "Confidence values are not comparable between sensors, which is one reason no confidence filter is applied.",
      "The day/night flag is set differently in near-real-time data (by the direction of the orbit) and in standard data (by the sun's angle). This site works out day and night from the sun's position for every hotspot.",
      "Terra and Aqua are drifting from their orbits, which is one reason the record switch sits after {aqua_through}.",
      "Early VIIRS data, in 2012 and 2013, had bad scans. The validation reported those years only and never used them to choose the method.",
      "No cropland region was used to tune or choose the method. Punjab, where crop residue is burned, was scored as reported only. So the evidence for small crop burns is weaker.",
    ],
  },

  margin: {
    recordHeading: "This record",
    facts: {
      version: "Record version",
      start: "Record starts",
      aquaThrough: "Aqua MODIS through",
      viirsFrom: "Converted VIIRS from",
      snppThrough: "Suomi NPP through",
      noaa20From: "NOAA-20 from",
      dataThrough: "Data through",
      unit: "Count unit",
    },
    sourcesHeading: "Data sources and citations",
    sources: [
      { id: "modis", name: "MODIS active-fire hotspots from FIRMS, standard and near real time", satellites: ["AQUA", "TERRA"] },
      { id: "viirs", name: "VIIRS 375 m active-fire hotspots from FIRMS, standard and near real time", satellites: ["SNPP", "NOAA20"] },
      { id: "viirs-swath", name: "The VIIRS swath product used to fit the conversion", satellites: ["SNPP"] },
      { id: "natural-earth", name: "Natural Earth land outlines, for the land-only rule", satellites: [] },
    ],
    evidenceHeading: "Evidence",
    evidenceLink: "How the conversion scored, and what the scores can't show",
  },
} as const;

/** The digits COPY may hold: fixed rules and facts that no response serves. */
export const TYPED_NUMBERS = ["1", "375", "50", "2014", "2016", "2017", "2020", "2012", "2013"] as const;
