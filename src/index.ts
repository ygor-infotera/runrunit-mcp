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
  const headers = {
    "App-Key": env.RUNRUNIT_APP_KEY,
    "User-Token": env.RUNRUNIT_USER_TOKEN,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Runrun.it API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
}

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_task",
        description: "Get detailed information about a specific task by its ID",
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
        description: "List tasks with optional filters",
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
        name: "get_me",
        description: "Get information about the authenticated user",
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
        const tasks = await runrunitFetch(`/tasks?${params.toString()}`);
        return {
          content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
        };
      }

      case "get_me": {
        const user = await runrunitFetch("/users/me");
        return {
          content: [{ type: "text", text: JSON.stringify(user, null, 2) }],
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
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
