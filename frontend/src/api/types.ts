export type DisruptionType = "delay" | "cancel" | "swap";

export interface RouteLeg {
  flight_id: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  dwell_hours_before: number;
}

export interface CargoAssignment {
  status: string;
  margin: number;
  reason: string | null;
  origin: string;
  destination: string;
  priority: string;
  weight_kg: number;
  volume_m3: number;
  revenue_inr: number;
  route: RouteLeg[];
}

export interface FlightCargoSummary {
  cargo_id: string;
  weight_kg: number;
  volume_m3: number;
  revenue: number;
  priority: string;
}

export interface FlightAssignment {
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  weight_capacity_kg: number;
  volume_capacity_m3: number;
  assigned: FlightCargoSummary[];
}

export interface AlertPayload {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  cargo_id: string | null;
  flight_id: string | null;
  status: string | null;
  margin_delta: number | null;
}

export interface PlanSummary {
  total_margin: number;
  delivered: number;
  rolled: number;
  denied: number;
}

export interface RecommendationOption {
  type: string;
  description: string;
  impact: string;
  cost: number;
  recovery: number;
  feasibility: number;
  time_hours: number;
  risk: string;
  actions: string[];
}

export interface CargoRecommendation {
  cargo_id: string;
  priority: string;
  denial_reason: string;
  revenue_at_risk: number;
  recommended_option: RecommendationOption | null;
  all_options: RecommendationOption[];
}

export interface AIRecommendations {
  summary: {
    total_cargo_at_risk: number;
    total_revenue_at_risk: number;
    high_priority_count: number;
    medium_priority_count: number;
    low_priority_count: number;
  };
  recommendations: CargoRecommendation[];
}

export interface PlanResponse {
  summary: PlanSummary;
  cargo: Record<string, CargoAssignment>;
  flights: Record<string, FlightAssignment>;
  alerts: AlertPayload[];
  events: DisruptionRequest[];
  ai_recommendations?: AIRecommendations;
}

export interface DisruptionRequest {
  event_type: DisruptionType;
  flight_id: string;
  delay_minutes?: number;
  new_weight_capacity_kg?: number;
  new_volume_capacity_m3?: number;
}
