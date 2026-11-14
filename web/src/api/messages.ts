// Typed access to contract/messages.yaml (loaded at build time by the
// contract-messages Vite plugin). This describes the messages file, not a
// service response; response shapes come only from schema.d.ts.
import raw from "virtual:messages";
import type { components } from "./schema";

type S = components["schemas"];
type Table<K extends string> = Record<K, string>;

export interface Messages {
  version: string;
  problems: Table<S["ProblemCode"]>;
  cautions: Table<S["CautionCode"]>;
  labels: {
    flag_state: Table<S["FlagState"]>;
    partial_reason: Table<S["PartialReason"]>;
    null_reason: Table<S["NullReason"]>;
    source: Table<S["Source"]>;
    quality: Table<S["Quality"]>;
    evidence_class: Table<S["EvidenceClass"]>;
    region_caveat: Table<S["RegionCaveat"]>;
    satellite: Table<S["Satellite"]>;
    excluded_reason: Table<S["ExcludedReason"]>;
    day_night: Table<S["DayNight"]>;
    coverage_status: Table<S["CoverageStatus"]>;
  };
  notes: Table<
    | "placeholder"
    | "hotspot_definition"
    | "record_switch"
    | "satellite_switch"
    | "validated_satellite_false"
    | "after_pick_years"
    | "year_incomplete"
    | "monthly_validation_only"
    | "no_typical_activity"
    | "strong_tier"
    | "flag_scale"
    | "reference_year"
    | "provisional"
    | "noaa20_check"
    | "noaa20_check_not_run"
  >;
  client: Table<
    | "coordinates_out_of_range"
    | "latitude_out_of_order"
    | "polygon_not_closed"
    | "service_unreachable"
    | "evidence_unavailable"
  >;
}

export const messages = raw as Messages;
