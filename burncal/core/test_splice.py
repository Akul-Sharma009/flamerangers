from burncal.core import splice


def test_aqua_before_january_2012_and_snpp_from_then():
    assert splice.source(2011, 12) == "aqua_raw" and splice.source(2012, 1) == "snpp_raw"
    assert splice.splice_count(2011, 12, 10, 99) == 10
    assert splice.splice_count(2012, 1, 10, 99) == 99
    assert splice.splice_count(2020, 6, 10, 99) == 99 and splice.splice_count(2026, 5, 10, 99) == 99


def test_missing_is_not_zero():
    assert splice.splice_count(2011, 12, None, 5) is None
    assert splice.splice_count(2015, 1, 5, None) is None
    assert splice.splice_count(2015, 1, 5, 0) == 0


def test_the_bad_scan_caution_covers_raw_viirs_in_2012_and_2013_only():
    assert [early for early in (splice.early_bad_scan(y, m) for y, m in
                                [(2011, 12), (2012, 1), (2013, 12), (2014, 1)])] == [False, True, True, False]
