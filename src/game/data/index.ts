// Loader for the approved REVO data package (`data final.zip`).
// The JSON files are kept byte-for-byte as delivered. Where a JSON value conflicts with the
// final Kid Edition scenario, the scenario value is applied here and the conflict ID from
// docs/SCENARIO_DATA_CONFLICTS.md is noted next to it.
import m1 from "./final_mission1_solar.json";
import m2 from "./final_mission2_water.json";
import m3 from "./final_mission3_heating_oxygen.json";
import m4 from "./final_mission4_radiation_shield.json";
import m5 from "./final_mission5_greenhouse_crew_health.json";
import c1 from "./final_crisis1_opportunity_dust_storm.json";
import c2 from "./final_crisis2_extreme_cold_wave.json";
import c3 from "./final_crisis3_solar_flare.json";
import c4 from "./final_crisis4_cme_blackout.json";
import c5 from "./final_crisis5_bio_maintenance.json";
import p3 from "./final_stage3_rover_ares_landing.json";

type AnyCard = { card_id?: number; option_id?: number; card_name?: string; name?: string };
const byId = <T extends AnyCard>(cards: T[], id: number) => {
  const c = cards.find((x) => (x.card_id ?? x.option_id) === id);
  if (!c) throw new Error(`REVO data: card ${id} missing`);
  return c;
};
// C-11: some cards use `name` instead of `card_name`.
export const cardName = (c: AnyCard) => c.card_name ?? c.name ?? "";

// ---- Mission 1 ----
const grid = (id: number) => {
  const c = byId(m1.decision_cards, id);
  return { days: c.cost_days, gross: c.gross_power_bars, net: c.net_power_after_base_load };
};

// ---- Mission 2 ----
const water = (id: number) => {
  const c = byId(m2.decision_cards, id);
  return {
    days: c.cost_days,
    power: c.cost_power_bars_per_sol,
    recovery: c.water_gained_liters_per_sol,
    net: c.net_water_change_liters_per_sol,
  };
};

// ---- Mission 3 ----
const heat = (id: number) => {
  const c = byId(m3.decision_cards, id);
  return { days: c.cost_days, power: c.cost_power_bars_per_sol };
};

// ---- Mission 4 ----
const shield = (id: number) => {
  const c = byId(m4.decision_cards, id);
  return { days: c.cost_days, power: c.cost_power_bars_per_sol, gain: c.safety_bars_gained };
};

// ---- Mission 5 ----
// C-05: `water_cost_liters` is really `water_cost_units`. The MD table converts units to bars:
// 3 -> 1 bar, 5 -> 1.5, 8 -> 2.5 (O-02, table value), 10 -> 3. 1 bar = 30 L.
const WATER_UNITS_TO_L: Record<number, number> = { 3: 30, 5: 45, 8: 75, 10: 90 };
// MD: energy_provided 20/50/70/100 -> +1/+2/+3/+4 Vital Readiness.
const ENERGY_TO_READINESS: Record<number, number> = { 20: 1, 50: 2, 70: 3, 100: 4 };
const crop = (cropId: "CR01" | "CR02" | "CR03" | "CR04") => {
  const cat = m5.nasa_source_data.crops_catalog.find((c) => c.crop_id === cropId)!;
  const card = m5.decision_cards.find((c) => c.crop_id === cropId)!;
  const fitnessDays = cropId === "CR04" ? 1 : 0; // CR04 card cost_days (3) includes the 1-day gym
  return {
    name: cat.name_en,
    plantDays: card.cost_days - fitnessDays,
    waterUnits: cat.water_cost_units,
    waterL: WATER_UNITS_TO_L[cat.water_cost_units],
    power: card.power_cost_per_sol,
    grow: cat.growth_time_days,
    energy: cat.energy_provided,
    readiness: ENERGY_TO_READINESS[cat.energy_provided] ?? card.readiness_gained,
    // C-10: MD gives lettuce +1 oxygen; the JSON has no oxygen field.
    oxygen: cropId === "CR03" ? 1 : 0,
  };
};

// ---- Crises ----
const c2card = (id: number) => {
  const c = byId(c2.decision_cards, id);
  return {
    days: c.cost_days,
    power: -c.power_cost_total,
    oxygen: -c.effects.oxygen_loss,
    readiness: -c.effects.readiness_loss,
  };
};
const c3card = (id: number) => {
  const c = byId(c3.decision_cards, id);
  const e = c.effects as { radiation_loss: number; health_loss?: number };
  return {
    days: c.cost_days,
    power: -c.power_cost_total,
    radiation: -e.radiation_loss,
    readiness: -(e.health_loss ?? 0),
  };
};
const c5card = (id: number) => byId(c5.decision_cards, id);
const amps = Object.fromEntries(
  c4.circuit_components.map((d) => [d.device_id, d.amp_load]),
) as Record<string, number>;
const wiring = (id: number) =>
  byId(c4.decision_wiring_options, id).effects as unknown as Record<string, number | boolean>;

export const DATA = {
  startDays: m1.nasa_source_data.starting_days,
  baseLoadKwh: m1.nasa_source_data.base_computer_load_kwh_per_sol,
  dustPerSol: m1.nasa_source_data.mars_dust_decay_rate_per_sol,
  stormMultiplier: m1.nasa_source_data.storm_power_reduction_multiplier,
  grids: { emergency: grid(1), basic: grid(2), medium: grid(3), giant: grid(4) },

  waterTankL: m2.nasa_source_data.lander_initial_tank_liters,
  waterLossPerSol: m2.nasa_source_data.total_daily_consumption_liters,
  waterSystems: { tank: water(1), oven: water(2), recycler: water(3), full: water(4) },
  greenhouseMinWaterL: m2.game_logic_thresholds.minimum_water_for_greenhouse_liters,

  heatModes: { low: heat(1), balanced: heat(2), core: heat(3), max: heat(4) },
  m3MinSafePower: m3.game_logic_rules.minimum_safe_power_bars,
  frostWaveSol: m3.game_logic_rules.frost_wave_sol,

  shields: { hull: shield(1), soil: shield(2), water: shield(3), fortress: shield(4) },
  radiationStart: m4.game_logic_rules.starting_safety_bars,
  radiationDecay: m4.game_logic_rules.daily_radiation_decay_rate,
  radiationMax: m4.game_logic_rules.radiation_shield_max_bars,
  flareSol: m4.game_logic_rules.solar_flare_sol,

  crops: { CR01: crop("CR01"), CR02: crop("CR02"), CR03: crop("CR03"), CR04: crop("CR04") },
  readinessStart: m5.game_logic_rules.starting_vital_readiness,
  readinessDecay: m5.game_logic_rules.daily_vital_decay_rate,

  c1: {
    days: byId(c1.decision_cards, 1).cost_days,
    hibernate: { power: -1, readiness: byId(c1.decision_cards, 1).vital_readiness_effect },
    clean: { power: 2, oxygen: -1, radiation: -1 },
    // C-01: JSON text says "-3 power bars per sol"; the approved MD rule is -3 TOTAL.
    fullops: { power: -3 },
    solarMultiplier: c1.game_logic_rules.solar_power_reduction_multiplier,
  },
  c2: { maxheat: c2card(1), oxygen: c2card(2), backup: c2card(3) },
  c3: {
    seal: c3card(1),
    greenhouse: c3card(2),
    hesitate: c3card(3),
    timerSec: c3.game_logic_rules.response_timer_seconds,
    flareClass: c3.nasa_source_data.flare_class,
    hazard: c3.nasa_source_data.hazard_level,
  },
  c4: {
    limit: c4.nasa_source_data.main_breaker_amp_limit,
    amps: { moxie: amps.dev_01, heater: amps.dev_02, pump: amps.dev_03, leds: amps.dev_04 },
    smart: wiring(1),
    minimal: wiring(2),
    overload: wiring(3),
    cmeClass: c4.nasa_source_data.cme_event_class,
    hazard: c4.nasa_source_data.hazard_level,
    cmeSpeed: c4.nasa_source_data.cme_speed_km_per_sec,
  },
  c5: {
    recovery: {
      power: -c5card(1).power_cost_total,
      oxygen: -c5card(1).oxygen_cost_total,
      withUnit: (c5card(1).effects as { readiness_gain_with_unit: number })
        .readiness_gain_with_unit,
      withoutUnit: (c5card(1).effects as { readiness_gain_without_unit: number })
        .readiness_gain_without_unit,
    },
    airvalves: {
      oxygen: (c5card(2).effects as { oxygen_gain: number }).oxygen_gain,
      readiness: (c5card(2).effects as { readiness_gain: number }).readiness_gain,
    },
    rest: { readiness: -(c5card(3).effects as { readiness_loss: number }).readiness_loss },
  },
  rover: {
    chargeCost: -p3.rover_mechanics.charging_cost_power_bars,
    maxPoints: p3.rover_mechanics.max_movement_points,
    // C-02: JSON `points_lost: 2` (8 points); approved MD value is 9 points.
    tiredPoints: 9,
    fatiguePower: -p3.rover_mechanics.fatigue_penalty.power_lost_bars,
    fatigueOxygen: -p3.rover_mechanics.fatigue_penalty.oxygen_lost_bars,
    terrainCost: {
      flat: p3.terrain_movement_costs.Flat_Plains.cost_points,
      ice: p3.terrain_movement_costs.Ice_Patch.cost_points,
      crater: p3.terrain_movement_costs.Crater.cost_points,
      mountain: p3.terrain_movement_costs.Mountain.cost_points,
    },
    windowClass: p3.nasa_source_data.solar_window_class,
    windowHazard: p3.nasa_source_data.solar_hazard_level,
  },
  sources: {
    m1: (m1 as { data_sources?: string[] }).data_sources ?? [],
    m2: m2.data_sources,
    m3: m3.data_sources,
    m4: m4.data_sources,
    m5: m5.data_sources,
    c1: c1.data_sources,
    c2: c2.data_sources,
    c3: c3.data_sources,
    c4: c4.data_sources,
    c5: c5.data_sources,
    p3: p3.data_sources,
  },
} as const;

export type CropKey = keyof typeof DATA.crops;
