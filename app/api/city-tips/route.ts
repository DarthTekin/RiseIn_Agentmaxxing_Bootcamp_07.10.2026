/**
 * Paid city tips API (x402 pattern).
 *
 * GET /api/city-tips?city=<name>
 * - No valid X-PAYMENT header: responds 402 with price, asset and payTo.
 * - Valid signed payment (>= PRICE, addressed to PAY_TO): responds with
 *   the best season and short travel tips for the city.
 *
 * Payments are signed with the agent wallet but not settled on-chain (demo).
 */
import { verifyPayment } from "@/agent/wallet";

const PRICE = "0.02";
const ASSET = "USDC";
const PAY_TO = "0x000000000000000000000000000000000000dEaD"; // API owner wallet (demo address)

type Tips = { bestSeason: string; tips: string[] };

const TIPS: Record<string, Tips> = {
  istanbul: {
    bestSeason: "April-May and September-October",
    tips: [
      "Buy an Istanbulkart for metro, tram and ferry rides.",
      "Take a Bosphorus ferry instead of a tourist cruise.",
      "Visit Hagia Sophia and the Blue Mosque early in the morning.",
    ],
  },
  tokyo: {
    bestSeason: "March-May and October-November",
    tips: [
      "Get a Suica or Pasmo card for trains and convenience stores.",
      "Avoid the trains during the morning rush hour (about 8-9 AM).",
      "Carry some cash, many small shops still prefer it.",
    ],
  },
  mumbai: {
    bestSeason: "November-February",
    tips: [
      "Use the local trains outside rush hour, they are the fastest way around.",
      "Carry an umbrella from June to September (monsoon).",
      "Try street food at busy stalls where the turnover is high.",
    ],
  },
  paris: {
    bestSeason: "April-June and September-October",
    tips: [
      "Book popular museums online in advance.",
      "A Navigo pass is cheaper than single tickets for a longer stay.",
      "Greet shopkeepers with 'Bonjour' when you enter.",
    ],
  },
  london: {
    bestSeason: "May-September",
    tips: [
      "Tap a contactless card on the Tube, no ticket needed.",
      "Many top museums are free to enter.",
      "Always carry a light rain jacket.",
    ],
  },
};

export async function GET(req: Request) {
  const city = new URL(req.url).searchParams.get("city")?.trim() || "Unknown";

  const payment = await verifyPayment(req.headers.get("X-PAYMENT"));
  if (!payment || payment.to !== PAY_TO || Number(payment.amount) < Number(PRICE)) {
    return Response.json({ error: "Payment Required", price: PRICE, asset: ASSET, payTo: PAY_TO }, { status: 402 });
  }

  const found = TIPS[city.toLowerCase()];
  return Response.json({
    city,
    bestSeason: found?.bestSeason ?? "Check the local climate before booking.",
    tips: found?.tips ?? [
      "Learn a few words of the local language.",
      "Keep a digital and a paper copy of your travel documents.",
      "Ask locals for their favorite food spot.",
    ],
    paidBy: payment.from,
  });
}
