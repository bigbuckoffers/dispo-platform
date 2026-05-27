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
        const missing = [];
        let score = 0;
        const pubEstimates = [deal.zillowEstimate, deal.realtorEstimate, deal.redfinEstimate, deal.rentcastEstimate].filter(Boolean);
        const avgPub = pubEstimates.length > 0 ? pubEstimates.reduce((a, b) => a + b, 0) / pubEstimates.length : 0;
        const refValue = deal.arv || avgPub || 0;
        const hasArv = !!(deal.arv && deal.arv > 0);
        const hasAnyPublicEstimate = pubEstimates.length > 0;
        let avmConfidence = 1.0;
        if (!hasArv && pubEstimates.length === 1)
            avmConfidence = 0.75;
        if (!hasArv && pubEstimates.length === 0)
            avmConfidence = 0.0;
        if (hasArv && pubEstimates.length >= 2)
            avmConfidence = 1.0;
        if (hasArv && pubEstimates.length === 0)
            avmConfidence = 0.85;
        if (deal.askingPrice && refValue > 0) {
            const ratio = deal.askingPrice / refValue;
            let discountPts = 0;
            if (ratio <= 0.65)
                discountPts = 30;
            else if (ratio <= 0.70)
                discountPts = 27;
            else if (ratio <= 0.75)
                discountPts = 22;
            else if (ratio <= 0.80)
                discountPts = 15;
            else if (ratio <= 0.85)
                discountPts = 8;
            else if (ratio <= 0.90)
                discountPts = 3;
            else
                discountPts = 0;
            score += Math.round(discountPts * avmConfidence);
        }
        else {
            if (!deal.askingPrice)
                missing.push('Asking price');
            if (!hasAnyPublicEstimate && !hasArv)
                missing.push('ARV or public value estimate');
        }
        const hasPhotos = !!(deal.photosUrl || deal.googleDriveUrl || (deal.photos && deal.photos.length > 0));
        const photoCount = deal.photos?.length || 0;
        const hasRepairEstimate = !!(deal.repairEstimate && deal.repairEstimate >= 0);
        const conditionKnown = !!(deal.overallCondition && deal.overallCondition !== 'UNKNOWN');
        let repairPts = 0;
        if (hasRepairEstimate && hasPhotos && conditionKnown) {
            repairPts = 15;
        }
        else if (hasRepairEstimate && (hasPhotos || conditionKnown)) {
            repairPts = 11;
        }
        else if (hasRepairEstimate) {
            repairPts = 7;
        }
        else if (conditionKnown) {
            repairPts = 4;
        }
        else {
            repairPts = 0;
            missing.push('Repair estimate');
        }
        score += repairPts;
        let exitPts = 0;
        const dealType = deal.dealType || '';
        const condition = deal.overallCondition || '';
        const hasRent = !!(deal.rentEstimate && deal.rentEstimate > 0);
        let exits = 0;
        if (['WHOLESALE', 'SUBTO', 'OWNER_FINANCE', 'NOVATION'].includes(dealType))
            exits++;
        if (deal.financingAllowed === 'HARD_MONEY_OK')
            exits++;
        if (hasRent)
            exits++;
        if (['TURNKEY', 'LIGHT_REHAB', 'COSMETIC'].includes(condition))
            exits++;
        if (deal.vacantAtClose === 'YES')
            exits++;
        if (dealType === 'SUBTO')
            exits += 2;
        exitPts = Math.min(10, exits * 2);
        score += exitPts;
        const buyers = deal.matchedBuyerCount || 0;
        const tier1 = deal.tier1MatchCount || 0;
        const demandScore = deal.buyerDemandScore || 0;
        let demandPts = 0;
        if (buyers >= 20 || tier1 >= 5)
            demandPts = 10;
        else if (buyers >= 10 || tier1 >= 3)
            demandPts = 8;
        else if (buyers >= 5 || tier1 >= 1)
            demandPts = 5;
        else if (buyers >= 1)
            demandPts = 3;
        else
            demandPts = 0;
        if (demandScore >= 70)
            demandPts = Math.min(10, demandPts + 2);
        score += demandPts;
        let sourcePts = 0;
        if (deal.sourceType === 'OWN') {
            sourcePts = 10;
        }
        else if (deal.sourceReliabilityLabel === 'BLACKLIST') {
            score -= 25;
            sourcePts = 0;
        }
        else if (deal.sourceReliabilityScore) {
            const s = deal.sourceReliabilityScore;
            if (s >= 80)
                sourcePts = 10;
            else if (s >= 65)
                sourcePts = 8;
            else if (s >= 50)
                sourcePts = 6;
            else if (s >= 35)
                sourcePts = 4;
            else if (s >= 20)
                sourcePts = 2;
            else
                sourcePts = 0;
        }
        else {
            sourcePts = 5;
        }
        score += sourcePts;
        let completeness = 0;
        if (deal.address)
            completeness += 2;
        else
            missing.push('Address');
        if (deal.propertyType)
            completeness += 1;
        else
            missing.push('Property type');
        if (deal.beds && deal.baths)
            completeness += 2;
        else
            missing.push('Beds/baths');
        if (deal.sqft)
            completeness += 1;
        if (deal.occupancy && deal.occupancy !== 'UNKNOWN')
            completeness += 1;
        if (deal.accessInfo)
            completeness += 2;
        else
            missing.push('Access info');
        if (deal.description)
            completeness += 1;
        const dataCompletenessScore = Math.min(100, Math.round((completeness / 10) * 100));
        score += completeness;
        if (dealType === 'SUBTO')
            score += 5;
        else if (dealType === 'WHOLESALE')
            score += 4;
        else if (dealType === 'OWNER_FINANCE')
            score += 4;
        else if (dealType === 'NOVATION')
            score += 3;
        else
            score += 2;
        const deadline = deal.assignmentDeadline || deal.closingDate;
        if (deadline) {
            const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 7)
                score += 5;
            else if (daysLeft <= 14)
                score += 4;
            else if (daysLeft <= 21)
                score += 3;
            else if (daysLeft <= 30)
                score += 2;
            else
                score += 1;
        }
        if (deal.vacantAtClose === 'YES')
            score += 2;
        if (deal.financingAllowed === 'HARD_MONEY_OK')
            score += 1;
        if (hasRent)
            score += 2;
        const dealPriorityScore = Math.max(0, Math.min(100, score));
        let buyerCoverageStatus = 'No Coverage';
        let buyerGapScore = 100;
        if (buyers >= 15 && tier1 >= 3) {
            buyerCoverageStatus = 'Strong Coverage';
            buyerGapScore = 0;
        }
        else if (buyers >= 8 || tier1 >= 2) {
            buyerCoverageStatus = 'Moderate Coverage';
            buyerGapScore = 30;
        }
        else if (buyers >= 3) {
            buyerCoverageStatus = 'Weak Coverage';
            buyerGapScore = 60;
        }
        else if (buyers >= 1) {
            buyerCoverageStatus = 'Minimal Coverage';
            buyerGapScore = 75;
        }
        else {
            buyerCoverageStatus = 'Buyer Gap';
            buyerGapScore = 100;
        }
        let nextBestAction = '';
        if (deal.sourceReliabilityLabel === 'BLACKLIST') {
            nextBestAction = 'Source blacklisted — do not work';
        }
        else if (!deal.address || !deal.askingPrice || !deal.propertyType) {
            nextBestAction = 'Complete missing info';
        }
        else if (!hasAnyPublicEstimate && !hasArv) {
            nextBestAction = 'Add public value estimate';
        }
        else if (!hasPhotos) {
            nextBestAction = 'Request photos';
        }
        else if (!deal.accessInfo) {
            nextBestAction = 'Get access info';
        }
        else if (buyers === 0) {
            nextBestAction = 'Run buyer match';
        }
        else if (buyerCoverageStatus === 'Buyer Gap' && dealPriorityScore >= 55) {
            nextBestAction = 'Find buyers for this market';
        }
        else if (buyers > 0 && hasPhotos) {
            nextBestAction = 'Send buyer blast';
        }
        else {
            nextBestAction = 'Run buyer match';
        }
        const marketKey = deal.city && deal.state ? `${deal.city}, ${deal.state}` : deal.state || '';
        return {
            dealPriorityScore,
            buyerDemandScore: demandScore,
            dataCompletenessScore,
            missingInfo: missing,
            missingInfoCount: missing.length,
            nextBestAction,
            buyerCoverageStatus,
            buyerGapScore,
            marketKey,
        };
    }
};
exports.DealsScoringService = DealsScoringService;
exports.DealsScoringService = DealsScoringService = __decorate([
    (0, common_1.Injectable)()
], DealsScoringService);
//# sourceMappingURL=deals-scoring.service.js.map