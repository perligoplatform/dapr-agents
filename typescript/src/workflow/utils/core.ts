/**
 * Core utility functions for workflow system validation and introspection.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/core.py
 * 
 * Provides utility functions for:
 * - Type checking for supported models (Zod schemas, plain objects)
 * - Method discovery and decoration introspection
 * - Model validation and routing support
 */

import { z } from 'zod';

/**
 * Check if the given type is a Zod schema.
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/core.py:10-12 (is_pydantic_model)
 * 
 * @param obj - The object to check
 * @returns True if the object is a Zod schema
 */
export function isZodSchema(obj: any): obj is z.ZodType<any> {
  return obj && typeof obj.parse === 'function' && typeof obj.safeParse === 'function';
}

/**
 * Checks if a type is a supported message schema (Zod schema, object constructor, or plain dict).
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/core.py:15-17 (is_supported_model)
 * 
 * @param cls - The class or type to check
 * @returns True if the class is supported for message handling
 */
export function isSupportedModel(cls: any): boolean {
  // Support plain object (equivalent to Python dict)
  if (cls === Object || cls === 'object') {
    return true;
  }
  
  // Support Zod schemas (equivalent to Pydantic models)
  if (isZodSchema(cls)) {
    return true;
  }
  
  // Support class constructors (equivalent to dataclasses)
  if (typeof cls === 'function' && cls.prototype) {
    return true;
  }
  
  return false;
}

/**
 * Check if a class is valid for message routing.
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/core.py:20-21 (is_valid_routable_model)
 * 
 * @param cls - The class to check
 * @returns True if the class can be used for message routing
 */
export function isValidRoutableModel(cls: any): boolean {
  // Zod schemas are routable (equivalent to Pydantic models)
  if (isZodSchema(cls)) {
    return true;
  }
  
  // Class constructors are routable (equivalent to dataclasses)
  if (typeof cls === 'function' && cls.prototype) {
    return true;
  }
  
  return false;
}

/**
 * Find all public methods on an instance that carry a given decorator attribute.
 * PYTHON EQUIVALENT: dapr_agents/workflow/utils/core.py:24-66 (get_decorated_methods)
 * 
 * This will:
 * 1. Inspect the prototype chain for methods
 * 2. Bind them to the instance (so `this` is applied)
 * 3. Filter in only those where the decorator attribute exists
 * 
 * @param instance - Any object whose methods you want to inspect
 * @param attributeName - The name of the attribute set by the decorator (e.g. "_isTask" or "_isWorkflow")
 * @returns A record mapping method name to bound method
 * 
 * @example
 * ```typescript
 * class MyClass {
 *   @task()
 *   foo() { ... }
 * }
 * 
 * const discovered = getDecoratedMethods(new MyClass(), "_isTask");
 * // Returns: { "foo": <bound method> }
 * ```
 */
export function getDecoratedMethods(instance: any, attributeName: string): Record<string, Function> {
  const discovered: Record<string, Function> = {};
  
  // Walk through the prototype chain to find all methods
  let current = instance;
  while (current && current !== Object.prototype) {
    const propertyNames = Object.getOwnPropertyNames(current);
    
    for (const name of propertyNames) {
      // Skip private/protected methods (starting with _)
      if (name.startsWith('_') || name === 'constructor') {
        continue;
      }
      
      const descriptor = Object.getOwnPropertyDescriptor(current, name);
      if (descriptor?.value && typeof descriptor.value === 'function') {
        try {
          // Bind to instance so that `this` context works
          const bound = (instance as any)[name];
          if (typeof bound === 'function') {
            // Check if the method has our decorator flag
            if ((bound as any)[attributeName]) {
              discovered[name] = bound.bind(instance);
              console.debug(`Discovered decorated method: ${name}`);
            }
          }
        } catch (error) {
          console.warn(`Could not bind method '${name}': ${error}`);
          continue;
        }
      }
    }
    
    // Move up the prototype chain
    current = Object.getPrototypeOf(current);
  }
  
  return discovered;
}

/**
 * Type guard to check if a value is a function.
 * 
 * @param value - The value to check
 * @returns True if the value is a function
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * Type guard to check if a value is a plain object (not null, not array, not function).
 * 
 * @param value - The value to check
 * @returns True if the value is a plain object
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value) && 
         value.constructor === Object;
}

/**
 * Get the name of a type or constructor.
 * 
 * @param type - The type to get the name for
 * @returns The name of the type
 */
export function getTypeName(type: any): string {
  if (isZodSchema(type)) {
    // Try to get Zod schema name from _def
    const def = type._def as any;
    return def?.typeName || type.constructor?.name || 'ZodSchema';
  }
  
  if (typeof type === 'function') {
    return type.name || 'Function';
  }
  
  if (type === Object) {
    return 'Object';
  }
  
  return typeof type;
}

/**
 * Create a deep clone of an object.
 * 
 * @param obj - The object to clone
 * @returns A deep clone of the object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        (cloned as any)[key] = deepClone((obj as any)[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}