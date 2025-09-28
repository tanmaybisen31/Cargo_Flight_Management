from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

try:
    from .load_data import Cargo, Flight
    from .ga_route import CargoAssignment, GAResult
except ImportError:
    from load_data import Cargo, Flight
    from ga_route import CargoAssignment, GAResult


@dataclass
class RecommendationOption:
    option_type: str
    description: str
    impact_description: str
    estimated_cost: float
    estimated_revenue_recovery: float
    feasibility_score: float  # 0-1, higher is more feasible
    implementation_time_hours: int
    risk_level: str  # "Low", "Medium", "High"
    required_actions: List[str]


@dataclass
class CargoRecommendation:
    cargo_id: str
    cargo_priority: str
    denial_reason: str
    revenue_at_risk: float
    options: List[RecommendationOption]
    recommended_option: Optional[RecommendationOption]


def generate_ai_recommendations(
    result: GAResult,
    cargo_map: Dict[str, Cargo],
    flights: Dict[str, Flight],
) -> List[CargoRecommendation]:
    """Generate AI-powered recommendations for denied and rolled cargo."""
    recommendations = []
    
    # Analyze denied and rolled cargo
    for cargo_id, assignment in result.assignments.items():
        if assignment.status in ["denied", "rolled"]:
            cargo = cargo_map[cargo_id]
            recommendation = _generate_cargo_recommendation(
                cargo, assignment, flights, result
            )
            if recommendation:
                recommendations.append(recommendation)
    
    return recommendations


def _generate_cargo_recommendation(
    cargo: Cargo,
    assignment: CargoAssignment,
    flights: Dict[str, Flight],
    result: GAResult,
) -> Optional[CargoRecommendation]:
    """Generate specific recommendations for a single cargo item."""

    denial_reason = assignment.reason or "Capacity constraints"

    options = []

    # Option 1: Charter Flight
    if cargo.priority in ["High", "Medium"] and cargo.revenue_inr > 500000:
        charter_option = _generate_charter_option(cargo, flights)
        if charter_option:
            options.append(charter_option)

    # Option 2: Alternative Routing
    alt_routing_option = _generate_alternative_routing_option(cargo, flights, result)
    if alt_routing_option:
        options.append(alt_routing_option)

    # Option 3: Capacity Upgrade
    if cargo.priority == "High":
        capacity_option = _generate_capacity_upgrade_option(cargo, flights, result)
        if capacity_option:
            options.append(capacity_option)

    # Option 4: Delay Acceptance
    delay_option = _generate_delay_acceptance_option(cargo, flights)
    if delay_option:
        options.append(delay_option)

    # Option 5: Partial Shipment
    if cargo.weight_kg > 5000 or cargo.volume_m3 > 25:
        partial_option = _generate_partial_shipment_option(cargo, flights)
        if partial_option:
            options.append(partial_option)

    # Option 6: Customer Negotiation
    negotiation_option = _generate_customer_negotiation_option(cargo, denial_reason)
    if negotiation_option:
        options.append(negotiation_option)
    
    if not options:
        return None
    
    # Select recommended option based on feasibility and impact
    recommended = max(options, key=lambda x: x.feasibility_score * x.estimated_revenue_recovery)
    
    return CargoRecommendation(
        cargo_id=cargo.cargo_id,
        cargo_priority=cargo.priority,
        denial_reason=denial_reason,
        revenue_at_risk=cargo.revenue_inr,
        options=sorted(options, key=lambda x: x.feasibility_score, reverse=True),
        recommended_option=recommended,
    )


def _generate_charter_option(cargo: Cargo, flights: Dict[str, Flight]) -> Optional[RecommendationOption]:
    """Generate charter flight recommendation."""
    # Estimate charter cost based on cargo size and route
    base_charter_cost = 800000  # Base cost for charter
    weight_factor = cargo.weight_kg / 1000 * 15000  # Cost per ton
    volume_factor = cargo.volume_m3 * 8000  # Cost per cubic meter
    
    estimated_cost = base_charter_cost + weight_factor + volume_factor
    
    # Revenue recovery would be full revenue minus charter cost
    revenue_recovery = max(0, cargo.revenue_inr - estimated_cost)
    
    # Feasibility depends on revenue vs cost ratio
    feasibility = min(1.0, revenue_recovery / estimated_cost) if estimated_cost > 0 else 0
    
    if feasibility < 0.1:  # Not feasible if recovery is too low
        return None
    
    return RecommendationOption(
        option_type="charter_flight",
        description=f"Charter dedicated flight for {cargo.cargo_id}",
        impact_description=f"Guaranteed delivery with estimated net recovery of ₹{revenue_recovery:,.0f}",
        estimated_cost=estimated_cost,
        estimated_revenue_recovery=revenue_recovery,
        feasibility_score=feasibility,
        implementation_time_hours=24,
        risk_level="Medium",
        required_actions=[
            "Contact charter flight operators",
            "Negotiate charter rates",
            "Arrange ground handling",
            "Update customer on delivery timeline",
            "Process charter flight documentation"
        ]
    )


def _generate_alternative_routing_option(
    cargo: Cargo, flights: Dict[str, Flight], result: GAResult
) -> Optional[RecommendationOption]:
    """Generate alternative routing recommendation."""
    
    # Analyze available flights for alternative routes
    available_flights = []
    for flight in flights.values():
        if flight.departure_time >= cargo.ready_time:
            # Check if flight has available capacity
            flight_load = result.flight_loads.get(flight.flight_id)
            if flight_load:
                used_weight = sum(c.weight_kg for c in flight_load.selected)
                used_volume = sum(c.volume_m3 for c in flight_load.selected)
                weight_available = flight.weight_capacity_kg - used_weight
                volume_available = flight.volume_capacity_m3 - used_volume
            else:
                weight_available = flight.weight_capacity_kg
                volume_available = flight.volume_capacity_m3
            
            if weight_available >= cargo.weight_kg and volume_available >= cargo.volume_m3:
                available_flights.append(flight)
    
    if not available_flights:
        return None
    
    # Estimate additional costs for alternative routing
    additional_cost = cargo.weight_kg * 5  # Additional handling cost
    delay_penalty = 0
    
    # Check if alternative routing would cause delays
    earliest_arrival = min(f.arrival_time for f in available_flights if f.destination == cargo.destination)
    if earliest_arrival > cargo.due_by:
        delay_hours = (earliest_arrival - cargo.due_by).total_seconds() / 3600
        delay_penalty = delay_hours * cargo.sla_penalty_per_hour
    
    total_cost = additional_cost + delay_penalty
    revenue_recovery = cargo.revenue_inr - total_cost
    feasibility = 0.8 if len(available_flights) > 2 else 0.6
    
    return RecommendationOption(
        option_type="alternative_routing",
        description=f"Route via alternative flights with {len(available_flights)} options available",
        impact_description=f"Potential delivery with ₹{revenue_recovery:,.0f} net recovery",
        estimated_cost=total_cost,
        estimated_revenue_recovery=revenue_recovery,
        feasibility_score=feasibility,
        implementation_time_hours=4,
        risk_level="Low",
        required_actions=[
            "Analyze alternative flight connections",
            "Coordinate with ground handling teams",
            "Update cargo routing in system",
            "Notify customer of revised timeline"
        ]
    )


def _generate_capacity_upgrade_option(
    cargo: Cargo, flights: Dict[str, Flight], result: GAResult
) -> Optional[RecommendationOption]:
    """Generate aircraft capacity upgrade recommendation."""
    
    # Find flights that could be upgraded
    upgrade_candidates = []
    for flight_id, flight in flights.items():
        if flight.origin == cargo.origin or flight.destination == cargo.destination:
            # Check if aircraft swap would help
            additional_weight = flight.aircraft_swap_capacity_kg - flight.weight_capacity_kg
            additional_volume = flight.aircraft_swap_volume_m3 - flight.volume_capacity_m3
            
            if additional_weight >= cargo.weight_kg and additional_volume >= cargo.volume_m3:
                upgrade_candidates.append(flight)
    
    if not upgrade_candidates:
        return None
    
    # Estimate upgrade costs
    upgrade_cost = 150000  # Base aircraft swap cost
    operational_cost = cargo.weight_kg * 8  # Additional operational cost
    
    total_cost = upgrade_cost + operational_cost
    revenue_recovery = cargo.revenue_inr - total_cost
    feasibility = 0.7  # Moderate feasibility due to operational complexity
    
    return RecommendationOption(
        option_type="capacity_upgrade",
        description=f"Upgrade aircraft capacity on {len(upgrade_candidates)} potential flights",
        impact_description=f"Create additional capacity with ₹{revenue_recovery:,.0f} net recovery",
        estimated_cost=total_cost,
        estimated_revenue_recovery=revenue_recovery,
        feasibility_score=feasibility,
        implementation_time_hours=12,
        risk_level="Medium",
        required_actions=[
            "Coordinate with fleet management",
            "Arrange aircraft swap",
            "Update flight capacity in system",
            "Reschedule affected cargo",
            "Notify operations team"
        ]
    )


def _generate_delay_acceptance_option(cargo: Cargo, flights: Dict[str, Flight]) -> Optional[RecommendationOption]:
    """Generate delay acceptance recommendation."""
    
    # Find next available flights after due date
    future_flights = [
        f for f in flights.values() 
        if f.departure_time > cargo.due_by and 
        (f.origin == cargo.origin or f.destination == cargo.destination)
    ]
    
    if not future_flights:
        return None
    
    # Calculate delay penalty
    next_flight = min(future_flights, key=lambda f: f.departure_time)
    delay_hours = (next_flight.departure_time - cargo.due_by).total_seconds() / 3600
    delay_penalty = delay_hours * cargo.sla_penalty_per_hour
    
    # Estimate customer compensation
    customer_compensation = min(cargo.revenue_inr * 0.1, 50000)  # Max 10% or ₹50k
    
    total_cost = delay_penalty + customer_compensation
    revenue_recovery = cargo.revenue_inr - total_cost
    feasibility = 0.9  # High feasibility as it's just a delay
    
    return RecommendationOption(
        option_type="delay_acceptance",
        description=f"Accept {delay_hours:.1f} hour delay with customer compensation",
        impact_description=f"Deliver with delay, net recovery ₹{revenue_recovery:,.0f}",
        estimated_cost=total_cost,
        estimated_revenue_recovery=revenue_recovery,
        feasibility_score=feasibility,
        implementation_time_hours=2,
        risk_level="Low",
        required_actions=[
            "Negotiate delay terms with customer",
            "Arrange compensation agreement",
            "Schedule on next available flight",
            "Update delivery timeline",
            "Document delay reason"
        ]
    )


def _generate_partial_shipment_option(cargo: Cargo, flights: Dict[str, Flight]) -> Optional[RecommendationOption]:
    """Generate partial shipment recommendation."""
    
    # Only applicable for large cargo
    if cargo.weight_kg < 5000 and cargo.volume_m3 < 25:
        return None
    
    # Assume we can ship 60-80% immediately
    partial_percentage = random.uniform(0.6, 0.8)
    immediate_revenue = cargo.revenue_inr * partial_percentage
    
    # Remaining portion ships later with delay penalty
    remaining_percentage = 1 - partial_percentage
    delay_hours = 24  # Assume 24 hour delay for remaining
    delay_penalty = delay_hours * cargo.sla_penalty_per_hour * remaining_percentage
    
    # Additional handling costs for split shipment
    split_cost = cargo.weight_kg * 3  # Additional handling
    
    total_cost = delay_penalty + split_cost
    revenue_recovery = cargo.revenue_inr - total_cost
    feasibility = 0.75  # Good feasibility for large cargo
    
    return RecommendationOption(
        option_type="partial_shipment",
        description=f"Ship {partial_percentage*100:.0f}% immediately, remainder with delay",
        impact_description=f"Partial immediate delivery, net recovery ₹{revenue_recovery:,.0f}",
        estimated_cost=total_cost,
        estimated_revenue_recovery=revenue_recovery,
        feasibility_score=feasibility,
        implementation_time_hours=6,
        risk_level="Low",
        required_actions=[
            "Coordinate cargo splitting",
            "Arrange immediate shipment for partial cargo",
            "Schedule remaining cargo on next flight",
            "Update customer on partial delivery",
            "Manage split documentation"
        ]
    )


def _generate_customer_negotiation_option(cargo: Cargo, denial_reason: str) -> Optional[RecommendationOption]:
    """Generate customer negotiation recommendation."""

    # Don't recommend negotiation if denial was due to our capacity constraints
    if denial_reason and ("capacity" in denial_reason.lower() or "roll-over" in denial_reason.lower()):
        return None

    # Estimate potential outcomes
    rate_increase_potential = min(cargo.revenue_inr * 0.15, 100000)  # Max 15% or ₹100k
    flexibility_bonus = 25000  # Bonus for flexible timing
    
    # Negotiation costs
    negotiation_cost = 5000  # Staff time and effort
    
    revenue_recovery = cargo.revenue_inr + rate_increase_potential + flexibility_bonus - negotiation_cost
    feasibility = 0.6 if cargo.priority in ["High", "Medium"] else 0.4
    
    return RecommendationOption(
        option_type="customer_negotiation",
        description="Negotiate rate increase and delivery flexibility with customer",
        impact_description=f"Potential revenue increase to ₹{revenue_recovery:,.0f}",
        estimated_cost=negotiation_cost,
        estimated_revenue_recovery=revenue_recovery,
        feasibility_score=feasibility,
        implementation_time_hours=8,
        risk_level="Medium",
        required_actions=[
            "Contact customer relationship manager",
            "Prepare negotiation proposal",
            "Schedule customer meeting",
            "Present alternative delivery options",
            "Finalize revised agreement"
        ]
    )


def format_recommendations_for_ui(recommendations: List[CargoRecommendation]) -> Dict:
    """Format recommendations for frontend consumption."""
    
    formatted = {
        "summary": {
            "total_cargo_at_risk": len(recommendations),
            "total_revenue_at_risk": sum(r.revenue_at_risk for r in recommendations),
            "high_priority_count": sum(1 for r in recommendations if r.cargo_priority == "High"),
            "medium_priority_count": sum(1 for r in recommendations if r.cargo_priority == "Medium"),
            "low_priority_count": sum(1 for r in recommendations if r.cargo_priority == "Low"),
        },
        "recommendations": []
    }
    
    for rec in recommendations:
        formatted_rec = {
            "cargo_id": rec.cargo_id,
            "priority": rec.cargo_priority,
            "denial_reason": rec.denial_reason,
            "revenue_at_risk": rec.revenue_at_risk,
            "recommended_option": {
                "type": rec.recommended_option.option_type,
                "description": rec.recommended_option.description,
                "impact": rec.recommended_option.impact_description,
                "cost": rec.recommended_option.estimated_cost,
                "recovery": rec.recommended_option.estimated_revenue_recovery,
                "feasibility": rec.recommended_option.feasibility_score,
                "time_hours": rec.recommended_option.implementation_time_hours,
                "risk": rec.recommended_option.risk_level,
                "actions": rec.recommended_option.required_actions
            } if rec.recommended_option else None,
            "all_options": [
                {
                    "type": opt.option_type,
                    "description": opt.description,
                    "impact": opt.impact_description,
                    "cost": opt.estimated_cost,
                    "recovery": opt.estimated_revenue_recovery,
                    "feasibility": opt.feasibility_score,
                    "time_hours": opt.implementation_time_hours,
                    "risk": opt.risk_level,
                    "actions": opt.required_actions
                }
                for opt in rec.options
            ]
        }
        formatted["recommendations"].append(formatted_rec)
    
    return formatted