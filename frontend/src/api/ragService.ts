import type { RecommendationOption } from "./types";
import {
  getBusinessExplanation,
  getSimpleConcept,
  translateTechnicalToBusiness,
  REVENUE_MANAGEMENT_KNOWLEDGE,
  BUSINESS_CONCEPTS,
  OPTIMIZATION_STRATEGIES
} from "./businessKnowledgeBase";

// Business-friendly explanations for each recommendation option type
const BUSINESS_EXPLANATIONS = {
  charter_flight: {
    how_it_works: "When regular flights can't accommodate your cargo, we arrange a dedicated aircraft exclusively for your shipment. This is like hiring a private taxi when public transport is full.",
    cost_breakdown: "Charter costs include: Base charter fee (₹8,00,000), plus weight charges (₹15 per kg), plus volume charges (₹8,000 per cubic meter). For example, 2 tons of cargo taking 10 cubic meters would cost ₹8,00,000 + ₹30,000 + ₹80,000 = ₹9,10,000 total.",
    when_recommended: "We suggest charter flights for high-value cargo (worth over ₹5 lakh) with high or medium priority when regular flights are completely full.",
    success_factors: "Success depends on whether the cargo value exceeds charter costs by at least 10%. If your cargo is worth ₹15 lakh and charter costs ₹9 lakh, you still recover ₹6 lakh revenue.",
    business_impact: "Guarantees delivery timeline, protects customer relationships, and maintains revenue flow for critical shipments."
  },
  alternative_routing: {
    how_it_works: "Instead of the direct route, we find connecting flights to reach your destination. Like taking a train with one change instead of a direct train when it's full.",
    cost_breakdown: "Costs include additional handling fees (₹5 per kg) and potential delay penalties if arrival is late. For 1 ton cargo, handling costs ₹5,000. If delayed by 4 hours with ₹500/hour penalty, total cost is ₹5,000 + ₹2,000 = ₹7,000.",
    when_recommended: "Best when multiple alternative flights are available (success rate 80% with 3+ options, 60% with fewer options). Quick to implement within 4 hours.",
    success_factors: "Success depends on finding flights with available space on your timeline. We check weight and volume capacity on each potential flight.",
    business_impact: "Cost-effective solution that uses existing flight network efficiently while minimizing delays and additional costs."
  },
  capacity_upgrade: {
    how_it_works: "We replace the scheduled aircraft with a larger one to create more cargo space. Like upgrading from a small delivery truck to a large truck to carry more packages.",
    cost_breakdown: "Includes aircraft swap fee (₹1,50,000) plus operational costs (₹8 per kg). For 2 tons cargo: ₹1,50,000 + ₹16,000 = ₹1,66,000 total cost.",
    when_recommended: "Suitable for high-priority cargo when larger aircraft are available on the route. Takes about 12 hours to coordinate but benefits multiple customers.",
    success_factors: "Success rate is 70% due to operational complexity. Requires larger aircraft availability and coordination with flight operations team.",
    business_impact: "Creates additional capacity for multiple shipments, sharing costs across customers and maximizing route efficiency."
  },
  delay_acceptance: {
    how_it_works: "We schedule your cargo on the next available flight and provide compensation for the delay. Like getting a discount voucher when your flight is delayed.",
    cost_breakdown: "Includes delay penalties (per hour rate × delay hours) plus customer compensation (up to 10% of cargo value or ₹50,000 maximum). For 8-hour delay with ₹1,000/hour penalty on ₹2 lakh cargo: ₹8,000 + ₹20,000 = ₹28,000 total cost.",
    when_recommended: "Highly feasible option (90% success rate) when next flights have available capacity. Quick to implement within 2 hours.",
    success_factors: "Almost always successful as it only requires rescheduling. We find the earliest available flight after the original deadline.",
    business_impact: "Maintains most revenue while managing customer expectations through fair compensation and transparent communication."
  },
  partial_shipment: {
    how_it_works: "We split large cargo shipments, sending 60-80% immediately and the remainder on the next flight. Like sending urgent documents by express mail and the rest by regular post.",
    cost_breakdown: "Includes delay penalties for the remaining portion (24 hours × penalty rate × remaining percentage) plus additional handling costs (₹3 per kg). For 8 tons with ₹500/hour penalty: (24 × ₹500 × 25%) + (8000 × ₹3) = ₹3,000 + ₹24,000 = ₹27,000.",
    when_recommended: "Only for large cargo (over 5 tons or 25 cubic meters) with 75% success rate. Ensures critical portions reach on time.",
    success_factors: "Success depends on cargo being divisible and customer accepting split delivery. Requires coordination between warehouse and multiple flights.",
    business_impact: "Enables partial on-time delivery, reducing overall delay impact while managing remaining portion efficiently."
  },
  customer_negotiation: {
    how_it_works: "We work with customers to adjust rates or delivery terms for mutual benefit. Like negotiating a better deal when both parties can be flexible.",
    cost_breakdown: "Minimal costs include staff time (₹5,000). Potential gains include rate increases (up to 15% or ₹1,00,000 maximum) plus flexibility bonus (₹25,000). For ₹3 lakh cargo: potential gain of ₹45,000 + ₹25,000 - ₹5,000 = ₹65,000 extra revenue.",
    when_recommended: "Success rate is 60% for high/medium priority cargo, 40% for low priority. Takes about 8 hours to execute but can increase total revenue.",
    success_factors: "Success depends on customer relationship strength, cargo value, and negotiation skills. Works best with long-term customers.",
    business_impact: "Can actually increase revenue while solving capacity problems, strengthening customer relationships and creating win-win situations."
  }
};

export interface RAGContext {
  calculation_snippets: string[];
  feasibility_explanation: string;
  cost_breakdown: string;
  implementation_details: string;
}

export function getRAGContext(option: RecommendationOption): RAGContext {
  const businessExplanation = getBusinessExplanation(option.type);
  const explanations = BUSINESS_EXPLANATIONS[option.type as keyof typeof BUSINESS_EXPLANATIONS];

  if (!businessExplanation || !explanations) {
    return {
      calculation_snippets: [],
      feasibility_explanation: "Business explanation not available for this option type.",
      cost_breakdown: "Cost breakdown not available for this option type.",
      implementation_details: "Implementation details not available for this option type."
    };
  }

  const calculation_snippets = [
    `How it works: ${explanations.how_it_works}`,
    `Cost breakdown: ${explanations.cost_breakdown}`,
    `When recommended: ${explanations.when_recommended}`,
    `Success factors: ${explanations.success_factors}`,
    `Business impact: ${explanations.business_impact}`
  ];

  const feasibility_explanation = generateBusinessFeasibilityExplanation(option.type, businessExplanation);
  const cost_breakdown = generateBusinessCostBreakdown(option.type, businessExplanation);
  const implementation_details = generateBusinessImplementationDetails(option.type, businessExplanation);

  return {
    calculation_snippets,
    feasibility_explanation,
    cost_breakdown,
    implementation_details
  };
}

function generateBusinessFeasibilityExplanation(optionType: string, businessExplanation: any): string {
  const explanations = BUSINESS_EXPLANATIONS[optionType as keyof typeof BUSINESS_EXPLANATIONS];
  if (!explanations) return "Business explanation not available.";

  return `${businessExplanation.simpleExplanation} ${explanations.success_factors} This solution is recommended because: ${businessExplanation.businessImpact}`;
}

function generateBusinessCostBreakdown(optionType: string, businessExplanation: any): string {
  const explanations = BUSINESS_EXPLANATIONS[optionType as keyof typeof BUSINESS_EXPLANATIONS];
  if (!explanations) return "Cost breakdown not available.";

  return explanations.cost_breakdown;
}

function generateBusinessImplementationDetails(optionType: string, businessExplanation: any): string {
  if (!businessExplanation.keyBenefits || !businessExplanation.considerations) {
    return "Implementation details not available.";
  }

  const benefits = businessExplanation.keyBenefits.map((benefit: string) => `✓ ${benefit}`).join('\n');
  const considerations = businessExplanation.considerations.map((consideration: string) => `⚠ ${consideration}`).join('\n');

  return `Key Benefits:\n${benefits}\n\nImportant Considerations:\n${considerations}\n\nReal-world example: ${businessExplanation.realWorldExample}`;
}