/**
 * Performance benchmarks for the HTML formatter
 * 
 * Run with: NODE_ENV=test node --require ts-node/register src/utils/formatters/__tests__/html-formatter.benchmark.ts
 */

import { formatHtmlOrXml, fallbackFormatter } from '../html-formatter';

// Simple performance measurement utility
const measurePerformance = async (fn: () => Promise<any> | any, iterations: number = 1) => {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  return {
    totalTime,
    avgTime,
    iterations
  };
};

// Generate HTML of various sizes for testing
const generateHtml = (depth: number, elementsPerLevel: number): string => {
  if (depth <= 0) {
    return '<div>Content</div>';
  }
  
  let html = '<div>';
  for (let i = 0; i < elementsPerLevel; i++) {
    html += generateHtml(depth - 1, elementsPerLevel);
  }
  html += '</div>';
  
  return html;
};

// Run the benchmarks
const runBenchmarks = async () => {
  console.log('🚀 Starting HTML formatter benchmarks');
  console.log('====================================');
  
  // Test with different sizes of HTML
  const sizes = [
    { name: 'Small', html: generateHtml(2, 3) },     // ~27 elements
    { name: 'Medium', html: generateHtml(3, 3) },    // ~81 elements
    { name: 'Large', html: generateHtml(4, 2) },     // ~128 elements
    { name: 'XLarge', html: generateHtml(5, 2) }     // ~256 elements
  ];
  
  for (const { name, html } of sizes) {
    console.log(`\n📊 Testing with ${name} HTML (${html.length} bytes)`);
    
    // Benchmark wasm-fmt formatter
    try {
      console.log('\n🧪 Testing wasm-fmt formatter...');
      const wasmFmtResults = await measurePerformance(async () => {
        await formatHtmlOrXml(html, true);
      }, 5);
      
      console.log(`   Total time: ${wasmFmtResults.totalTime.toFixed(2)}ms`);
      console.log(`   Average time per iteration: ${wasmFmtResults.avgTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('   Error measuring wasm-fmt formatter:', error);
    }
    
    // Benchmark fallback formatter
    try {
      console.log('\n🧪 Testing fallback formatter...');
      const fallbackResults = await measurePerformance(() => {
        fallbackFormatter(html);
      }, 5);
      
      console.log(`   Total time: ${fallbackResults.totalTime.toFixed(2)}ms`);
      console.log(`   Average time per iteration: ${fallbackResults.avgTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('   Error measuring fallback formatter:', error);
    }
  }
  
  console.log('\n====================================');
  console.log('🎉 Benchmark complete');
};

// If this file is run directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

export { runBenchmarks, measurePerformance, generateHtml }; 