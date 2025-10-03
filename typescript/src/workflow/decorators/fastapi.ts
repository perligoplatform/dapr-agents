/**
 * Configuration for FastAPI route decorator
 */
export interface RouteConfig {
  path: string;
  method?: string;
  summary?: string;
  tags?: string[];
  [key: string]: any; // Additional FastAPI route options
}

/**
 * Metadata attached to route functions
 */
export interface RouteMetadata {
  isFastApiRoute: true;
  routePath: string;
  routeMethod: string;
  routeKwargs: Record<string, any>;
}

/**
 * Type guard to check if a function is a FastAPI route
 * PYTHON EQUIVALENT: Checking for ._is_fastapi_route attribute in fastapi.py
 */
export function isRouteFunction(func: any): func is Function & RouteMetadata {
  return typeof func === 'function' && func.isFastApiRoute === true;
}

/**
 * FastAPI route decorator factory function.
 * 
 * Decorator to mark an instance method as a FastAPI route.
 * 
 * PYTHON EQUIVALENT: @route decorator in fastapi.py lines 1-21
 * 
 * @param path The URL path to bind this route to
 * @param method The HTTP method to use (e.g., 'GET', 'POST'). Defaults to 'GET'
 * @param kwargs Additional arguments passed to FastAPI's add_api_route
 * @returns Decorator function that attaches route metadata
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const statusRoute = route("/status")((req, res) => {
 *   return { ok: true };
 * });
 * 
 * // With configuration
 * const healthRoute = route("/health", {
 *   method: "GET",
 *   summary: "Health check endpoint",
 *   tags: ["monitoring"]
 * })((req, res) => {
 *   return { status: "healthy", timestamp: new Date().toISOString() };
 * });
 * 
 * // POST route
 * const createUserRoute = route("/users", {
 *   method: "POST",
 *   summary: "Create a new user",
 *   tags: ["users"]
 * })((req, res) => {
 *   // create user logic
 *   return { id: "user123", created: true };
 * });
 * ```
 */
export function route<TFunc extends (...args: any[]) => any>(
  path: string,
  config: Omit<RouteConfig, 'path'> = {}
) {
  return function(func: TFunc): TFunc & RouteMetadata {
    if (typeof func !== 'function') {
      throw new Error(`@route must be applied to a function, got ${typeof func}.`);
    }

    const routeConfig: RouteConfig = { path, ...config };
    
    // Create decorated function with metadata (similar to Python's approach)
    const decoratedFunc = func as TFunc & RouteMetadata;
    
    // Attach route metadata (PYTHON EQUIVALENT: lines 14-17 in fastapi.py)
    decoratedFunc.isFastApiRoute = true;
    decoratedFunc.routePath = routeConfig.path;
    decoratedFunc.routeMethod = (routeConfig.method || 'GET').toUpperCase();
    decoratedFunc.routeKwargs = {
      summary: routeConfig.summary,
      tags: routeConfig.tags,
      ...Object.fromEntries(
        Object.entries(routeConfig).filter(([key]) => 
          !['path', 'method'].includes(key)
        )
      )
    };

    return decoratedFunc;
  };
}

/**
 * Shorthand decorators for common HTTP methods
 */
export const get = (path: string, config: Omit<RouteConfig, 'path' | 'method'> = {}) => 
  route(path, { ...config, method: 'GET' });

export const post = (path: string, config: Omit<RouteConfig, 'path' | 'method'> = {}) => 
  route(path, { ...config, method: 'POST' });

export const put = (path: string, config: Omit<RouteConfig, 'path' | 'method'> = {}) => 
  route(path, { ...config, method: 'PUT' });

export const patch = (path: string, config: Omit<RouteConfig, 'path' | 'method'> = {}) => 
  route(path, { ...config, method: 'PATCH' });

export const del = (path: string, config: Omit<RouteConfig, 'path' | 'method'> = {}) => 
  route(path, { ...config, method: 'DELETE' });

/**
 * Extract route configuration from a decorated function
 * PYTHON EQUIVALENT: Reading ._route_* attributes from decorated functions
 */
export function getRouteConfig(func: Function & RouteMetadata): RouteConfig {
  return {
    path: func.routePath,
    method: func.routeMethod,
    ...func.routeKwargs
  };
}

/**
 * Discover all route functions from an object or class
 * PYTHON EQUIVALENT: Similar to discovering tasks/workflows but for FastAPI routes
 */
export function discoverRoutes(target: any): Record<string, Function & RouteMetadata> {
  const routes: Record<string, Function & RouteMetadata> = {};
  
  if (!target || typeof target !== 'object') {
    return routes;
  }
  
  // Get all property names including inherited ones
  const allProps = new Set<string>();
  let current = target;
  
  while (current && current !== Object.prototype) {
    Object.getOwnPropertyNames(current).forEach(prop => allProps.add(prop));
    current = Object.getPrototypeOf(current);
  }
  
  for (const prop of Array.from(allProps)) {
    try {
      const value = target[prop];
      if (isRouteFunction(value)) {
        const routeKey = `${value.routeMethod}:${value.routePath}`;
        routes[routeKey] = value;
      }
    } catch (error) {
      // Skip properties that can't be accessed
      continue;
    }
  }
  
  return routes;
}