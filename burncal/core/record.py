"""Story 2.4: which rows feed the harmonized record and what each weighs (AD-3, AD-5, AD-12).

Pure: no file, clock or network access. "Now" is passed in as data_through (AD-16).
"""
from datetime import date

import numpy as np

RECORD_START = date(2002, 7, 4)      # first Aqua MODIS day in FIRMS
AQUA_LAST = date(2021, 12, 31)       # Aqua feeds through December 2021
VIIRS_FIRST = date(2022, 1, 1)       # VIIRS (C1 weights) feeds from January 2022
SNPP_LAST = date(2026, 11, 2)        # Suomi NPP feeds through 2 November 2026
NOAA20_FIRST = date(2026, 11, 3)     # NOAA-20 feeds from 3 November 2026, not validated
VIIRS_FEEDING = ("SNPP", "NOAA20")


def _days(utc_date) -> np.ndarray:
    return np.asarray(utc_date, dtype="datetime64[D]")


def feeds_record(satellite, utc_date) -> np.ndarray:
    """True where the row's satellite feeds the record on its UTC day. Terra and NOAA-21 never do."""
    sat, d = np.asarray(satellite, object), _days(utc_date)
    D = lambda x: np.datetime64(x, "D")  # noqa: E731
    return (((sat == "AQUA") & (d <= D(AQUA_LAST)))
            | ((sat == "SNPP") & (d >= D(VIIRS_FIRST)) & (d <= D(SNPP_LAST)))
            | ((sat == "NOAA20") & (d >= D(NOAA20_FIRST))))


def validated_satellite(satellite, utc_date) -> np.ndarray:
    """False only for feeding NOAA-20 rows: C1 was scored on Suomi NPP, never on NOAA-20."""
    return ~(feeds_record(satellite, utc_date) & (np.asarray(satellite, object) == "NOAA20"))


def weights(satellite, utc_date, excluded_reason, c1_weight) -> np.ndarray:
    """Per row: 1 for feeding Aqua, the C1 weight for feeding VIIRS, 0 otherwise (and 0 when excluded)."""
    sat = np.asarray(satellite, object)
    feeds = feeds_record(sat, utc_date) & (np.asarray(excluded_reason, object) == "none")
    viirs = feeds & np.isin(sat, VIIRS_FEEDING)
    c1w = np.asarray(c1_weight, float)
    if np.isnan(c1w[viirs]).any():
        raise ValueError("feeding VIIRS rows need a C1 weight")
    return np.where(feeds & (sat == "AQUA"), 1.0, np.where(viirs, c1w, 0.0))


def month_state(year: int, month: int, *, data_through: date) -> tuple[str, str | None]:
    """("null", "outside_record"), ("partial", reason) or ("complete", None) for one calendar month."""
    first = date(year, month, 1)
    last = date(year + month // 12, month % 12 + 1, 1)  # first day of the next month
    if last <= RECORD_START or first > data_through:
        return "null", "outside_record"
    if first < RECORD_START:
        return "partial", "record_start"
    if (last - first).days > (data_through - first).days + 1:
        return "partial", "data_through"
    return "complete", None


def meta_dates(data_through: date) -> dict:
    """AD-16: the current month, the day d and the reference period, all from data_through."""
    return {"current_month": f"{data_through.year:04d}-{data_through.month:02d}",
            "data_through_day": data_through.day,
            "reference_period": {"start_year": 2003, "end_year": data_through.year - 1}}


def partial_reasons(year: int, month: int, *, data_through: date, missing_days: bool, start: date, end: date) -> list[str]:
    """AD-17 partial reasons of one month, in the contract's order. Months outside the record get none."""
    state, reason = month_state(year, month, data_through=data_through)
    out = [reason] if state == "partial" else []
    if state != "null" and missing_days:
        out.append("missing_days")
    first = date(year, month, 1)
    last = date(year + month // 12, month % 12 + 1, 1)
    # A range ending on data_through does not cut the current month: the data ends there anyway.
    if start > first or end < min(date.fromordinal(last.toordinal() - 1), data_through):
        out.append("range_cut")
    return out
