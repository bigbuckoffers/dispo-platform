"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArvEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const openai_1 = require("openai");
const SCRAPER_KEY = process.env.SCRAPER_API_KEY || '2937e26b28b93482446a9d030142aa50';
let ArvEngineService = class ArvEngineService {
    constructor(prisma) {
        this.prisma = prisma;
        this.openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    }
    async runArvEngine(dealId, manualApprovals) {
        const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
        if (!deal)
            throw new Error('Deal not found');
        const addr = `${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}`;
        const subject = {
            address: addr,
            sqft: deal.sqft,
            beds: deal.beds,
            baths: deal.baths,
            yearBuilt: deal.yearBuilt,
            propertyType: deal.propertyType || 'SINGLE_FAMILY',
            zipCode: deal.zipCode,
            city: deal.city,
            state: deal.state,
        };
        const rawComps = await this.scrapeRedfin(addr, deal.zipCode || '', deal.city || '', deal.state || '');
        const normalized = this.normalizeComps(rawComps);
        const conflicts = this.detectSubjectConflicts(deal, normalized);
        if (conflicts.length > 0) {
            return {
                outputState: 'MANUAL_REVIEW_REQUIRED',
                reason: 'Conflicting subject property facts detected across sources.',
                conflicts,
                rawCompCount: normalized.length,
                validatedComps: [],
                arvLow: null, arvMedian: null, arvHigh: null,
                aiNarrative: null,
            };
        }
        const validatedComps = this.validateAndScoreComps(normalized, subject, manualApprovals || []);
        const outputState = this.determineOutputState(validatedComps, subject);
        const arvNumbers = this.calculateWeightedArv(validatedComps);
        let aiNarrative = null;
        if (validatedComps.length > 0 && outputState !== 'INSUFFICIENT_DATA' && outputState !== 'MANUAL_REVIEW_REQUIRED') {
            aiNarrative = await this.getAiNarrative(subject, validatedComps, outputState, arvNumbers);
        }
        if (arvNumbers.median && (outputState === 'VERIFIED_ARV' || outputState === 'PRELIMINARY_ARV')) {
            await this.prisma.deal.update({
                where: { id: dealId },
                data: { arv: arvNumbers.median },
            });
        }
        return {
            outputState,
            subject,
            rawCompCount: normalized.length,
            validatedCompCount: validatedComps.length,
            validatedComps,
            arvLow: arvNumbers.low,
            arvMedian: arvNumbers.median,
            arvHigh: arvNumbers.high,
            subdivisionProven: validatedComps.some(c => c.subdivisionProven),
            avgConfidenceScore: validatedComps.length > 0
                ? Math.round(validatedComps.reduce((a, c) => a + c.confidenceScore, 0) / validatedComps.length)
                : 0,
            aiNarrative,
            validationLog: this.buildValidationLog(normalized, validatedComps),
            scrapedAt: new Date().toISOString(),
        };
    }
    async scrapeRedfin(fullAddr, zip, city, state) {
        const today = new Date().toISOString().split('T')[0];
        const prompt = `You are a real estate data extraction agent. Search Redfin, Zillow, and Realtor.com for REAL recently sold homes near ${fullAddr} within the last 12 months.

Search these URLs and extract actual sold listings:
- https://www.redfin.com/zipcode/${zip}/filter/property-type=house,status=sold
- https://www.zillow.com/homes/recently_sold/${zip}_rb/
- https://www.realtor.com/realestateandhomes-search/${city}_${state}/show-recently-sold/

Today is ${today}. Only include sales from the last 12 months.

For each sold home found, extract EXACTLY this data from the actual listing page:
- address (full street address)
- saleDate (YYYY-MM-DD format)
- salePrice (number, no $ sign)
- sqft (living area number)
- beds (number)
- baths (number)
- yearBuilt (number if available)
- propertyType (house/condo/townhouse)
- renovationEvidence (any notes about condition, updates, renovations from listing)
- sourcePortal (Redfin/Zillow/Realtor)
- sourceUrl (actual URL of the listing)

Return ONLY a JSON array of real comps you actually found. If you cannot find real data, return an empty array []. Do NOT invent or estimate any values.

Format: [{"address":"...","saleDate":"...","salePrice":0,"sqft":0,"beds":0,"baths":0,"yearBuilt":0,"propertyType":"...","renovationEvidence":"...","sourcePortal":"...","sourceUrl":"..."}]`;
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 4000,
                    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
                    messages: [{ role: 'user', content: prompt }],
                }),
            });
            const data = await response.json();
            console.log('Anthropic ARV search status:', response.status, 'stop_reason:', data.stop_reason);
            const textBlocks = (data.content || []).filter((b) => b.type === 'text');
            const fullText = textBlocks.map((b) => b.text).join('');
            console.log('ARV search response preview:', fullText.substring(0, 300));
            const jsonMatch = fullText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const comps = JSON.parse(jsonMatch[0]);
                console.log(`Found ${comps.length} raw comps via web search`);
                return Array.isArray(comps) ? comps : [];
            }
            return [];
        }
        catch (e) {
            console.log('Anthropic web search error:', e.message);
            return [];
        }
    }
    normalizeComps(raw) {
        return raw.map(c => ({
            address: (c.address || '').trim(),
            saleDate: c.saleDate || '',
            salePrice: Number(c.salePrice) || 0,
            sqft: Number(c.sqft) || 0,
            beds: Number(c.beds) || 0,
            baths: Number(c.baths) || 0,
            yearBuilt: c.yearBuilt ? Number(c.yearBuilt) : undefined,
            lotSize: c.lotSize ? Number(c.lotSize) : undefined,
            propertyType: c.propertyType || 'SINGLE_FAMILY',
            subdivision: c.subdivision || undefined,
            renovationEvidence: c.renovationEvidence || undefined,
            sourcePortal: c.sourcePortal || 'Unknown',
            sourceUrl: c.sourceUrl || '',
            scrapedAt: c.scrapedAt || new Date().toISOString(),
        })).filter(c => c.salePrice > 0 && c.address);
    }
    detectSubjectConflicts(deal, comps) {
        const conflicts = [];
        if (!deal.sqft)
            conflicts.push('Subject sqft not verified — required for comp scoring');
        if (!deal.beds)
            conflicts.push('Subject beds not verified');
        if (!deal.zipCode)
            conflicts.push('Subject ZIP code missing — cannot validate location');
        return conflicts;
    }
    validateAndScoreComps(comps, subject, manualApprovals) {
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        return comps
            .map(comp => {
            const flags = [];
            const factors = {};
            let score = 0;
            const saleDate = new Date(comp.saleDate);
            if (isNaN(saleDate.getTime()) || saleDate < twelveMonthsAgo) {
                flags.push('OUTSIDE_12_MONTHS');
                return null;
            }
            const monthsAgo = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
            factors.recency = monthsAgo <= 3 ? 15 : monthsAgo <= 6 ? 12 : 8;
            score += factors.recency;
            const compZip = comp.address.match(/\d{5}/)?.[0];
            if (compZip !== subject.zipCode) {
                flags.push('ZIP_MISMATCH');
                return null;
            }
            let subdivisionProven = false;
            if (comp.subdivision && subject.city) {
                subdivisionProven = true;
                factors.subdivision = 30;
                score += 30;
            }
            else {
                flags.push('SUBDIVISION_UNVERIFIED');
                factors.subdivision = 0;
            }
            const approval = manualApprovals.find(a => comp.address.toLowerCase().includes(a.compAddress.toLowerCase()));
            if (approval) {
                subdivisionProven = true;
                flags.push('MANUALLY_APPROVED');
            }
            if (subject.sqft && comp.sqft) {
                const sqftDiff = Math.abs(comp.sqft - subject.sqft) / subject.sqft;
                if (sqftDiff > 0.40) {
                    flags.push('SQFT_MISMATCH_HIGH');
                    return null;
                }
                factors.sqft = sqftDiff <= 0.10 ? 20 : sqftDiff <= 0.20 ? 12 : 5;
                score += factors.sqft;
            }
            else {
                flags.push('SQFT_UNVERIFIED');
                factors.sqft = 0;
            }
            if (subject.beds && comp.beds) {
                const bedMatch = comp.beds === subject.beds;
                const bathMatch = Math.abs((comp.baths || 0) - (subject.baths || 0)) <= 0.5;
                factors.bedBath = bedMatch && bathMatch ? 15 : bedMatch || bathMatch ? 8 : 0;
                score += factors.bedBath;
                if (!bedMatch)
                    flags.push('BED_MISMATCH');
            }
            const subjectType = (subject.propertyType || 'SINGLE_FAMILY').toUpperCase();
            const compType = (comp.propertyType || 'SINGLE_FAMILY').toUpperCase();
            if (subjectType.includes('SINGLE') && !compType.includes('SINGLE') && !compType.includes('SFR') && !compType.includes('HOUSE')) {
                flags.push('PROPERTY_TYPE_MISMATCH');
                return null;
            }
            factors.propertyType = 10;
            score += 10;
            if (comp.renovationEvidence) {
                factors.renovation = 10;
                score += 10;
            }
            if (comp.salePrice < 10000 || comp.salePrice > 5000000) {
                flags.push('PRICE_OUTLIER');
                return null;
            }
            const psf = comp.sqft ? comp.salePrice / comp.sqft : 0;
            const subjectPsf = subject.sqft ? comp.salePrice / comp.sqft : 0;
            const weightedValue = subject.sqft && psf ? Math.round(psf * subject.sqft) : comp.salePrice;
            return {
                ...comp,
                confidenceScore: Math.min(100, score),
                confidenceFactors: factors,
                validationFlags: flags,
                subdivisionProven,
                manuallyApproved: !!approval,
                approvalNote: approval?.note,
                weightedValue,
            };
        })
            .filter((c) => c !== null)
            .sort((a, b) => b.confidenceScore - a.confidenceScore);
    }
    determineOutputState(comps, subject) {
        if (comps.length === 0)
            return 'INSUFFICIENT_DATA';
        if (comps.length < 2)
            return 'INSUFFICIENT_DATA';
        const avgScore = comps.reduce((a, c) => a + c.confidenceScore, 0) / comps.length;
        const subdivisionProvenCount = comps.filter(c => c.subdivisionProven).length;
        const highConfidenceCount = comps.filter(c => c.confidenceScore >= 65).length;
        const prices = comps.map(c => c.salePrice);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const variance = maxPrice / minPrice;
        if (variance > 2.5)
            return 'MANUAL_REVIEW_REQUIRED';
        if (comps.length >= 3 && subdivisionProvenCount >= 2 && highConfidenceCount >= 3 && avgScore >= 70) {
            return 'VERIFIED_ARV';
        }
        if (comps.length >= 2 && highConfidenceCount >= 2 && avgScore >= 50) {
            return subdivisionProvenCount >= 1 ? 'PRELIMINARY_ARV' : 'PRELIMINARY_ARV';
        }
        if (comps.length >= 2 && avgScore < 50)
            return 'WEAK_COMP_SET';
        return 'NEEDS_REVIEW';
    }
    calculateWeightedArv(comps) {
        if (comps.length === 0)
            return { low: null, median: null, high: null };
        const totalWeight = comps.reduce((a, c) => a + c.confidenceScore, 0);
        const weightedAvg = comps.reduce((a, c) => a + (c.weightedValue * c.confidenceScore), 0) / totalWeight;
        const values = comps.map(c => c.weightedValue).sort((a, b) => a - b);
        const low = Math.round(values[0] * 0.95);
        const high = Math.round(values[values.length - 1] * 1.02);
        const median = Math.round(weightedAvg);
        return { low, median, high };
    }
    async getAiNarrative(subject, comps, outputState, arvNumbers) {
        const prompt = `You are a real estate analyst reviewing validated comparable sales data. 
DO NOT generate or suggest ARV numbers — those are already calculated by the validation engine.
Your job is ONLY to:
1. Summarize the comp set quality
2. Explain adjustments and why certain comps are stronger
3. List risk flags the underwriter should know
4. Recommend next action based on output state: ${outputState}

Subject: ${subject.address} — ${subject.sqft}sqft, ${subject.beds}bd/${subject.baths}ba

Validated comps (${comps.length}):
${comps.map(c => `- ${c.address}: $${c.salePrice.toLocaleString()} (${c.saleDate}) — ${c.sqft}sqft — confidence: ${c.confidenceScore}/100 — flags: ${c.validationFlags.join(', ') || 'none'}`).join('\n')}

ARV range from engine: Low $${arvNumbers.low?.toLocaleString()} / Median $${arvNumbers.median?.toLocaleString()} / High $${arvNumbers.high?.toLocaleString()}

Return JSON only:
{
  "compSetSummary": "...",
  "adjustmentExplanation": "...",
  "riskFlags": ["..."],
  "recommendedNextAction": "...",
  "underwritingNote": "..."
}`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: 800,
        });
        try {
            return JSON.parse(response.choices[0].message.content || '{}');
        }
        catch (e) {
            return null;
        }
    }
    buildValidationLog(raw, validated) {
        return {
            totalScraped: raw.length,
            totalValidated: validated.length,
            rejectedCount: raw.length - validated.length,
            rejectionReasons: raw
                .filter(r => !validated.find(v => v.address === r.address))
                .map(r => ({ address: r.address, reason: 'Failed validation gate' })),
            avgConfidence: validated.length > 0
                ? Math.round(validated.reduce((a, c) => a + c.confidenceScore, 0) / validated.length)
                : 0,
        };
    }
};
exports.ArvEngineService = ArvEngineService;
exports.ArvEngineService = ArvEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ArvEngineService);
//# sourceMappingURL=arv-engine.service.js.map