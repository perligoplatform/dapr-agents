/**
 * Dapr Agents TypeScript
 * 
 * A TypeScript implementation of the Dapr Agents framework for building
 * production-grade resilient AI agent systems.
 */

// Core types
export * from './types/index.js';

// Base classes and interfaces
export * from './base/index.js';

// Document processing system
export * from './document/index.js';

// Version info
export const version = '0.1.0';

console.log('Dapr Agents TypeScript v' + version);