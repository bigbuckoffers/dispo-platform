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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuyersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const decorators_1 = require("../../shared/decorators");
const buyers_service_1 = require("./buyers.service");
const create_buyer_dto_1 = require("./dto/create-buyer.dto");
const update_buyer_dto_1 = require("./dto/update-buyer.dto");
const update_buy_box_dto_1 = require("./dto/update-buy-box.dto");
const list_buyers_dto_1 = require("./dto/list-buyers.dto");
let BuyersController = class BuyersController {
    constructor(buyersService) {
        this.buyersService = buyersService;
    }
    findAll(orgId, query) {
        return this.buyersService.findAll(orgId, query);
    }
    create(orgId, userId, dto) {
        return this.buyersService.create(orgId, userId, dto);
    }
    getTopBuyers(orgId, limit = 20) {
        return this.buyersService.getTopBuyers(orgId, +limit);
    }
    findOne(orgId, id) {
        return this.buyersService.findOne(orgId, id);
    }
    update(orgId, id, dto, userId) {
        return this.buyersService.update(orgId, id, dto, userId);
    }
    getScores(orgId, id) {
        return this.buyersService.getScores(orgId, id);
    }
    recalculateScores(orgId, id) {
        return this.buyersService.recalculateScores(orgId, id);
    }
    getBuyBox(orgId, id) {
        return this.buyersService.getBuyBox(orgId, id);
    }
    updateBuyBox(orgId, id, dto, userId) {
        return this.buyersService.updateBuyBox(orgId, id, dto, userId);
    }
    getRealBuyBox(orgId, id) {
        return this.buyersService.getRealBuyBox(orgId, id);
    }
    getActivity(orgId, id, days = 30) {
        return this.buyersService.getActivityTimeline(orgId, id, +days);
    }
    getAnalytics(orgId, id) {
        return this.buyersService.getAnalytics(orgId, id);
    }
    updateTier(orgId, id, tier, userId) {
        return this.buyersService.updateTier(orgId, id, tier, userId);
    }
    suspend(orgId, id, reason, userId) {
        return this.buyersService.suspend(orgId, id, reason, userId);
    }
    remove(orgId, id, userId) {
        return this.buyersService.remove(orgId, id, userId);
    }
};
exports.BuyersController = BuyersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List buyers with filtering, sorting, pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'tier', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_buyers_dto_1.ListBuyersDto]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new buyer profile' }),
    (0, decorators_1.Roles)(client_1.TeamRole.DISPO_REP, client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, decorators_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_buyer_dto_1.CreateBuyerDto]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('top-matched'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top buyers by composite score' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "getTopBuyers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get full buyer profile' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, decorators_1.Roles)(client_1.TeamRole.DISPO_REP, client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, swagger_1.ApiOperation)({ summary: 'Update buyer profile' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, decorators_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_buyer_dto_1.UpdateBuyerDto, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/scores'),
    (0, swagger_1.ApiOperation)({ summary: 'Get buyer reliability, liquidity, activity scores + history' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "getScores", null);
__decorate([
    (0, common_1.Post)(':id/recalculate-scores'),
    (0, decorators_1.Roles)(client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, swagger_1.ApiOperation)({ summary: 'Force recalculate all scores for a buyer' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "recalculateScores", null);
__decorate([
    (0, common_1.Get)(':id/buy-box'),
    (0, swagger_1.ApiOperation)({ summary: 'Get stated buy box' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "getBuyBox", null);
__decorate([
    (0, common_1.Put)(':id/buy-box'),
    (0, swagger_1.ApiOperation)({ summary: 'Update buyer buy box' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, decorators_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_buy_box_dto_1.UpdateBuyBoxDto, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "updateBuyBox", null);
__decorate([
    (0, common_1.Get)(':id/real-buy-box'),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI-learned real buy box vs stated buy box' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "getRealBuyBox", null);
__decorate([
    (0, common_1.Get)(':id/activity'),
    (0, swagger_1.ApiOperation)({ summary: 'Get buyer activity timeline' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "getActivity", null);
__decorate([
    (0, common_1.Get)(':id/analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Full buyer analytics: close rate, ghosting %, avg fees, etc.' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Patch)(':id/tier'),
    (0, decorators_1.Roles)(client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, swagger_1.ApiOperation)({ summary: 'Manually update buyer tier' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)('tier')),
    __param(3, (0, decorators_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "updateTier", null);
__decorate([
    (0, common_1.Patch)(':id/suspend'),
    (0, decorators_1.Roles)(client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend a buyer' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)('reason')),
    __param(3, (0, decorators_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "suspend", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, decorators_1.Roles)(client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete buyer (soft delete)' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, decorators_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], BuyersController.prototype, "remove", null);
exports.BuyersController = BuyersController = __decorate([
    (0, swagger_1.ApiTags)('buyers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('buyers'),
    __metadata("design:paramtypes", [buyers_service_1.BuyersService])
], BuyersController);
//# sourceMappingURL=buyers.controller.js.map