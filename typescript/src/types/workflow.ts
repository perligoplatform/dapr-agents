import { z } from 'zod';

/**
 * Enumeration of possible workflow statuses for standardized tracking
 */
export enum DaprWorkflowStatus {
  /** Workflow is in an undefined state */
  UNKNOWN = 'unknown',
  /** Workflow is actively running */
  RUNNING = 'running',
  /** Workflow has completed */
  COMPLETED = 'completed',
  /** Workflow encountered an error */
  FAILED = 'failed',
  /** Workflow was canceled or forcefully terminated */
  TERMINATED = 'terminated',
  /** Workflow was temporarily paused */
  SUSPENDED = 'suspended',
  /** Workflow is waiting to start */
  PENDING = 'pending',
}

/**
 * Zod schema for DaprWorkflowStatus
 */
export const DaprWorkflowStatusSchema = z.nativeEnum(DaprWorkflowStatus);

/**
 * Helper to validate workflow status
 */
export function parseWorkflowStatus(status: unknown): DaprWorkflowStatus {
  return DaprWorkflowStatusSchema.parse(status);
}

/**
 * Helper to check if a status indicates the workflow is active
 */
export function isWorkflowActive(status: DaprWorkflowStatus): boolean {
  return status === DaprWorkflowStatus.RUNNING || status === DaprWorkflowStatus.PENDING;
}

/**
 * Helper to check if a status indicates the workflow is complete
 */
export function isWorkflowComplete(status: DaprWorkflowStatus): boolean {
  return status === DaprWorkflowStatus.COMPLETED || 
         status === DaprWorkflowStatus.FAILED || 
         status === DaprWorkflowStatus.TERMINATED;
}