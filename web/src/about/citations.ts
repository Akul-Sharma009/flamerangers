// Story 6.1: each data source's citation and links, from the data owner's draft
// (docs/submission/datasets-references.md). Each DOI was resolved at doi.org by the data
// owner; the FIRMS acknowledgement was checked against the FIRMS page by the lead's
// session on 15 Nov. Official product names are kept as published (the lead's decision,
// 15 Nov), so some contain the word the rest of the site does not use.
//
// These are reference identifiers, not figures, so they live outside COPY and its
// typed-digit rule (copy.ts).

export interface Citation {
  text: string;
  links: { label: string; href: string }[];
}

export const CITATIONS: Record<"modis" | "viirs" | "viirs-swath" | "natural-earth" | "natural-earth-admin", Citation> = {
  modis: {
    text: "NASA FIRMS, MODIS Collection 6.1 active fire hotspots (MCD14ML standard, MCD14DL near real time).",
    links: [
      { label: "Standard (DOI)", href: "https://doi.org/10.5067/FIRMS/MODIS/MCD14ML" },
      { label: "Near real time (DOI)", href: "https://doi.org/10.5067/FIRMS/MODIS/MCD14DL.NRT.0061" },
    ],
  },
  viirs: {
    text: "NASA FIRMS, VIIRS 375 m active fire hotspots (VNP14IMGTDL_NRT, VJ114IMGTDL_NRT; standard archive VNP14IMGTML, VJ114IMGTML).",
    links: [
      { label: "Suomi NPP near real time (DOI)", href: "https://doi.org/10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002" },
      { label: "NOAA-20 near real time (DOI)", href: "https://doi.org/10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002" },
      { label: "Standard archive (FIRMS download)", href: "https://firms.modaps.eosdis.nasa.gov/download/" },
    ],
  },
  "viirs-swath": {
    text: "NASA LP DAAC, VIIRS/NPP Active Fires 6-Min L2 Swath 375 m V002 (VNP14IMG).",
    links: [{ label: "DOI", href: "https://doi.org/10.5067/VIIRS/VNP14IMG.002" }],
  },
  "natural-earth": {
    text: "Made with Natural Earth. 1:10m land, version 5.1.1, public domain.",
    links: [{ label: "Natural Earth", href: "https://www.naturalearthdata.com/" }],
  },
  "natural-earth-admin": {
    text: "Made with Natural Earth. 1:10m Admin 0 – Countries and Admin 1 – States, Provinces, version 5.1.2, public domain. Outlines are simplified to about 2 km for this site.",
    links: [
      { label: "Natural Earth", href: "https://www.naturalearthdata.com/" },
      { label: "Version 5.1.2 files", href: "https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson" },
    ],
  },
};

/** FIRMS asks users of its data to acknowledge it in these words (FIRMS page, checked 15 Nov). */
export const FIRMS_ACKNOWLEDGEMENT =
  "We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (https://earthdata.nasa.gov/firms), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) (https://earthdata.nasa.gov/lance) and NASA's Earth Science Data and Information System (ESDIS).";

/**
 * Story 8.6: the sources of the trend test. Mann and Sen were looked up in Crossref on 15 Nov
 * (title, author, journal, volume, issue, pages and year matched). Kendall (1938) was looked up the same way
 * by the lead's session and re-checked here (first page, volume, issue and year matched).
 */
export const TREND_CITATIONS: { text: string; links: { label: string; href: string }[] }[] = [
  {
    text: "Mann, H. B. (1945). Nonparametric tests against trend. Econometrica, 13(3), 245–259.",
    links: [{ label: "DOI", href: "https://doi.org/10.2307/1907187" }],
  },
  {
    text: "Kendall, M. G. (1938). A new measure of rank correlation. Biometrika, 30(1/2), 81–93.",
    links: [{ label: "DOI", href: "https://doi.org/10.2307/2332226" }],
  },
  {
    text: "Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. Journal of the American Statistical Association, 63(324), 1379–1389.",
    links: [{ label: "DOI", href: "https://doi.org/10.1080/01621459.1968.10480934" }],
  },
];
