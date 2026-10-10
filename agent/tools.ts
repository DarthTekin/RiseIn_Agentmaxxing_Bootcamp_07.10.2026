/**
 * YOUR AGENT'S TOOLS
 *
 * A tool is just a function the agent is allowed to call.
 * Gemini reads the `description` to decide WHEN to use it,
 * and `parameters` to know WHAT to pass in.
 *
 * Add your own tool: copy one of the objects below, change it,
 * and save. It shows up in the "Tools" list on the page.
 */
import { getWalletAddress, getWalletBalance, payAndFetch } from "./wallet";

export type Tool = {
  name: string;
  description: string;
  /** JSON Schema describing the inputs. */
  parameters: object;
  /** The code that runs when the agent calls this tool. */
  run: (args: any, ctx: { baseUrl: string }) => Promise<unknown>;
};

export const tools: Tool[] = [
  // ─── 1. A paid API: the agent's wallet signs a payment to unlock it ───
  {
    name: "get_weather",
    description: "Get the current weather for a city. Costs 0.01 USDC, paid automatically from the agent's wallet.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name, e.g. Mumbai" },
      },
      required: ["city"],
    },
    run: async ({ city }, { baseUrl }) => {
      return payAndFetch(`${baseUrl}/api/weather?city=${encodeURIComponent(city)}`);
    },
  },

  // ─── 2. Wallet tool: read the agent's own wallet ───
  {
    name: "get_my_wallet",
    description: "Get the agent's own wallet address and its ETH balance on Base Sepolia (testnet).",
    parameters: { type: "object", properties: {} },
    run: async () => ({
      address: getWalletAddress(),
      balance: await getWalletBalance(),
      network: "Base Sepolia (testnet)",
    }),
  },

  // ─── 3. A plain tool: no wallet, no API. Try changing this one first! ───
  {
    name: "roll_dice",
    description: "Roll a dice with the given number of sides.",
    parameters: {
      type: "object",
      properties: {
        sides: { type: "number", description: "How many sides the dice has. Default 6." },
      },
    },
    run: async ({ sides = 6 }) => ({ rolled: Math.floor(Math.random() * sides) + 1, sides }),
  },

  // ─── 4. A free public API with an input: facts about a city (no API key) ───
  {
    name: "get_city_info",
    description:
      "Get basic facts about a city: its country, region, population, time zone and coordinates. Use when the user asks about a city's country, population, time zone or location.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name in English, e.g. Tokyo" },
      },
      required: ["city"],
    },
    run: async ({ city }) => {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      if (!res.ok) {
        return { error: `City lookup failed for "${city}".`, status: res.status };
      }
      const data = await res.json();
      const match = data?.results?.[0];
      if (!match) {
        return { error: `No city found for "${city}".` };
      }
      return {
        name: match.name,
        country: match.country,
        region: match.admin1 ?? "N/A",
        population: match.population ?? "N/A",
        timezone: match.timezone,
        latitude: match.latitude,
        longitude: match.longitude,
      };
    },
  },

  // ─── 5. A free forecast tool that needs coordinates: the agent must chain get_city_info first ───
  {
    name: "get_forecast",
    description:
      "Get a 3-day weather forecast (daily max/min temperature in Celsius and chance of rain) for a location. Needs latitude and longitude: if you only have a city name, call get_city_info first to get the coordinates. Free, no payment needed.",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number", description: "Latitude, e.g. 35.6895" },
        longitude: { type: "number", description: "Longitude, e.g. 139.6917" },
      },
      required: ["latitude", "longitude"],
    },
    run: async ({ latitude, longitude }) => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`
      );
      if (!res.ok) {
        return { error: "Forecast lookup failed.", status: res.status };
      }
      const data = await res.json();
      const d = data?.daily;
      if (!d?.time) {
        return { error: "Unexpected forecast response.", details: data };
      }
      return {
        timezone: data.timezone,
        days: d.time.map((date: string, i: number) => ({
          date,
          maxC: d.temperature_2m_max[i],
          minC: d.temperature_2m_min[i],
          rainChancePercent: d.precipitation_probability_max[i],
        })),
      };
    },
  },
];
