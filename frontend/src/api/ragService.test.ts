import { getRAGContext } from './ragService';
import type { RecommendationOption } from './types';

// Test data for different option types
const testOptions: RecommendationOption[] = [
  {
    type: 'charter_flight',
    description: 'Charter dedicated flight for cargo',
    impact: 'Guaranteed delivery with estimated net recovery',
    cost: 850000,
    recovery: 150000,
    feasibility: 0.18,
    time_hours: 24,
    risk: 'Medium',
    actions: ['Contact charter operators', 'Negotiate rates']
  },
  {
    type: 'alternative_routing',
    description: 'Route via alternative flights',
    impact: 'Potential delivery with recovery',
    cost: 25000,
    recovery: 475000,
    feasibility: 0.8,
    time_hours: 4,
    risk: 'Low',
    actions: ['Analyze alternative routes', 'Coordinate handling']
  },
  {
    type: 'capacity_upgrade',
    description: 'Upgrade aircraft capacity',
    impact: 'Create additional capacity',
    cost: 175000,
    recovery: 325000,
    feasibility: 0.7,
    time_hours: 12,
    risk: 'Medium',
    actions: ['Coordinate with fleet', 'Arrange swap']
  }
];

console.log('Testing RAG Service...\n');

testOptions.forEach((option, index) => {
  console.log(`=== Test ${index + 1}: ${option.type} ===`);
  const context = getRAGContext(option);

  console.log('Calculation Snippets:');
  context.calculation_snippets.forEach((snippet, i) => {
    console.log(`  ${i + 1}. ${snippet.substring(0, 100)}...`);
  });

  console.log('\nFeasibility Explanation:');
  console.log(context.feasibility_explanation);

  console.log('\nCost Breakdown:');
  console.log(context.cost_breakdown);

  console.log('\nImplementation Details:');
  console.log(context.implementation_details);

  console.log('\n' + '='.repeat(50) + '\n');
});

console.log('RAG Service test completed successfully!');