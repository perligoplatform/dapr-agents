/**
 * Utility functions for LLM orchestrator plan management and validation.
 * 
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/utils.py
 * 
 * Provides utility functions for:
 * - Step status updates and consistency checks
 * - Plan structure validation
 * - Finding steps and substeps in plans
 * - Plan restructuring operations
 * - Message and action creation utilities
 */

import type { PlanStep, SubStep } from './state';

/**
 * Formats a plan for inclusion in prompts.
 * PYTHON EQUIVALENT: format_plan_for_prompt function in utils.py
 */
export function formatPlanForPrompt(plan: PlanStep[]): string {
  if (!plan || plan.length === 0) {
    return 'No plan available.';
  }

  return plan.map(step => {
    let stepText = `Step ${step.step}: ${step.description} (Status: ${step.status})`;
    
    if (step.substeps && step.substeps.length > 0) {
      const substepsText = step.substeps.map(substep => 
        `  - Substep ${substep.substep}: ${substep.description} (Status: ${substep.status})`
      ).join('\n');
      stepText += '\n' + substepsText;
    }
    
    return stepText;
  }).join('\n\n');
}

/**
 * Creates a broadcast message for all agents.
 * PYTHON EQUIVALENT: create_broadcast_message function in utils.py
 */
export function createBroadcastMessage(
  senderName: string,
  role: string,
  content: string
): any {
  return {
    sender: senderName,
    role,
    content,
    timestamp: new Date().toISOString(),
    broadcast: true
  };
}

/**
 * Creates a trigger action for an agent.
 * PYTHON EQUIVALENT: create_trigger_action function in utils.py
 */
export function createTriggerAction(
  task?: string,
  instanceId?: string,
  kwargs?: Record<string, any>
): any {
  return {
    task: task || 'Continue with your assigned task',
    instanceId,
    timestamp: new Date().toISOString(),
    ...kwargs
  };
}

/**
 * Ensures step and sub-step statuses follow logical progression.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/utils.py:4-44 (update_step_statuses)
 * 
 * Rules:
 * - Parent completes if all substeps complete
 * - Parent goes in_progress if any substep is in_progress
 * - If substeps start completing, parent moves in_progress
 * - If parent was completed but a substep reverts to in_progress, parent downgrades
 * - Standalone steps (no substeps) are only updated via explicit status_updates
 * 
 * @param plan - The execution plan to update
 * @returns Updated plan with consistent statuses
 */
export function updateStepStatuses(plan: PlanStep[]): PlanStep[] {
  for (const step of plan) {
    const substeps = step.substeps;

    // No substeps: do nothing here (explicit updates only)
    if (!substeps || !Array.isArray(substeps) || substeps.length === 0) {
      continue;
    }

    // Collect child statuses
    const statuses = new Set(substeps.map(sub => sub.status));

    // 1. All done → parent done
    if (statuses.size === 1 && statuses.has('completed')) {
      step.status = 'completed';
    }
    // 2. Any in_progress → parent in_progress  
    else if (statuses.has('in_progress')) {
      step.status = 'in_progress';
    }
    // 3. Some done, parent not yet started → bump to in_progress
    else if (statuses.has('completed') && step.status === 'not_started') {
      step.status = 'in_progress';
    }
    // 4. If parent was completed but a child is not completed, downgrade
    else if (step.status === 'completed' && !Array.from(statuses).every(s => s === 'completed')) {
      step.status = 'in_progress';
    }
  }

  return plan;
}

/**
 * Validates if the plan structure follows the correct schema.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/utils.py:47-60 (validate_plan_structure)
 * 
 * @param plan - The execution plan to validate
 * @returns True if the plan structure is valid, false otherwise
 */
export function validatePlanStructure(plan: PlanStep[]): boolean {
  const requiredStepKeys = new Set(['step', 'description', 'status']);
  
  for (const step of plan) {
    // Check required step properties
    const stepKeys = new Set(Object.keys(step));
    if (!Array.from(requiredStepKeys).every(key => stepKeys.has(key))) {
      return false;
    }

    // Check substeps if they exist
    if (step.substeps) {
      const requiredSubstepKeys = new Set(['substep', 'description', 'status']);
      for (const substep of step.substeps) {
        const substepKeys = new Set(Object.keys(substep));
        if (!Array.from(requiredSubstepKeys).every(key => substepKeys.has(key))) {
          return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * Finds a specific step or substep in a plan.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/utils.py:63-83 (find_step_in_plan)
 * 
 * @param plan - The execution plan to search
 * @param step - The step number to find
 * @param substep - The substep number (if applicable)
 * @returns The found step/substep object or undefined if not found
 */
export function findStepInPlan(
  plan: PlanStep[], 
  step: number, 
  substep?: number
): PlanStep | SubStep | undefined {
  for (const stepEntry of plan) {
    if (stepEntry.step === step) {
      if (substep === undefined) {
        return stepEntry;
      }

      // Look for substep
      if (stepEntry.substeps) {
        for (const sub of stepEntry.substeps) {
          if (sub.substep === substep) {
            return sub;
          }
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Applies restructuring updates to the task execution plan.
 * PYTHON EQUIVALENT: dapr_agents/workflow/orchestrators/llm/utils.py:86-112 (restructure_plan)
 * 
 * @param plan - The current execution plan
 * @param updates - A list of updates to apply
 * @returns The updated execution plan
 */
export function restructurePlan(
  plan: PlanStep[], 
  updates: PlanStep[]
): PlanStep[] {
  for (const update of updates) {
    const stepId = update.step;
    const stepIndex = plan.findIndex(step => step.step === stepId);
    
    if (stepIndex !== -1) {
      // Update the existing step with the new data
      plan[stepIndex] = { ...plan[stepIndex], ...update };
    } else {
      // If step doesn't exist, add it (this is a new step)
      plan.push(update);
    }
  }

  return plan;
}

/**
 * Helper function to get all incomplete steps from a plan.
 * 
 * @param plan - The execution plan to analyze
 * @returns Array of steps that are not completed
 */
export function getIncompleteSteps(plan: PlanStep[]): PlanStep[] {
  return plan.filter(step => step.status !== 'completed');
}

/**
 * Helper function to get all incomplete substeps from a plan.
 * 
 * @param plan - The execution plan to analyze
 * @returns Array of substeps that are not completed
 */
export function getIncompleteSubsteps(plan: PlanStep[]): SubStep[] {
  const incompleteSubsteps: SubStep[] = [];
  
  for (const step of plan) {
    if (step.substeps) {
      const incomplete = step.substeps.filter(sub => sub.status !== 'completed');
      incompleteSubsteps.push(...incomplete);
    }
  }
  
  return incompleteSubsteps;
}

/**
 * Helper function to check if all steps in a plan are completed.
 * 
 * @param plan - The execution plan to check
 * @returns True if all steps are completed, false otherwise
 */
export function isTaskCompleted(plan: PlanStep[]): boolean {
  return plan.every(step => step.status === 'completed');
}

/**
 * Helper function to get the next step that should be executed.
 * 
 * @param plan - The execution plan to analyze
 * @returns The next step to execute, or undefined if all are completed
 */
export function getNextStep(plan: PlanStep[]): PlanStep | undefined {
  // First, look for in_progress steps
  const inProgress = plan.find(step => step.status === 'in_progress');
  if (inProgress) {
    return inProgress;
  }
  
  // Then, look for not_started steps
  const notStarted = plan.find(step => step.status === 'not_started');
  if (notStarted) {
    return notStarted;
  }
  
  // No incomplete steps found
  return undefined;
}

/**
 * Helper function to get the next substep that should be executed within a step.
 * 
 * @param step - The step to analyze
 * @returns The next substep to execute, or undefined if all are completed
 */
export function getNextSubstep(step: PlanStep): SubStep | undefined {
  if (!step.substeps) {
    return undefined;
  }
  
  // First, look for in_progress substeps
  const inProgress = step.substeps.find(sub => sub.status === 'in_progress');
  if (inProgress) {
    return inProgress;
  }
  
  // Then, look for not_started substeps
  const notStarted = step.substeps.find(sub => sub.status === 'not_started');
  if (notStarted) {
    return notStarted;
  }
  
  // No incomplete substeps found
  return undefined;
}