// Business Knowledge Base for Revenue Management AI Assistant
// This provides user-friendly explanations instead of technical code

export interface BusinessExplanation {
  concept: string;
  simpleExplanation: string;
  businessImpact: string;
  realWorldExample: string;
  keyBenefits: string[];
  considerations: string[];
}

export const REVENUE_MANAGEMENT_KNOWLEDGE: Record<string, BusinessExplanation> = {
  charter_flight: {
    concept: "Charter Flight Solution",
    simpleExplanation: "When regular flights can't carry your cargo, we arrange a dedicated aircraft just for your shipment. Think of it like booking a private taxi instead of waiting for the bus.",
    businessImpact: "This ensures your high-value cargo reaches its destination on time, protecting your revenue and customer relationships.",
    realWorldExample: "If you have ₹10 lakh worth of electronics that must reach Mumbai by tomorrow, and regular flights are full, we charter a dedicated plane. Even after paying ₹8 lakh for the charter, you still save ₹2 lakh and keep your customer happy.",
    keyBenefits: [
      "Guaranteed delivery timeline",
      "No dependency on regular flight schedules",
      "Suitable for high-value, time-sensitive cargo",
      "Maintains customer satisfaction and trust"
    ],
    considerations: [
      "Higher cost compared to regular flights",
      "Only economical for valuable cargo",
      "Requires 24-hour advance planning",
      "Weather and regulatory approvals needed"
    ]
  },

  alternative_routing: {
    concept: "Alternative Route Planning",
    simpleExplanation: "Instead of the direct route, we find alternative flight connections to get your cargo to its destination. Like taking a connecting flight instead of a direct one.",
    businessImpact: "This maximizes the use of available flight capacity and often costs much less than other solutions.",
    realWorldExample: "Your cargo needs to go from Delhi to Chennai, but the direct flight is full. We route it Delhi → Mumbai → Chennai, adding just 4 hours but saving thousands compared to a charter flight.",
    keyBenefits: [
      "Cost-effective solution",
      "Uses existing flight capacity efficiently",
      "Quick to implement (usually within 4 hours)",
      "Low risk of complications"
    ],
    considerations: [
      "May involve slight delays",
      "Requires coordination between multiple airports",
      "Additional handling at connection points",
      "Depends on availability of connecting flights"
    ]
  },

  capacity_upgrade: {
    concept: "Aircraft Capacity Upgrade",
    simpleExplanation: "We swap the scheduled aircraft with a larger one to create more cargo space. Like upgrading from a small truck to a big truck for delivery.",
    businessImpact: "This creates additional capacity without needing extra flights, benefiting multiple customers simultaneously.",
    realWorldExample: "A flight from Bangalore to Delhi is using a smaller aircraft. We upgrade to a larger plane, creating space for 5 more tons of cargo, allowing multiple denied shipments to be accommodated.",
    keyBenefits: [
      "Creates capacity for multiple cargo items",
      "Shared cost across multiple shipments",
      "No additional flight slots needed",
      "Benefits the entire route"
    ],
    considerations: [
      "Requires aircraft availability",
      "Takes 12 hours to coordinate",
      "Affects other flight schedules",
      "Higher operational complexity"
    ]
  },

  delay_acceptance: {
    concept: "Managed Delay with Compensation",
    simpleExplanation: "We arrange for your cargo to travel on the next available flight and provide compensation for the delay. Like getting a voucher when your train is delayed.",
    businessImpact: "This maintains revenue while managing customer expectations through fair compensation.",
    realWorldExample: "Your cargo will be 8 hours late, so we offer ₹15,000 compensation (10% of cargo value). You still earn ₹1.35 lakh instead of losing the entire ₹1.5 lakh revenue.",
    keyBenefits: [
      "Maintains most of the revenue",
      "Quick to implement (2 hours)",
      "Low operational risk",
      "Transparent customer communication"
    ],
    considerations: [
      "Customer relationship impact",
      "Compensation costs",
      "May affect future business",
      "SLA penalty implications"
    ]
  },

  partial_shipment: {
    concept: "Split Shipment Strategy",
    simpleExplanation: "We divide large cargo into parts - shipping most of it immediately and the remainder on the next flight. Like sending urgent documents by express and the rest by regular mail.",
    businessImpact: "This ensures partial delivery meets critical deadlines while managing the remaining portion efficiently.",
    realWorldExample: "You have 8 tons of machinery worth ₹20 lakh. We ship 6 tons immediately and 2 tons tomorrow, ensuring 75% of your cargo reaches on time while managing the delay cost for the remainder.",
    keyBenefits: [
      "Immediate partial delivery",
      "Reduces overall delay impact",
      "Maintains customer operations partially",
      "Flexible solution for large shipments"
    ],
    considerations: [
      "Only suitable for large cargo (over 5 tons)",
      "Additional handling and documentation",
      "Coordination complexity",
      "Customer must accept split delivery"
    ]
  },

  customer_negotiation: {
    concept: "Rate Negotiation and Flexibility",
    simpleExplanation: "We work with customers to adjust rates or delivery terms in exchange for flexibility. Like negotiating a better deal when both parties can be flexible.",
    businessImpact: "This can actually increase revenue while solving capacity problems through mutual agreement.",
    realWorldExample: "Instead of losing ₹2 lakh revenue, we negotiate with the customer to increase the rate by ₹30,000 in exchange for 2-day delivery flexibility, earning ₹2.3 lakh total.",
    keyBenefits: [
      "Potential revenue increase",
      "Strengthens customer relationships",
      "Creates win-win situations",
      "Builds long-term partnerships"
    ],
    considerations: [
      "Requires strong customer relationships",
      "Success depends on negotiation skills",
      "Takes time to execute (8 hours)",
      "Not suitable for all customer types"
    ]
  }
};

export const BUSINESS_CONCEPTS = {
  revenue_recovery: {
    simple: "Revenue Recovery",
    explanation: "This is how much money we can still earn from cargo that was initially denied. It's calculated by taking the original cargo value and subtracting the costs of the alternative solution.",
    example: "If cargo is worth ₹5 lakh and costs ₹1 lakh to solve with a charter flight, the revenue recovery is ₹4 lakh."
  },

  feasibility_score: {
    simple: "Success Probability",
    explanation: "This shows how likely a solution is to work successfully, rated from 0% to 100%. Higher scores mean the solution is more reliable and easier to implement.",
    example: "A 90% feasibility score means we're very confident this solution will work. A 40% score means it's risky and might not succeed."
  },

  sla_penalty: {
    simple: "Late Delivery Penalty",
    explanation: "This is the cost we pay when cargo arrives late, usually calculated per hour of delay. It's like a fine for not meeting delivery promises.",
    example: "If the penalty is ₹1,000 per hour and cargo is 5 hours late, we pay ₹5,000 in penalties."
  },

  capacity_constraints: {
    simple: "Space Limitations",
    explanation: "This means flights don't have enough space (weight or volume) to carry all the cargo that needs to be shipped.",
    example: "A flight can carry 10 tons, but we have 15 tons of cargo wanting to go on that flight - that's a capacity constraint."
  },

  margin_efficiency: {
    simple: "Profit Optimization",
    explanation: "This measures how well we're using our flight capacity to generate profit. Higher efficiency means we're making more money from the same space.",
    example: "If we fill a flight with high-value cargo instead of low-value cargo, we achieve better margin efficiency."
  }
};

export const OPTIMIZATION_STRATEGIES = {
  revenue_maximization: {
    title: "Revenue Maximization Strategy",
    explanation: "We prioritize cargo that generates the highest revenue per unit of space used. This means choosing shipments that give us the best return on our limited flight capacity.",
    businessValue: "Maximizes total income from available flight space",
    implementation: "We use algorithms to select the best combination of cargo that fits in our flights while generating maximum revenue."
  },

  priority_based_allocation: {
    title: "Priority-Based Allocation",
    explanation: "We give preference to high-priority cargo (urgent, high-value, or important customers) when allocating limited flight space.",
    businessValue: "Maintains service levels for key customers and critical shipments",
    implementation: "Cargo is ranked by priority, and space is allocated starting from highest priority items."
  },

  cost_benefit_analysis: {
    title: "Cost-Benefit Analysis",
    explanation: "For each solution, we compare the costs involved against the benefits gained to ensure we're making financially sound decisions.",
    businessValue: "Ensures all decisions are profitable and sustainable",
    implementation: "We calculate total costs (including penalties, operational costs) against revenue recovery to choose the best option."
  }
};

export function getBusinessExplanation(concept: string): BusinessExplanation | null {
  return REVENUE_MANAGEMENT_KNOWLEDGE[concept] || null;
}

export function getSimpleConcept(technicalTerm: string): any {
  return BUSINESS_CONCEPTS[technicalTerm as keyof typeof BUSINESS_CONCEPTS] || null;
}

export function getOptimizationStrategy(strategy: string): any {
  return OPTIMIZATION_STRATEGIES[strategy as keyof typeof OPTIMIZATION_STRATEGIES] || null;
}

// Helper function to convert technical responses to business language
export function translateTechnicalToBusiness(technicalResponse: string): string {
  let businessResponse = technicalResponse;
  
  // Replace technical terms with business language
  const translations = {
    'feasibility_score': 'success probability',
    'revenue_recovery': 'money we can still earn',
    'estimated_cost': 'expected cost',
    'sla_penalty': 'late delivery penalty',
    'capacity_constraints': 'space limitations',
    'optimization': 'best choice selection',
    'algorithm': 'decision-making process',
    'implementation_time_hours': 'time needed to execute',
    'risk_level': 'level of uncertainty'
  };
  
  Object.entries(translations).forEach(([technical, business]) => {
    const regex = new RegExp(technical, 'gi');
    businessResponse = businessResponse.replace(regex, business);
  });
  
  return businessResponse;
}