import axios from "axios";
import { DisruptionRequest, PlanResponse } from "./types";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json"
  }
});

export async function runPlan(
  payload: { events?: DisruptionRequest[]; seed?: number; write_outputs?: boolean }
): Promise<PlanResponse> {
  const response = await api.post<PlanResponse>("/plan/run", {
    events: payload.events ?? [],
    seed: payload.seed ?? 42,
    write_outputs: payload.write_outputs ?? false
  });
  return response.data;
}

export async function runSample(): Promise<PlanResponse> {
  const response = await api.post<PlanResponse>("/plan/sample");
  return response.data;
}

export interface CargoInputData {
  cargo_id: string;
  origin: string;
  destination: string;
  weight_kg: number;
  volume_m3: number;
  revenue_inr: number;
  priority: string;
  perishable: boolean;
  max_transit_hours: number;
  ready_time: string;
  due_by: string;
  handling_cost_per_kg: number;
  sla_penalty_per_hour: number;
}

export async function addCargo(cargo: CargoInputData): Promise<{ message: string; cargo_id: string; status: string }> {
  const response = await api.post<{ message: string; cargo_id: string; status: string }>("/cargo/add", cargo);
  return response.data;
}
