import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { env } from "./env.js";

const API_BASE_URL = "https://runrun.it/api/v1.0";

const server = new Server(
  {
    name: "runrunit-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

/**
 * Helper function to make Fetch requests to Runrun.it API
 */
async function runrunitFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "App-Key": env.RUNRUNIT_APP_KEY,
    "User-Token": env.RUNRUNIT_USER_TOKEN,
    Accept: "application/json",
  };

  if (
    options.body ||
    options.method === "POST" ||
    options.method === "PATCH" ||
    options.method === "PUT"
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const errorText = await response.text();
    const appKeyLen = env.RUNRUNIT_APP_KEY?.length ?? 0;
    const userTokenLen = env.RUNRUNIT_USER_TOKEN?.length ?? 0;
    throw new Error(
      `Runrun.it API error: ${response.status} ${response.statusText} (K:${appKeyLen}, T:${userTokenLen}) - ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Simplifies a task object for better model readability
 */
function simplifyTask(task: any) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || "No description",
    status: task.task_status_name || task.board_stage_name || task.state,
    responsible: task.responsible_name,
    project: task.project_name || "No project",
    team: task.team_name,
    overdue: task.overdue === "on_schedule" ? "On schedule" : task.overdue,
    created_at: task.created_at,
    estimated_delivery: task.estimated_delivery_date,
    time_worked: `${(task.time_worked / 3600).toFixed(2)}h`,
    time_total: `${(task.time_total / 3600).toFixed(2)}h`,
    priority: task.priority,
    is_closed: task.is_closed,
    link: `https://runrun.it/pt-BR/tasks/${task.id}`,
  };
}

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_task",
        description:
          "Get core information about a specific task (Title and Description). Use this for general context about what needs to be done.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The ID of the task to retrieve",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "get_task_details",
        description:
          "Get the FULL, raw API response for a task. WARNING: This is very large. Only use if you specifically need technical fields, custom field values, or deep task metadata not available in get_task.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The ID of the task to retrieve",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "list_tasks",
        description:
          "List tasks with optional filters. Returns simplified task objects. Use this to find tasks by user, project, or status.",
        inputSchema: {
          type: "object",
          properties: {
            responsible_id: {
              type: "string",
              description: "ID of user responsible for the task",
            },
            project_id: {
              type: "number",
              description: "ID of the project the task belongs to",
            },
            is_closed: {
              type: "boolean",
              description: "Filter by closed status",
            },
            limit: {
              type: "number",
              description: "Number of tasks to return (max 100)",
            },
          },
        },
      },
      {
        name: "get_config_status",
        description:
          "Check if environment variables are correctly loaded (MASKED)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_me",
        description: "Get information about the current authenticated user",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_task": {
        const id = args?.["id"] as number;
        if (!id) throw new Error("Task ID is required");

        // Fetch task info and description in parallel
        const [task, descData] = await Promise.all([
          runrunitFetch(`/tasks/${id}`),
          runrunitFetch(`/tasks/${id}/description`).catch((err) => {
            console.error(`Failed to fetch description for task ${id}:`, err);
            return { description: "Could not fetch description" };
          }),
        ]);

        // Merge description into task object
        if (descData && descData.description) {
          task.description = descData.description;
        }

        return {
          content: [
            { type: "text", text: JSON.stringify(simplifyTask(task), null, 2) },
          ],
        };
      }

      case "get_task_details": {
        const id = args?.["id"] as number;
        if (!id) throw new Error("Task ID is required");
        const task = await runrunitFetch(`/tasks/${id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        };
      }

      case "list_tasks": {
        const params = new URLSearchParams();
        if (args) {
          Object.entries(args).forEach(([key, value]) => {
            if (value !== undefined) params.append(key, String(value));
          });
        }
        const tasks =
          (await runrunitFetch(`/tasks?${params.toString()}`)) || [];
        const taskList = Array.isArray(tasks) ? tasks : [];
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(taskList.map(simplifyTask), null, 2),
            },
          ],
        };
      }

      case "get_me": {
        const user = await runrunitFetch("/users/me");
        return {
          content: [{ type: "text", text: JSON.stringify(user, null, 2) }],
        };
      }

      case "get_config_status": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  appKeyPresent: !!env.RUNRUNIT_APP_KEY,
                  appKeyLength: env.RUNRUNIT_APP_KEY?.length,
                  userTokenPresent: !!env.RUNRUNIT_USER_TOKEN,
                  userTokenLength: env.RUNRUNIT_USER_TOKEN?.length,
                  nodeVersion: process.version,
                  cwd: process.cwd(),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Runrun.it MCP Server running on stdio");
  console.error(
    `Config: AppKey: ${env.RUNRUNIT_APP_KEY?.substring(0, 3)}...${env.RUNRUNIT_APP_KEY?.substring(env.RUNRUNIT_APP_KEY.length - 3)}`,
  );
  console.error(
    `Config: UserToken: ${env.RUNRUNIT_USER_TOKEN?.substring(0, 3)}...${env.RUNRUNIT_USER_TOKEN?.substring(env.RUNRUNIT_USER_TOKEN.length - 3)}`,
  );
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
