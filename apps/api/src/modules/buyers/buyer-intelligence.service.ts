import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import OpenAI from "openai";

const MARKET_TO_STATE: Record<string, string> = {
  birmingham: "AL", huntsville: "AL", montgomery: "AL",
  jacksonville: "FL", orlando: "FL", tampa: "FL", miami: "FL", clearwater: "FL",
  "central florida": "FL", "orange county": "FL",
  dallas: "TX", houston: "TX", "san antonio": "TX", austin: "TX", killeen: "TX", gordonville: "TX",
  atlanta: "GA", charlotte: "NC", raleigh: "NC", memphis: "TN", nashville: "TN",
};

function inferState(market: string): string | null {
  if (!market) return null;
  const lower = market.toLowerCase();
  const ABBREVS = ["AL","FL","TX","GA","NC","TN","OH","MI","IL","AZ","NV","CO","CA","NY","PA","VA","MD","SC","MS","AR","LA","IN","KY","MO"];
  for (const abbr of ABBREVS) {
    if (new RegExp("\\b" + abbr + "\\b", "i").test(market)) return abbr;
  }
  for (const [city, state] of Object.entries(MARKET_TO_STATE)) {
    if (lower.includes(city)) return state;
  }
  return null;
}

@Injectable()
export class BuyerIntelligenceService {
  private readonly logger = new Logger(BuyerIntelligenceService.name);
  private openai: OpenAI;
  constructor(private prisma: PrismaService) {}

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.openai;
  }

  async backfillBuyBoxes(): Promise<{ updated: number; created: number; skipped: number }> {
    this.logger.log("[BuyerIntel] Starting buy box backfill...");
    const buyers = await this.prisma.buyer.findMany({ where: { isActive: true }, include: { buyBox: true } });
    let updated = 0, created = 0, skipped = 0;
    for (const buyer of buyers) {
      try {
        const markets = [buyer.marketPrimary, ...(buyer.marketSecondary || [])].filter(Boolean) as string[];
        if (!markets.length) { skipped++; continue; }
        const states = [...new Set(markets.map(inferState).filter(Boolean) as string[])];
        if (!states.length) { skipped++; continue; }
        if (buyer.buyBox) {
          const existing = buyer.buyBox.states || [];
          const merged = [...new Set([...existing, ...states])];
          if (merged.length !== existing.length) {
            await this.prisma.buyBox.update({ where: { buyerId: buyer.id }, data: { states: merged } });
            updated++;
          } else { skipped++; }
        } else {
          await this.prisma.buyBox.create({ data: { buyerId: buyer.id, states } });
          created++;
        }
      } catch (err: any) { this.logger.warn("[BuyerIntel] Backfill failed for " + buyer.id + ": " + err.message); skipped++; }
    }
    this.logger.log("[BuyerIntel] Backfill: " + created + " created, " + updated + " updated, " + skipped + " skipped");
    return { updated, created, skipped };
  }

  async generateBuyerProfile(buyerId: string): Promise<string> {
    const buyer = await this.prisma.buyer.findUnique({ where: { id: buyerId }, include: { buyBox: true } });
    if (!buyer) throw new Error("Buyer " + buyerId + " not found");
    const bb = buyer.buyBox as any;
    const context = [
      buyer.firstName + " " + buyer.lastName + (buyer.company ? " / " + buyer.company : ""),
      "Tier: " + buyer.tier + " | Type: " + buyer.investorType,
      buyer.hasCash ? "Cash buyer" : null,
      buyer.hasHardMoney ? "Has hard money" : null,
      buyer.marketPrimary ? "Primary market: " + buyer.marketPrimary : null,
      buyer.marketSecondary?.length ? "Secondary markets: " + buyer.marketSecondary.join(", ") : null,
      buyer.preferredStrategies?.length ? "Strategies: " + buyer.preferredStrategies.join(", ") : null,
      buyer.dealBreakers?.length ? "Deal breakers: " + buyer.dealBreakers.join(", ") : null,
      bb ? "Buy states: " + (bb.states?.join(", ") || "none") + " | Price: $" + (bb.minPrice || 0).toLocaleString() + "-$" + (bb.maxPrice ? bb.maxPrice.toLocaleString() : "open") : null,
      buyer.buyerIntelNotes ? "Intel notes: " + buyer.buyerIntelNotes : null,
      buyer.aiSummary ? "Conversation: " + buyer.aiSummary : null,
      (buyer as any).temperatureNotes ? "Status: " + (buyer as any).temperatureNotes : null,
    ].filter(Boolean).join("\n");

    const response = await this.getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Write a 3-5 sentence buyer intelligence profile for wholesale real estate matching. Include: what markets/states they buy in, deal types (subto/wholesale/flip/rental), price range, funding type, current status. Be specific. Use ALL data provided.\n\nBUYER DATA:\n" + context + "\n\nWrite ONLY the profile. No headers." }],
      max_tokens: 300, temperature: 0.3,
    });
    const profile = response.choices[0]?.message?.content?.trim() || "";
    await this.prisma.buyer.update({ where: { id: buyerId }, data: { aiBuyerProfile: profile } as any });
    return profile;
  }

  async generateAllMissingProfiles(limit = 50): Promise<{ generated: number; failed: number }> {
    const buyers = await this.prisma.buyer.findMany({
      where: { isActive: true } as any,
      take: limit, orderBy: { compositeScore: "desc" },
    });
    this.logger.log("[BuyerIntel] Generating profiles for " + buyers.length + " buyers...");
    let generated = 0, failed = 0;
    for (let i = 0; i < buyers.length; i += 5) {
      const batch = buyers.slice(i, i + 5);
      await Promise.all(batch.map(async buyer => {
        try { await this.generateBuyerProfile(buyer.id); generated++; }
        catch (err: any) { this.logger.warn("[BuyerIntel] Failed for " + buyer.id + ": " + err.message); failed++; }
      }));
      if (i + 5 < buyers.length) await new Promise(r => setTimeout(r, 1000));
    }
    return { generated, failed };
  }
}
