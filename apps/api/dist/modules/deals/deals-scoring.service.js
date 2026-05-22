"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealsScoringService = void 0;
const common_1 = require("@nestjs/common");
let DealsScoringService = class DealsScoringService {
    calculateMetrics(deal) {
        const asking = deal.askingPrice || deal.buyerFacingPrice || 0;
        const arv = deal.arv || 0;
        const repairs = deal.repairEstimate || 0;
        const sqft = deal.sqft || 0;
        const rent = deal.rentEstimate || 0;
        const spread = arv > 0 ? arv - asking - repairs : 0;
        const seventyPercentRuleMax = arv > 0 ? (arv * 0.70) - repairs : 0;
        const pricePerSqft = sqft > 0 && asking > 0 ? asking / sqft : 0;
        const arvPerSqft = sqft > 0 && arv > 0 ? arv / sqft : 0;
        const rentToPriceRatio = asking > 0 && rent > 0 ? (rent / asking) * 100 : 0;
        const { score: dataCompletenessScore, missing, count: missingInfoCount } = this.calcDataCompleteness(deal);
        const dealPriorityScore = this.calcPriorityScore(deal, spread, dataCompletenessScore);
        const nextBestAction = this.calcNextBestAction(deal, missing, dealPriorityScore);
        const marketKey = this.buildMarketKey(deal);
        const { status: buyerCoverageStatus, gapScore: buyerGapScore, recommendation: marketBuyerNeedRecommendation } = this.calcBuyerCoverage(deal, dealPriorityScore);
        return {
            spread,
            seventyPercentRuleMax,
            pricePerSqft,
            arvPerSqft,
            rentToPriceRatio,
            dealPriorityScore,
            dataCompletenessScore,
            missingInfoCount,
            missingInfo: missing,
            nextBestAction,
            buyerCoverageStatus,
            buyerGapScore,
            marketKey,
            marketBuyerNeedRecommendation,
        };
    }
    calcDataCompleteness(deal) {
        const checks = [
            { field: 'address', label: 'Address', weight: 10 },
            { field: 'city', label: 'City', weight: 5 },
            { field: 'state', label: 'State', weight: 5 },
            { field: 'zipCode', label: 'ZIP Code', weight: 3 },
            { field: 'propertyType', label: 'Property type', weight: 5 },
            { field: 'beds', label: 'Beds', weight: 3 },
            { field: 'baths', label: 'Baths', weight: 3 },
            { field: 'sqft', label: 'Square footage', weight: 3 },
            { field: 'askingPrice', label: 'Asking price', weight: 10 },
            { field: 'arv', label: 'ARV', weight: 10 },
            { field: 'repairEstimate', label: 'Repair estimate', weight: 8 },
            { field: 'occupancy', label: 'Occupancy status', weight: 5, emptyValues: ['UNKNOWN', null, undefined, ''] },
            { field: 'overallCondition', label: 'Overall condition', weight: 5, emptyValues: ['UNKNOWN', null, undefined, ''] },
            { field: 'accessInfo', label: 'Access info', weight: 5 },
            { field: 'photosUrl', label: 'Photos', weight: 8 },
            { field: 'sourceName', label: 'Source contact', weight: 5 },
            { field: 'closingDate', label: 'Closing date', weight: 5 },
            { field: 'description', label: 'Description', weight: 2 },
        ];
        let totalWeight = 0;
        let earnedWeight = 0;
        const missing = [];
        for (const check of checks) {
            totalWeight += check.weight;
            const val = deal[check.field];
            const emptyVals = check.emptyValues || [null, undefined, ''];
            const isEmpty = emptyVals.includes(val) || val === null || val === undefined || val === '';
            if (!isEmpty) {
                earnedWeight += check.weight;
            }
            else {
                missing.push(check.label);
            }
        }
        const score = Math.round((earnedWeight / totalWeight) * 100);
        return { score, missing, count: missing.length };
    }
    calcPriorityScore(deal, spread, completeness) {
        let score = 0;
        if (spread > 100000)
            score += 30;
        else if (spread > 75000)
            score += 25;
        else if (spread > 50000)
            score += 20;
        else if (spread > 30000)
            score += 15;
        else if (spread > 15000)
            score += 8;
        else if (spread > 0)
            score += 3;
        score += Math.round(completeness * 0.20);
        const matched = deal.matchedBuyerCount || 0;
        const tier1 = deal.tier1MatchCount || 0;
        if (matched >= 20)
            score += 15;
        else if (matched >= 10)
            score += 10;
        else if (matched >= 5)
            score += 6;
        else if (matched >= 1)
            score += 3;
        if (tier1 >= 3)
            score += 5;
        else if (tier1 >= 1)
            score += 3;
        if (deal.photosUrl || deal.googleDriveUrl)
            score += 8;
        if (deal.accessInfo && deal.accessInfo !== 'UNKNOWN')
            score += 7;
        if (deal.occupancy && deal.occupancy !== 'UNKNOWN')
            score += 5;
        if (deal.closingDate) {
            const daysToClose = Math.floor((new Date(deal.closingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysToClose > 0 && daysToClose <= 14)
                score += 5;
            else if (daysToClose > 14 && daysToClose <= 30)
                score += 4;
            else if (daysToClose > 30 && daysToClose <= 60)
                score += 2;
        }
        if (deal.sourceType === 'OWN')
            score += 5;
        else if (deal.sourceType === 'JV')
            score += 4;
        else if (deal.sourceType === 'FACEBOOK')
            score += 3;
        else if (deal.sourceType === 'BIRD_DOG')
            score += 3;
        else
            score += 2;
        return Math.min(100, Math.max(0, score));
    }
    calcNextBestAction(deal, missing, priorityScore) {
        if (!deal.address && deal.rawInputText)
            return 'Parse Deal';
        if (missing.includes('ARV') || missing.includes('Asking price') || missing.includes('Property type')) {
            return 'Complete missing info';
        }
        if (missing.includes('Photos') || missing.includes('Access info')) {
            return 'Generate follow-up message';
        }
        if ((deal.matchedBuyerCount || 0) === 0 && priorityScore >= 40) {
            return 'Run buyer match';
        }
        if ((deal.matchedBuyerCount || 0) > 0 && deal.status === 'MATCHED') {
            return 'Generate buyer blast';
        }
        if (deal.status === 'READY_TO_BLAST')
            return 'Start campaign';
        if (deal.status === 'CAMPAIGN_ACTIVE')
            return 'Follow up with interested buyers';
        if (deal.status === 'OFFER_RECEIVED')
            return 'Review offers';
        if (priorityScore < 30)
            return 'Mark dead or reduce price';
        return 'Run buyer match';
    }
    buildMarketKey(deal) {
        if (deal.zipCode && deal.state)
            return `${deal.zipCode}, ${deal.state}`;
        if (deal.city && deal.state)
            return `${deal.city}, ${deal.state}`;
        return deal.state || 'Unknown';
    }
    calcBuyerCoverage(deal, priorityScore) {
        const matched = deal.matchedBuyerCount || 0;
        const tier1 = deal.tier1MatchCount || 0;
        const buyerDemand = deal.buyerDemandScore || 0;
        const gapScore = Math.max(0, Math.min(100, priorityScore - (matched * 3) - (tier1 * 5) - (buyerDemand * 0.2)));
        let status;
        if (matched >= 15 && tier1 >= 3)
            status = 'Strong Coverage';
        else if (matched >= 8 || tier1 >= 1)
            status = 'Moderate Coverage';
        else if (matched >= 1)
            status = 'Weak Coverage';
        else
            status = 'Buyer Gap';
        const city = deal.city || 'this market';
        const state = deal.state || '';
        const dealType = deal.dealType || deal.propertyType || 'deals';
        const condition = deal.overallCondition || '';
        let recommendation = '';
        if (status === 'Buyer Gap' || status === 'Weak Coverage') {
            recommendation = `Find more ${city}${state ? ', ' + state : ''} buyers`;
            if (condition === 'HEAVY_REHAB' || condition === 'FULL_GUT') {
                recommendation += ' comfortable with heavy rehab';
            }
            if (dealType === 'SUBTO' || dealType === 'CREATIVE') {
                recommendation += ' interested in creative finance / Subject-To deals';
            }
            else if (dealType === 'RENTAL' || dealType === 'BRRRR') {
                recommendation += ' — target landlords, Section 8, and buy-and-hold investors';
            }
            else {
                recommendation += ' — target cash buyers and fix-and-flip investors';
            }
        }
        return { status, gapScore, recommendation };
    }
    getPriorityLabel(score) {
        if (score >= 90)
            return { label: 'Hot', color: 'text-red-400' };
        if (score >= 75)
            return { label: 'Strong', color: 'text-orange-400' };
        if (score >= 60)
            return { label: 'Workable', color: 'text-yellow-400' };
        if (score >= 40)
            return { label: 'Needs Info', color: 'text-blue-400' };
        return { label: 'Weak', color: 'text-gray-400' };
    }
};
exports.DealsScoringService = DealsScoringService;
exports.DealsScoringService = DealsScoringService = __decorate([
    (0, common_1.Injectable)()
], DealsScoringService);
//# sourceMappingURL=deals-scoring.service.js.map