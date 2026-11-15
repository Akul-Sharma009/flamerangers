"""Story 7.1: the raw splice, the naive series that joins sensors with no conversion.

Aqua MODIS raw counts through December 2011, raw Suomi NPP counts from January 2012. The counts are the
per-satellite raw row counts the record already holds (same query, same cleaning); nothing is converted.
Pure: no file, clock or network access.
"""

SPLICE_FIRST = (2012, 1)        # the first month that uses raw Suomi NPP
EARLY_BAD_SCAN_LAST = (2013, 12)  # raw VIIRS months up to here carry the early bad-scan caution
SOURCES = ("aqua_raw", "snpp_raw")


def source(year: int, month: int) -> str:
    return "aqua_raw" if (year, month) < SPLICE_FIRST else "snpp_raw"


def early_bad_scan(year: int, month: int) -> bool:
    """True for raw Suomi NPP months in 2012 and 2013."""
    return SPLICE_FIRST <= (year, month) <= EARLY_BAD_SCAN_LAST


def splice_count(year: int, month: int, raw_aqua, raw_snpp):
    """The splice's raw count for one month: Aqua before January 2012, Suomi NPP from then. None stays None
    (missing is not zero)."""
    return raw_aqua if source(year, month) == "aqua_raw" else raw_snpp
