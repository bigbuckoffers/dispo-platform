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
        let priorityScore = 0;
        let completeness = 0;
        if (deal.address)
            completeness += 3;
        else
            missing.push('Address');
        if (deal.propertyType)
            completeness += 2;
        else
            missing.push('Property type');
        if (deal.askingPrice)
            completeness += 4;
        else
            missing.push('Asking price');
        if (deal.beds && deal.baths)
            completeness += 2;
        else
            missing.push('Beds/baths');
        if (deal.sqft)
            completeness += 1;
        if (deal.overallCondition && deal.overallCondition !== 'UNKNOWN')
            completeness += 2;
        if (deal.occupancy && deal.occupancy !== 'UNKNOWN')
            completeness += 1;
        if (deal.accessInfo)
            completeness += 2;
        else
            missing.push('Access info');
        if (deal.description)
            completeness += 1;
        if (deal.repairEstimate)
            completeness += 2;
        const dataCompletenessScore = Math.min(100, Math.round((completeness / 20) * 100));
        priorityScore += Math.round((completeness / 20) * 20);
        const hasAnyPublicEstimate = !!(deal.zillowEstimate || deal.realtorEstimate ||
            deal.redfinEstimate || deal.rentcastEstimate);
        const hasArv = !!(deal.arv && deal.arv > 0);
        if (hasArv) {
            priorityScore += 10;
        }
        else if (hasAnyPublicEstimate) {
            priorityScore += 8;
            missing.push('ARV (using public estimates)');
        }
        else {
            missing.push('ARV or public estimate (Zillow/Redfin/Realtor)');
        }
        if (deal.askingPrice && (hasArv || hasAnyPublicEstimate)) {
            const refValue = deal.arv ||
                [deal.zillowEstimate, deal.realtorEstimate, deal.redfinEstimate, deal.rentcastEstimate]
                    .filter(Boolean).reduce((a, b) => a + b, 0) /
                    [deal.zillowEstimate, deal.realtorEstimate, deal.redfinEstimate, deal.rentcastEstimate]
                        .filter(Boolean).length;
            if (refValue > 0) {
                const ratio = deal.askingPrice / refValue;
                if (ratio <= 0.65)
                    priorityScore += 5;
                else if (ratio <= 0.75)
                    priorityScore += 3;
                else if (ratio <= 0.85)
                    priorityScore += 1;
            }
        }
        const hasPhotos = !!(deal.photosUrl || deal.googleDriveUrl ||
            (deal.photos && deal.photos.length > 0));
        if (hasPhotos) {
            priorityScore += 12;
        }
        else {
            missing.push('Photos');
        }
        if (deal.accessInfo)
            priorityScore += 5;
        if (deal.description)
            priorityScore += 3;
        const buyers = deal.matchedBuyerCount || 0;
        const tier1 = deal.tier1MatchCount || 0;
        const demandScore = deal.buyerDemandScore || 0;
        if (buyers >= 20)
            priorityScore += 10;
        else if (buyers >= 10)
            priorityScore += 7;
        else if (buyers >= 5)
            priorityScore += 5;
        else if (buyers >= 1)
            priorityScore += 3;
        if (tier1 >= 5)
            priorityScore += 5;
        else if (tier1 >= 2)
            priorityScore += 3;
        else if (tier1 >= 1)
            priorityScore += 2;
        if (demandScore >= 70)
            priorityScore += 5;
        else if (demandScore >= 40)
            priorityScore += 3;
        const ownDeal = deal.sourceType === 'OWN';
        if (ownDeal) {
            priorityScore += 8;
        }
        else if (deal.sourceReliabilityScore) {
            const srcScore = deal.sourceReliabilityScore;
            if (deal.sourceReliabilityLabel === 'BLACKLIST') {
                priorityScore -= 20;
            }
            else if (srcScore >= 75) {
                priorityScore += 10;
            }
            else if (srcScore >= 60) {
                priorityScore += 7;
            }
            else if (srcScore >= 40) {
                priorityScore += 5;
            }
            else if (srcScore >= 20) {
                priorityScore += 2;
            }
            else {
                priorityScore -= 5;
            }
        }
        else {
            priorityScore += 4;
        }
        if (deal.dealType === 'SUBTO')
            priorityScore += 5;
        else if (deal.dealType === 'WHOLESALE')
            priorityScore += 4;
        else if (deal.dealType === 'OWNER_FINANCE')
            priorityScore += 4;
        else if (deal.dealType === 'NOVATION')
            priorityScore += 3;
        if (deal.closingDate || deal.assignmentDeadline) {
            const deadline = deal.assignmentDeadline || deal.closingDate;
            const daysLeft = deadline
                ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
            if (daysLeft !== null) {
                if (daysLeft <= 7)
                    priorityScore += 5;
                else if (daysLeft <= 14)
                    priorityScore += 3;
                else if (daysLeft <= 30)
                    priorityScore += 2;
            }
        }
        if (deal.vacantAtClose === 'YES')
            priorityScore += 3;
        if (deal.financingAllowed === 'HARD_MONEY_OK')
            priorityScore += 2;
        if (deal.rentEstimate && deal.rentEstimate > 0)
            priorityScore += 2;
        priorityScore = Math.max(0, Math.min(100, priorityScore));
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
        else if (!hasPhotos || !deal.accessInfo) {
            nextBestAction = 'Request photos and access info';
        }
        else if (!hasAnyPublicEstimate && !hasArv) {
            nextBestAction = 'Add public estimates (Zillow/Redfin/Realtor)';
        }
        else if (buyers === 0) {
            nextBestAction = 'Run buyer match';
        }
        else if (buyerCoverageStatus === 'Buyer Gap' && priorityScore >= 60) {
            nextBestAction = 'Find buyers for this market';
        }
        else if (buyers > 0 && !hasPhotos) {
            nextBestAction = 'Get photos before blasting';
        }
        else if (buyers > 0 && hasPhotos) {
            nextBestAction = 'Generate buyer blast';
        }
        else {
            nextBestAction = 'Run buyer match';
        }
        const marketKey = deal.city && deal.state
            ? `${deal.city}, ${deal.state}`
            : deal.state || '';
        return {
            dealPriorityScore: priorityScore,
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