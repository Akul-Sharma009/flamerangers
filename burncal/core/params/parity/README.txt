PARITY TARGETS: C1, 4A, 1A predictions for the selection years
Source: harness run 685423734cfe (data/results/final_work/685423734cfe/<id>/selection_main.npz), copied byte-for-byte. The harness freeze check reproduced the step 1 prediction hashes for these files.

What they are: predicted Aqua-equivalent hotspot COUNTS (expected counts, not rounded), made from Suomi NPP (SNPP) hotspots of 2015 and 2018 by the fitted state (fit on tuning years 2014, 2016, 2017, 2020).
Units: hotspots (counts) per cell per UTC calendar month.
Years axis (axis 1): index 0 = 2015, index 1 = 2018 (config.SELECTION_YEARS).
Month axis (axis 2): index 0..11 = UTC calendar months 1..12.
Cell axis (axis 0): row i of cells_<scale>deg_<region>.csv in this folder (columns region, lon, lat = south-west corner of the cell in degrees, land_area_deg2, tile). Land cells only. Order is grid.cells(region, scale).
Cell assignment: a hotspot belongs to the cell [lon, lon+step) x [lat, lat+step); step 1.0 or 0.25.

Files: <ID>_selection_main.npz for ID in C1, 4A, 1A. Load with np.load(path, allow_pickle=False). Arrays:
  C1:
    count_1deg|sumatra                           shape (75, 2, 12)  float64  [cells, 2 years, 12 months], 1 degree
    count_1deg|australia_grassland               shape (81, 2, 12)  float64  [cells, 2 years, 12 months], 1 degree
    count_1deg|amazon_forest                     shape (56, 2, 12)  float64  [cells, 2 years, 12 months], 1 degree
    count_025deg|sumatra                         shape (797, 2, 12)  float64  [cells, 2 years, 12 months], 0.25 degree
    count_025deg|australia_grassland             shape (1236, 2, 12)  float64  [cells, 2 years, 12 months], 0.25 degree
    count_025deg|amazon_forest                   shape (896, 2, 12)  float64  [cells, 2 years, 12 months], 0.25 degree
    own_unit_name                                shape ()  <U1  metadata string (own_unit_name is empty; no own-unit, no native flags in these files)
    notes                                        shape ()  <U44  metadata string (own_unit_name is empty; no own-unit, no native flags in these files)
    notes string: 'C1: (1-w)*4A + w*1A, w_season=0.7, w_off=0.3'
  4A:
    count_1deg|sumatra                           shape (75, 2, 12)  float64  [cells, 2 years, 12 months], 1 degree
    count_1deg|australia_grassland               shape (81, 2, 12)  float64  [cells, 2 years, 12 months], 1 degree
    count_1deg|amazon_forest                     shape (56, 2, 12)  float64  [cells, 2 years, 12 months], 1 degree
    count_025deg|sumatra                         shape (797, 2, 12)  float64  [cells, 2 years, 12 months], 0.25 degree
    count_025deg|australia_grassland             shape (1236, 2, 12)  float64  [cells, 2 years, 12 months], 0.25 degree
    count_025deg|amazon_forest                   shape (896, 2, 12)  float64  [cells, 2 years, 12 months], 0.25 degree
    own_unit_name                                shape ()  <U1  metadata string (own_unit_name is empty; no own-unit, no native flags in these files)
    notes                                        shape ()  <U1  metadata string (own_unit_name is empty; no own-unit, no native flags in these files)
    notes string: ''
  1A:
    count_1deg|sumatra                           shape (75, 2, 12)  float64  [cells, 2 years, 12 months], 1 degree
    count_1deg|australia_grassland               shape (81, 2, 12)  float64  [cells, 2 years, 12 months], 1 degree
    count_1deg|amazon_forest                     shape (56, 2, 12)  float64  [cells, 2 years, 12 months], 1 degree
    count_025deg|sumatra                         shape (797, 2, 12)  float64  [cells, 2 years, 12 months], 0.25 degree
    count_025deg|australia_grassland             shape (1236, 2, 12)  float64  [cells, 2 years, 12 months], 0.25 degree
    count_025deg|amazon_forest                   shape (896, 2, 12)  float64  [cells, 2 years, 12 months], 0.25 degree
    own_unit_name                                shape ()  <U1  metadata string (own_unit_name is empty; no own-unit, no native flags in these files)
    notes                                        shape ()  <U102  metadata string (own_unit_name is empty; no own-unit, no native flags in these files)
    notes string: '1A frozen virtual Aqua: logistic(log FRP, scan angle from VNP14IMG VZA, log VIIRS PixArea) + miss term'

Regions: sumatra, australia_grassland, amazon_forest (the three tuning regions). Number of land cells (1 deg / 0.25 deg): sumatra: 75 / 797; australia_grassland: 81 / 1236; amazon_forest: 56 / 896

Inputs the predictions came from (taken from data/manifest.json, which the harness download step wrote):
  SNPP selection-year hotspots (FIRMS country yearly CSVs, cleaned by the harness processing step):
    heldout/inputs/raw/firms_country/viirs-snpp/viirs-snpp_2015_Australia.csv  sha256=5c70283f44f8f298d8054c47aa1a704bf723dd9190c9515e83219403709c013e
    heldout/inputs/raw/firms_country/viirs-snpp/viirs-snpp_2015_Brazil.csv  sha256=3e4de6dea98b4095dcf2670739035f5a7497e15f33deab1508a78a67a0cc8881
    heldout/inputs/raw/firms_country/viirs-snpp/viirs-snpp_2015_Indonesia.csv  sha256=88ffeba70b181aedbf8601504e082a1d3e8cc690902f5e86979ae4716f240208
    heldout/inputs/raw/firms_country/viirs-snpp/viirs-snpp_2018_Australia.csv  sha256=84fa119ad4113029530f7921daec9802e4b0cabcc16d5cca6a49dfba319d3492
    heldout/inputs/raw/firms_country/viirs-snpp/viirs-snpp_2018_Brazil.csv  sha256=df2ca4bdedda82de5df21c598b92e619afade1f07ccc09811d104568e994ee54
    heldout/inputs/raw/firms_country/viirs-snpp/viirs-snpp_2018_Indonesia.csv  sha256=677dd2fcbb5d9445e372b0a79fc6553a2cc838862686ae4c4cd98fc89ebc4b44
  Fit data (all under data/open, tuning years 2014, 2016, 2017, 2020, Aqua and SNPP) and 2003-2011 Aqua history (season rule):
    51 raw FIRMS files under data/open/raw/firms_country/ (listed in out/MANIFEST.json)
  1A angle lookup: VNP14IMG sample under data/open/extra/1A/ (already baked into the state's angle_lookup).

Reading note: C1 is a blend of the 4A and 1A arrays of this same folder: C1 = clip((1-w)*4A + w*1A, 0) with w = 0.7 in fire-season months, 0.3 otherwise. Fire-season months for 2015 and 2018 come from the 2003-2011 Aqua history (c1_params.json: history_aqua_month_totals_2003_2011_by_region), not from the selection years. Float agreement should be to rounding error (different BLAS/summation order), not to the bit, when re-implemented.
