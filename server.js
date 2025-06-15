import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import express from "express";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";
const PORT = process.env.PORT || 3000;

// Create Express app
const app = express();
app.use(express.json());

// Create server instance with enhanced capabilities
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {
      "weather-data": {
        description: "Weather data from National Weather Service API",
        mimeTypes: ["application/json"],
      },
    },
    tools: {},
  },
});

// Helper function for making NWS API requests
async function makeNWSRequest(url) {
    const headers = {
      "User-Agent": USER_AGENT,
      Accept: "application/geo+json",
    };
  
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error making NWS request:", error);
      return null;
    }
  }

// Express Routes

// Get weather alerts for a state
app.get('/alerts/:state', async (req, res) => {
  try {
    const state = req.params.state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${state}`;
    const alertsData = await makeNWSRequest(alertsUrl);

    if (!alertsData) {
      return res.status(500).json({ error: "Failed to retrieve alerts data" });
    }

    res.json(alertsData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weather forecast for coordinates
app.get('/forecast', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const pointsUrl = `${NWS_API_BASE}/points/${latitude},${longitude}`;
    const pointsData = await makeNWSRequest(pointsUrl);

    if (!pointsData) {
      return res.status(500).json({ 
        error: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}` 
      });
    }

    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
      return res.status(500).json({ error: "Failed to get forecast URL" });
    }

    const forecastData = await makeNWSRequest(forecastUrl);
    if (!forecastData) {
      return res.status(500).json({ error: "Failed to retrieve forecast data" });
    }

    res.json(forecastData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Weather server is running' });
});

// MCP Resources

// Register weather data resource
server.resource(
  "weather-data",
  "weather-data",
  async (uri) => {
    const url = new URL(uri);
    const type = url.searchParams.get("type");
    const state = url.searchParams.get("state");
    const latitude = url.searchParams.get("latitude");
    const longitude = url.searchParams.get("longitude");

    let data = null;

    if (type === "alerts" && state) {
      const alertsUrl = `${NWS_API_BASE}/alerts?area=${state.toUpperCase()}`;
      data = await makeNWSRequest(alertsUrl);
    } else if (type === "forecast" && latitude && longitude) {
      const pointsUrl = `${NWS_API_BASE}/points/${latitude},${longitude}`;
      const pointsData = await makeNWSRequest(pointsUrl);
      
      if (pointsData?.properties?.forecast) {
        data = await makeNWSRequest(pointsData.properties.forecast);
      }
    }

    if (!data) {
      throw new Error("Failed to retrieve weather data");
    }

    return {
      uri,
      mimeType: "application/json",
      text: JSON.stringify(data, null, 2),
    };
  }
);

// MCP Tools

// Register weather tools
server.tool(
    "get-alerts",
    "Get weather alerts for a state",
    {
      state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
    },
    async ({ state }) => {
      const stateCode = state.toUpperCase();
      const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
      const alertsData = await makeNWSRequest(alertsUrl);
  
      if (!alertsData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve alerts data",
            },
          ],
        };
      }
  
      const features = alertsData.features || [];
      if (features.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No active alerts for ${stateCode}`,
            },
          ],
        };
      }
  
      const alertsText = `Active alerts for ${stateCode}:\n\n${JSON.stringify(alertsData, null, 2)}`;
  
      return {
        content: [
          {
            type: "text",
            text: alertsText,
          },
        ],
      };
    },
  );
  
  server.tool(
    "get-forecast",
    "Get weather forecast for a location",
    {
      latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
      longitude: z.number().min(-180).max(180).describe("Longitude of the location"),
    },
    async ({ latitude, longitude }) => {
      // Get grid point data
      const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const pointsData = await makeNWSRequest(pointsUrl);
  
      if (!pointsData) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
            },
          ],
        };
      }
  
      const forecastUrl = pointsData.properties?.forecast;
      if (!forecastUrl) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to get forecast URL from grid point data",
            },
          ],
        };
      }
  
      // Get forecast data
      const forecastData = await makeNWSRequest(forecastUrl);
      if (!forecastData) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to retrieve forecast data",
            },
          ],
        };
      }
  
      const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${JSON.stringify(forecastData, null, 2)}`;
  
      return {
        content: [
          {
            type: "text",
            text: forecastText,
          },
        ],
      };
    },
  );

  async function main() {
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Express server running on http://localhost:${PORT}`);
      console.log(`Available endpoints:`);
      console.log(`  GET /health - Health check`);
      console.log(`  GET /alerts/:state - Get alerts for a state (e.g., /alerts/CA)`);
      console.log(`  GET /forecast?latitude=40.7128&longitude=-74.0060 - Get forecast for coordinates`);
    });

    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
    console.error("Available MCP tools: get-alerts, get-forecast");
    console.error("Available MCP resources: weather-data");
  }
  
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  }); 