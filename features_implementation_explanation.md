# Features Implementation Explanation

This document explains how the key features are implemented in the Revenue Management system, including assignments, GA (Genetic Algorithm), knapsack algorithm, AI recommendations, and RAG (Retrieval-Augmented Generation).

## Table of Contents
1. [Cargo Assignments](#cargo-assignments)
2. [Genetic Algorithm (GA) Implementation](#genetic-algorithm-ga-implementation)
3. [Knapsack Algorithm](#knapsack-algorithm)
4. [AI Recommendations System](#ai-recommendations-system)
5. [RAG (Retrieval-Augmented Generation) Implementation](#rag-retrieval-augmented-generation-implementation)

## Cargo Assignments

### Overview
The cargo assignment system determines which cargo gets assigned to which flights, optimizing for maximum revenue while respecting capacity constraints and priority requirements.

### Implementation Files
- `ga_route.py`: Route generation and GA optimization
- `knapsack.py`: Flight-level cargo selection
- `pipeline.py`: Orchestration of the assignment process

### Process Flow

1. **Route Generation** (`ga_route.py`)
   - `build_route_catalog()`: Generates all possible routes for each cargo item
   - Uses DFS (Depth-First Search) to explore flight connections
   - Considers connection rules, transit time limits, and SLA constraints
   - Creates `RouteOption` objects with cost calculations

2. **GA Optimization** (`ga_route.py`)
   - `run_ga()`: Main GA function with population_size=80, generations=120
   - Each chromosome represents route choices for all cargo
   - Fitness function = total margin (revenue - costs - penalties)
   - Uses tournament selection, crossover, and mutation

3. **Flight-Level Assignment** (`knapsack.py`)
   - `select_best_cargo()`: Assigns cargo to specific flights
   - Priority-based allocation: High → Medium → Low priority
   - Uses combinatorial optimization for remaining capacity

### Key Features
- **Priority Guarantee**: High and Medium priority cargo are never denied
- **Capacity Reservation**: Reserves space for priority cargo first
- **Emergency Assignment**: Forces assignment of critical cargo even if over capacity
- **Margin Optimization**: Maximizes total revenue minus costs and penalties

## Genetic Algorithm (GA) Implementation

### Overview
The GA optimizes cargo-to-route assignments across the entire network to maximize total margin.

### Core Components

#### 1. Route Catalog Generation
```python
def build_route_catalog(cargo_map, flights, connection_rules):
    # Generates all feasible routes for each cargo
    # Includes alternative routes for priority cargo
    # Returns Dict[str, List[RouteOption]]
```

#### 2. GA Parameters
- **Population Size**: 80 individuals
- **Generations**: 120 iterations
- **Crossover Rate**: 0.8 (80% chance)
- **Mutation Rate**: 0.15 (15% chance per gene)

#### 3. Chromosome Structure
- Each gene represents route choice for one cargo (integer index)
- Length = number of cargo items
- Example: [2, 0, 1, 3] means cargo 0 uses route 2, cargo 1 uses route 0, etc.

#### 4. Fitness Evaluation
```python
def _simulate_solution(...):
    # Simulates complete assignment process
    # Returns GAResult with total_margin as fitness
```

### GA Process

1. **Initialization**: Random population of route assignments
2. **Evaluation**: Simulate each solution to calculate total margin
3. **Selection**: Tournament selection (size 3)
4. **Crossover**: Single-point crossover with 80% probability
5. **Mutation**: Random route changes with 15% probability per cargo
6. **Elitism**: Best individual always survives to next generation

### Advanced Features
- **Alternative Routes**: Generates relaxed constraint routes for priority cargo
- **Emergency Routing**: Creates guaranteed routes for high-priority cargo
- **Connection Flexibility**: Handles multi-leg routes with varying connection times

## Knapsack Algorithm

### Overview
The knapsack algorithm selects the optimal subset of cargo for each individual flight, respecting weight and volume constraints.

### Implementation Details

#### Priority-Based Selection Logic
```python
def select_best_cargo(flight, candidates):
    # Phase 1: Reserve capacity for ALL high/medium priority
    # Phase 2: Assign high priority cargo
    # Phase 3: Assign medium priority cargo
    # Phase 4: Fill remaining capacity with optimal low priority
```

#### Capacity Reservation Strategy
- **High Priority**: 100% assignment guarantee
- **Medium Priority**: 100% assignment guarantee
- **Low Priority**: Optimized selection based on revenue density

#### Emergency Assignment
```python
def _emergency_high_medium_assignment(...):
    # Forces assignment of priority cargo
    # May exceed nominal capacity limits
    # Rejects low-priority cargo to make room
```

#### Optimization Scoring
```python
def _score_subset(subset, weight_capacity, volume_capacity):
    # Calculates multiple scoring factors:
    # - Revenue density sum
    # - Priority sum
    # - Utilization efficiency (60-90% target)
    # - Average dwell time penalty
```

### Key Features
- **Intelligent Reallocation**: Tries to optimize before emergency measures
- **Utilization Optimization**: Prefers solutions using 60-90% of capacity
- **Revenue Density**: Prioritizes high-value cargo per unit space
- **Dwell Time Consideration**: Penalizes cargo with long connection times

## AI Recommendations System

### Overview
The AI recommendations system generates recovery options for cargo that couldn't be assigned to regular flights.

### Implementation Files
- `ai_recommendations.py`: Core recommendation logic
- `pipeline.py`: Integration with main pipeline
- Frontend components for UI display

### Recommendation Types

#### 1. Charter Flight
```python
def _generate_charter_option(cargo, flights):
    # Calculates dedicated aircraft costs
    # Base cost: ₹8,00,000
    # Weight factor: ₹15/kg
    # Volume factor: ₹8,000/m³
    # Feasibility: Revenue recovery ratio > 10%
```

#### 2. Alternative Routing
```python
def _generate_alternative_routing_option(cargo, flights, result):
    # Finds alternative flight combinations
    # Analyzes available capacity on other routes
    # Calculates additional handling costs (₹5/kg)
    # Estimates delay penalties
```

#### 3. Capacity Upgrade
```python
def _generate_capacity_upgrade_option(cargo, flights, result):
    # Identifies flights that could be upgraded
    # Aircraft swap cost: ₹1,50,000
    # Additional operational costs: ₹8/kg
    # Feasibility: 70% (due to operational complexity)
```

#### 4. Delay Acceptance
```python
def _generate_delay_acceptance_option(cargo, flights):
    # Calculates compensation for delayed delivery
    # Delay penalty: SLA rate × hours delayed
    # Customer compensation: 10% of revenue or ₹50k max
    # Feasibility: 90% (highly reliable)
```

#### 5. Partial Shipment
```python
def _generate_partial_shipment_option(cargo, flights):
    # Splits large cargo into immediate + delayed portions
    # Immediate portion: 60-80% of total
    # Delay penalty for remainder portion
    # Additional handling: ₹3/kg
```

#### 6. Customer Negotiation
```python
def _generate_customer_negotiation_option(cargo):
    # Estimates rate increase potential (up to 15% or ₹1,00,000)
    # Adds flexibility bonus (₹25,000)
    # Negotiation cost: ₹5,000
    # Feasibility: 60% for high/medium priority
```

### Recommendation Selection
```python
# Selects best option based on feasibility × revenue recovery
recommended = max(options, key=lambda x: x.feasibility_score * x.estimated_revenue_recovery)
```

## RAG (Retrieval-Augmented Generation) Implementation

### Overview
The RAG system provides AI-powered explanations of recommendation options using business context and technical details.

### Architecture

#### 1. Business Knowledge Base (`businessKnowledgeBase.ts`)
Contains user-friendly explanations for each recommendation type:

```typescript
export const REVENUE_MANAGEMENT_KNOWLEDGE = {
  charter_flight: {
    concept: "Charter Flight Solution",
    simpleExplanation: "When regular flights can't carry your cargo, we arrange a dedicated aircraft just for your shipment.",
    businessImpact: "This ensures your high-value cargo reaches its destination on time, protecting your revenue and customer relationships.",
    realWorldExample: "If you have ₹10 lakh worth of electronics that must reach Mumbai by tomorrow...",
    keyBenefits: [...],
    considerations: [...]
  }
}
```

#### 2. RAG Service (`ragService.ts`)
Combines technical calculation details with business explanations:

```typescript
export function getRAGContext(option: RecommendationOption): RAGContext {
  const businessExplanation = getBusinessExplanation(option.type);
  const explanations = BUSINESS_EXPLANATIONS[option.type];

  return {
    calculation_snippets: [...], // Technical code snippets
    feasibility_explanation: generateBusinessFeasibilityExplanation(...),
    cost_breakdown: generateBusinessCostBreakdown(...),
    implementation_details: generateBusinessImplementationDetails(...)
  };
}
```

#### 3. AI Assistant Component (`OptionAIAssistant.tsx`)
Provides interactive chat interface using Groq API:

```typescript
const generateContextualPrompt = (userMessage: string) => {
  // Combines option details, RAG context, and user question
  // Sends to Groq API for intelligent responses
  return `You are an AI assistant specialized in explaining revenue recovery options...`;
};
```

### RAG Process Flow

1. **Context Retrieval**: Extracts relevant business explanations and technical details
2. **Prompt Engineering**: Creates comprehensive context for AI model
3. **API Integration**: Uses Groq API (llama-3.1-8b-instant) for responses
4. **Response Formatting**: Provides technical accuracy with business-friendly language

### Key Features
- **Technical Accuracy**: References actual backend calculation formulas
- **Business Context**: Translates technical terms to business language
- **Interactive Learning**: Allows users to ask specific questions
- **Calculation Transparency**: Shows exact cost components and formulas

### Example RAG Context for Charter Flight
```
CALCULATION CONTEXT:
- Base charter cost: ₹8,00,000
- Weight charges: ₹15 per kg
- Volume charges: ₹8,000 per cubic meter
- Feasibility threshold: Revenue recovery > 10%

BUSINESS EXPLANATION:
- Simple explanation: "Like booking a private taxi when public transport is full"
- Real-world example with ₹10 lakh cargo scenario
- Key benefits and considerations
```

This RAG implementation bridges the gap between complex technical algorithms and business decision-making, enabling revenue managers to understand and act on AI recommendations effectively.