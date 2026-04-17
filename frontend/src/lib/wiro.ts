/**
 * Wiro.ai Generic Client for Birik.
 * Handles Run requests and Task Detail polling for asynchronous AI models.
 */

const WIRO_API_KEY = import.meta.env.VITE_WIRO_API_KEY as string | undefined;
const BASE_URL = 'https://api.wiro.ai/v1';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

export type WiroModel = 
  | 'google/gemini-3-flash'
  | 'openai/gpt-5-2';

export interface WiroRunResponse {
  taskid?: string;
  socketaccesstoken?: string;
  errors?: unknown[];
  result: boolean;
}

export interface WiroTaskDetail {
  status: string;
  outputs?: Array<{ url: string; contenttype: string }>;
  debugoutput?: string;
  [key: string]: unknown;
}

/**
 * Standard Run call to Wiro AI.
 */
export async function runWiroTask(
  model: WiroModel,
  formData: FormData
): Promise<string> {
  if (!WIRO_API_KEY) throw new Error('VITE_WIRO_API_KEY is not set');

  const res = await fetch(`${BASE_URL}/Run/${model}`, {
    method: 'POST',
    headers: { 'x-api-key': WIRO_API_KEY },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wiro Run failed (${res.status}): ${text}`);
  }

  const data: WiroRunResponse = await res.json();
  if (!data.result || !data.socketaccesstoken) {
    throw new Error(`Wiro Run error: ${JSON.stringify(data.errors)}`);
  }

  return data.socketaccesstoken;
}

/**
 * Poll for task completion and retrieve result.
 */
export async function pollWiroTask(
  taskToken: string,
  onStatusUpdate?: (status: string) => void
): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const res = await fetch(`${BASE_URL}/Task/Detail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WIRO_API_KEY!,
      },
      body: JSON.stringify({ tasktoken: taskToken }),
    });

    if (res.ok) {
      const data = await res.json();
      const task: WiroTaskDetail = data.tasklist?.[0];

      if (task) {
        if (onStatusUpdate) onStatusUpdate(task.status);

        if (task.status === 'task_postprocess_end' || task.status === 'task_end') {
          // Priority 1: Output URL (for JSON/Text outputs)
          if (task.outputs?.length) {
            const outRes = await fetch(task.outputs[0].url);
            if (outRes.ok) return await outRes.text();
          }
          // Priority 2: Debug Output (fallback)
          if (task.debugoutput) return task.debugoutput;
          
          // Priority 3: Scan all fields for something that looks like JSON/Text
          for (const val of Object.values(task)) {
            if (typeof val === 'string' && (val.includes('{') || val.length > 10)) {
              return val;
            }
          }
        }
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error('Wiro task timeout');
}
