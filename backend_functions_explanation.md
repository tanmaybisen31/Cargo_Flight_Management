# Backend Functions Explanation

This document provides a comprehensive explanation of all functions in each backend Python file for the Revenue Management system.

## Table of Contents
1. [main.py](#mainpy)
2. [api.py](#apipy)
3. [pipeline.py](#pipelinepy)
4. [load_data.py](#load_datapy)
5. [disruptions.py](#disruptionspy)
6. [outputs.py](#outputspy)
7. [ga_route.py](#ga_routepy)
8. [knapsack.py](#knapsackpy)
9. [ai_recommendations.py](#ai_recommendationspy)
10. [Test Files](#test-files)

## main.py

### `_load_events(path: Path) -> Iterable[DisruptionEvent]`
- **Purpose**: Loads disruption events from a JSON file
- **Parameters**: `path` - Path to the JSON file containing disruption events
- **Returns**: Iterable of DisruptionEvent objects
- **Logic**: Reads JSON file, parses each event into DisruptionEvent dataclass with event_type, flight_id, delay_minutes, and capacity overrides

### `main() -> None`
- **Purpose**: Main entry point for the command-line application
- **Functionality**:
  - Parses command-line arguments for data directory, output directory, disruption events file, and random seed
  - Loads disruption events if provided
  - Creates PipelineConfig and runs the pipeline
  - Prints summary results including total margin, delivered cargo count, and alerts

## api.py

### `health() -> dict[str, str]`
- **Purpose**: Health check endpoint for the FastAPI application
- **Returns**: Dictionary with status "ok"

### `run_plan(request: PlanRequest) -> dict`
- **Purpose**: API endpoint to run the cargo planning pipeline
- **Parameters**: `request` - PlanRequest containing events, seed, write_outputs, data_dir, output_dir
- **Returns**: Payload from pipeline result
- **Logic**: Creates PipelineConfig from request, runs pipeline, returns formatted result

### `run_sample_plan() -> dict`
- **Purpose**: API endpoint to run a sample planning scenario without disruptions
- **Returns**: Payload from pipeline result with default configuration

### `parse_datetime(dt_str: str) -> datetime`
- **Purpose**: Parses datetime strings with timezone handling
- **Logic**: Handles ISO format with or without timezone, defaults to Asia/Calcutta (+05:30) if no timezone provided

### `add_cargo(cargo: CargoInputModel) -> dict`
- **Purpose**: API endpoint to add new cargo to the CSV file
- **Parameters**: `cargo` - CargoInputModel with all cargo details
- **Validation**:
  - Origin and destination must be different
  - Cargo ID must be unique
  - Datetime formats must be valid
  - Due by must be after ready time
- **Logic**: Validates input, parses datetimes, appends to cargo.csv with proper formatting

## pipeline.py

### `run_pipeline(config: PipelineConfig) -> PipelineResult`
- **Purpose**: Main pipeline orchestrator that runs the complete cargo planning process
- **Parameters**: `config` - PipelineConfig with data/output directories, events, seed, write_outputs
- **Process**:
  1. Loads flights, cargo, and connections
  2. Runs baseline GA optimization
  3. Applies disruptions if any
  4. Generates AI recommendations
  5. Writes outputs if configured
  6. Returns comprehensive result

### `result_to_payload(result: PipelineResult) -> Dict[str, Any]`
- **Purpose**: Converts PipelineResult to API-friendly payload format
- **Logic**: Transforms cargo assignments, flight loads, alerts, and events into structured dictionaries with proper validation

## load_data.py

### `_ensure_columns(df: pd.DataFrame, required: Iterable[str], source: Path) -> None`
- **Purpose**: Validates that required columns exist in CSV data
- **Raises**: DataValidationError if missing columns

### `_parse_iso_datetime(value: str, field: str) -> datetime`
- **Purpose**: Parses ISO datetime strings with timezone handling
- **Logic**: Handles UTC 'Z' format and timezone offsets, defaults to Asia/Calcutta

### `_parse_bool(value: str, field: str) -> bool`
- **Purpose**: Parses boolean values from various string representations
- **Accepted values**: true/1/yes/y (True), false/0/no/n (False)

### `_validate_positive(name: str, value: float) -> None`
- **Purpose**: Validates that numeric values are positive
- **Raises**: DataValidationError for non-positive values

### `load_flights(path: Path) -> Dict[str, Flight]`
- **Purpose**: Loads flight data from CSV
- **Validation**: Required columns, valid datetimes, positive capacities/costs
- **Returns**: Dictionary of Flight objects keyed by flight_id

### `load_cargo(path: Path) -> Dict[str, Cargo]`
- **Purpose**: Loads cargo data from CSV
- **Validation**: Required columns, valid datetimes, positive values, due_by > ready_time
- **Returns**: Dictionary of Cargo objects keyed by cargo_id

### `load_connections(path: Path) -> List[ConnectionRule]`
- **Purpose**: Loads connection rules from CSV
- **Validation**: Required columns, positive values
- **Returns**: List of ConnectionRule objects

### `load_all(data_dir: Path) -> Tuple[Dict[str, Flight], Dict[str, Cargo], List[ConnectionRule]]`
- **Purpose**: Loads all data files (flights, cargo, connections) from data directory
- **Returns**: Tuple of flights dict, cargo dict, and connections list

### `export_to_json(data: Dict[str, object], out_path: Path) -> None`
- **Purpose**: Exports data dictionary to JSON file with proper formatting

## disruptions.py

### `_adjust_flights(flights: Dict[str, Flight], events: Iterable[DisruptionEvent]) -> Tuple[Dict[str, Flight], List[Alert]]`
- **Purpose**: Applies disruption events to flight schedules
- **Logic**:
  - Delay: Adds delay minutes to departure/arrival times
  - Cancel: Removes flight from schedule
  - Swap: Updates weight/volume capacities
- **Returns**: Updated flights dict and list of disruption alerts

### `_leg_sequence(route) -> Tuple[str, ...]`
- **Purpose**: Extracts flight IDs from a route for comparison
- **Returns**: Tuple of flight ID strings

### `_compare_results(baseline: GAResult, scenario: GAResult) -> List[Alert]`
- **Purpose**: Compares baseline vs disrupted results to identify changes
- **Alerts generated**: status_change, reroute, margin_change, cargo_missing, exception

### `baseline_alerts(result: GAResult) -> List[Alert]`
- **Purpose**: Generates alerts for cargo not delivered in baseline scenario
- **Returns**: List of baseline_exception alerts

### `apply_disruptions(baseline: GAResult, cargo_map: Dict[str, Cargo], flights: Dict[str, Flight], connection_rules: Iterable[ConnectionRule], events: Iterable[DisruptionEvent], seed: Optional[int] = 123) -> Tuple[GAResult, Dict[str, Flight], List[Alert]]`
- **Purpose**: Main function to apply disruptions and re-optimize
- **Process**:
  1. Adjust flights based on events
  2. Re-run GA optimization
  3. Compare results and generate alerts
- **Returns**: New GAResult, adjusted flights, and combined alerts

## outputs.py

### `_route_descriptor(route) -> str`
- **Purpose**: Creates human-readable route description
- **Returns**: Space-separated flight IDs or "DENIED"

### `write_plan_routes(result: GAResult, out_path: Path) -> None`
- **Purpose**: Writes detailed cargo assignment results to CSV
- **Columns**: cargo_id, status, reason, flight_sequence, etds, etas, total_cost, revenue, margin, transit_hours, sla_penalty, handling_penalty, notes

### `write_flight_loads(result: GAResult, flights: Dict[str, Flight], out_path: Path) -> None`
- **Purpose**: Writes flight utilization and cargo assignment details to CSV
- **Columns**: flight details, assigned cargo, utilization percentages, revenue

### `write_alerts(alerts: Iterable[Alert], out_path: Path) -> None`
- **Purpose**: Writes all alerts to CSV format
- **Columns**: alert_type, severity, message, cargo_id, flight_id, status, margin_delta

### `write_json_summary(result: GAResult, flights: Dict[str, Flight], alerts: Iterable[Alert], out_path: Path) -> None`
- **Purpose**: Writes comprehensive JSON summary with statistics and utilization metrics

## ga_route.py

### `build_connection_index(rules: Iterable[ConnectionRule]) -> Dict[Tuple[str, str, Optional[str]], ConnectionRule]`
- **Purpose**: Creates efficient lookup index for connection rules
- **Returns**: Dictionary keyed by (origin, destination, connection_airport)

### `_hours_between(start: datetime, end: datetime) -> float`
- **Purpose**: Calculates hours between two datetimes

### `_minutes_between(start: datetime, end: datetime) -> float`
- **Purpose**: Calculates minutes between two datetimes

### `_build_route_option(cargo: Cargo, flights: List[Flight], connection_index: Dict[Tuple[str, str, Optional[str]], ConnectionRule]) -> Optional[RouteOption]`
- **Purpose**: Evaluates feasibility and calculates costs for a specific route
- **Calculations**:
  - Transit time validation
  - Connection time validation (flexible minimums)
  - Operating costs, handling costs, penalties
  - SLA penalties for late delivery
  - Revenue density calculations

### `_generate_routes_for_cargo(cargo: Cargo, flights_by_origin: Dict[str, List[Flight]], connection_index: Dict[Tuple[str, str, Optional[str]], ConnectionRule]) -> List[RouteOption]`
- **Purpose**: Generates all possible routes for a cargo item using DFS
- **Constraints**: Maximum 4 legs, transit time limits, connection requirements

### `_fallback_route(cargo: Cargo, reason: str) -> RouteOption`
- **Purpose**: Creates fallback route for denied cargo with penalty costs

### `build_route_catalog(cargo_map: Dict[str, Cargo], flights: Dict[str, Flight], connection_rules: Iterable[ConnectionRule]) -> Dict[str, List[RouteOption]]`
- **Purpose**: Builds complete route catalog for all cargo
- **Features**: Includes alternative routes for medium/high priority cargo

### `_prepare_candidate(state: _CargoState, flight_id: str) -> FlightCargoCandidate`
- **Purpose**: Prepares cargo candidate data for knapsack selection
- **Calculations**: Margin per leg, revenue density, priority scores

### `_simulate_solution(cargo_ids: List[str], cargo_map: Dict[str, Cargo], catalog: Dict[str, List[RouteOption]], flights: Dict[str, Flight], individual: List[int]) -> GAResult`
- **Purpose**: Simulates complete cargo assignment solution
- **Process**:
  1. Assign routes based on GA chromosome
  2. Process flights in sequence
  3. Use knapsack algorithm for cargo selection per flight
  4. Track delivery status and margins

### `_tournament_select(population: List[List[int]], fitnesses: List[float], tournament_size: int = 3) -> List[int]`
- **Purpose**: Tournament selection for GA parent selection

### `_crossover(parent1: List[int], parent2: List[int], crossover_rate: float) -> Tuple[List[int], List[int]]`
- **Purpose**: Single-point crossover for GA reproduction

### `_mutate(individual: List[int], catalog: Dict[str, List[RouteOption]], cargo_ids: List[str], mutation_rate: float) -> None`
- **Purpose**: Random mutation of GA chromosomes

### `run_ga(cargo_map: Dict[str, Cargo], flights: Dict[str, Flight], connection_rules: Iterable[ConnectionRule], population_size: int = 80, generations: int = 120, crossover_rate: float = 0.8, mutation_rate: float = 0.15, seed: Optional[int] = 42) -> GAResult`
- **Purpose**: Main GA optimization function
- **Process**:
  1. Initialize population
  2. Evaluate fitness (total margin)
  3. Evolve through generations using selection, crossover, mutation
  4. Return best solution found

## knapsack.py

### `_score_subset(subset: Sequence[FlightCargoCandidate], flight_weight_capacity: float, flight_volume_capacity: float) -> Tuple[float, int, float, float, float, float]`
- **Purpose**: Scores a subset of cargo for selection
- **Returns**: revenue_density_sum, priority_sum, avg_dwell, total_margin, utilization_score, utilization_ratio

### `select_best_cargo(flight: Flight, candidates: Iterable[FlightCargoCandidate]) -> FlightSelection`
- **Purpose**: Main knapsack algorithm for cargo selection per flight
- **Priority Logic**:
  1. Reserve capacity for ALL high/medium priority cargo
  2. Assign high priority first
  3. Assign medium priority next
  4. Fill remaining capacity with optimal low priority cargo

### `_emergency_high_medium_assignment(flight: Flight, high_priority: List[FlightCargoCandidate], medium_priority: List[FlightCargoCandidate], low_priority: List[FlightCargoCandidate]) -> FlightSelection`
- **Purpose**: Emergency assignment ensuring high/medium priority cargo are assigned even if over capacity

### `_select_optimal_low_priority(candidates: List[FlightCargoCandidate], max_weight: float, max_volume: float) -> List[FlightCargoCandidate]`
- **Purpose**: Uses combinatorial optimization to select best low-priority cargo subset

### `_intelligent_priority_allocation(flight: Flight, high_priority: List[FlightCargoCandidate], medium_priority: List[FlightCargoCandidate], low_priority: List[FlightCargoCandidate]) -> Optional[FlightSelection]`
- **Purpose**: Intelligent allocation maximizing value while respecting priorities

### `_advanced_cargo_scoring(candidate: FlightCargoCandidate, flight: Flight) -> float`
- **Purpose**: Advanced scoring considering utilization efficiency and dwell time

## ai_recommendations.py

### `generate_ai_recommendations(result: GAResult, cargo_map: Dict[str, Cargo], flights: Dict[str, Flight]) -> List[CargoRecommendation]`
- **Purpose**: Generates AI-powered recovery recommendations for denied/rolled cargo
- **Returns**: List of CargoRecommendation objects with options and recommendations

### `_generate_cargo_recommendation(cargo: Cargo, assignment: CargoAssignment, flights: Dict[str, Flight], result: GAResult) -> Optional[CargoRecommendation]`
- **Purpose**: Creates specific recommendations for individual cargo items

### `_generate_charter_option(cargo: Cargo, flights: Dict[str, Flight]) -> Optional[RecommendationOption]`
- **Purpose**: Calculates charter flight feasibility and costs

### `_generate_alternative_routing_option(cargo: Cargo, flights: Dict[str, Flight], result: GAResult) -> Optional[RecommendationOption]`
- **Purpose**: Finds alternative routing options with cost calculations

### `_generate_capacity_upgrade_option(cargo: Cargo, flights: Dict[str, Flight], result: GAResult) -> Optional[RecommendationOption]`
- **Purpose**: Evaluates aircraft capacity upgrade options

### `_generate_delay_acceptance_option(cargo: Cargo, flights: Dict[str, Flight]) -> Optional[RecommendationOption]`
- **Purpose**: Calculates delay acceptance with compensation costs

### `_generate_partial_shipment_option(cargo: Cargo, flights: Dict[str, Flight]) -> Optional[RecommendationOption]`
- **Purpose**: Evaluates partial shipment strategies

### `_generate_customer_negotiation_option(cargo: Cargo) -> Optional[RecommendationOption]`
- **Purpose**: Assesses customer negotiation potential

### `format_recommendations_for_ui(recommendations: List[CargoRecommendation]) -> Dict`
- **Purpose**: Formats recommendations for frontend consumption

## Test Files

### test_oversubscribed.py
- `test_oversubscribed_capacity()`: Analyzes cargo vs flight capacity to verify oversubscription scenarios

### test_emergency_routes.py
- `main()`: Tests GA optimization and verifies priority assignment guarantees

### test_priority.py
- `test_priority_assignment()`: Validates priority-based cargo assignment logic