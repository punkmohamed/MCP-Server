# MCP Weather Server

A Model Context Protocol (MCP) server with Express HTTP endpoints that provides weather data using the National Weather Service (NWS) API.

## Features

- **HTTP API**: RESTful endpoints for weather data
- **MCP Server**: Model Context Protocol server for AI integration
- **MCP Resources**: Direct access to weather data as resources
- **Weather Alerts**: Get active weather alerts for any US state
- **Weather Forecast**: Get detailed weather forecasts for any location in the US

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

### Running the Server

```bash
npm start
```

The server runs both:
- **Express HTTP server** on port 3000 (or PORT environment variable)
- **MCP server** on stdio for AI client connections

### HTTP API Endpoints

#### Health Check
```bash
GET /health
```
Returns server status.

#### Get Weather Alerts
```bash
GET /alerts/:state
```
Get weather alerts for a specific US state.

**Example:**
```bash
curl http://localhost:3000/alerts/CA
```

#### Get Weather Forecast
```bash
GET /forecast?latitude=40.7128&longitude=-74.0060
```
Get weather forecast for coordinates.

**Example:**
```bash
curl "http://localhost:3000/forecast?latitude=40.7128&longitude=-74.0060"
```

### MCP Tools

#### get-alerts
Get weather alerts for a specific US state.

**Parameters:**
- `state` (string): Two-letter state code (e.g., "CA", "NY", "TX")

#### get-forecast
Get weather forecast for a specific location using coordinates.

**Parameters:**
- `latitude` (number): Latitude of the location (-90 to 90)
- `longitude` (number): Longitude of the location (-180 to 180)

### MCP Resources

#### weather-data
Access weather data directly as a resource.

**URI Format:**
- Alerts: `weather-data?type=alerts&state=CA`
- Forecast: `weather-data?type=forecast&latitude=40.7128&longitude=-74.0060`

**Example:**
```javascript
// Get alerts for California
const alertsResource = await client.readResource("weather-data?type=alerts&state=CA");

// Get forecast for New York City
const forecastResource = await client.readResource("weather-data?type=forecast&latitude=40.7128&longitude=-74.0060");
```

## API Information

This server uses the National Weather Service (NWS) API, which:
- Only supports locations within the United States
- Provides free weather data
- Uses GeoJSON format for responses

## Error Handling

The server includes comprehensive error handling for:
- Network failures
- Invalid coordinates
- Unsupported locations
- API rate limits

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK for server implementation
- `zod`: Schema validation for tool parameters
- `express`: HTTP server framework

## License

MIT 