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
exports.DealsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const decorators_1 = require("../../shared/decorators");
const deals_service_1 = require("./deals.service");
const create_deal_dto_1 = require("./dto/create-deal.dto");
let DealsController = class DealsController {
    constructor(dealsService) {
        this.dealsService = dealsService;
    }
    findAll(orgId, query) {
        return this.dealsService.findAll(orgId, query);
    }
    create(orgId, userId, dto) {
        return this.dealsService.create(orgId, userId, dto);
    }
    findOne(orgId, id) {
        return this.dealsService.findOne(orgId, id);
    }
    update(orgId, id, dto, userId) {
        return this.dealsService.update(orgId, id, dto, userId);
    }
    getMatches(orgId, id, limit = 25) {
        return this.dealsService.getMatches(orgId, id, +limit);
    }
    triggerMatching(orgId, id) {
        return this.dealsService.triggerMatching(orgId, id);
    }
    release(orgId, id, body, userId) {
        return this.dealsService.releaseToDealTier(orgId, id, body.tier, userId);
    }
    generateCampaign(orgId, id, body) {
        return this.dealsService.generateAiCampaign(orgId, id, body.tier);
    }
    updateStatus(orgId, id, status, userId) {
        return this.dealsService.updateStatus(orgId, id, status, userId);
    }
    remove(orgId, id) {
        return this.dealsService.remove(orgId, id);
    }
};
exports.DealsController = DealsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, decorators_1.Roles)(client_1.TeamRole.ACQUISITIONS_REP, client_1.TeamRole.DISPO_REP, client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, swagger_1.ApiOperation)({ summary: 'Create deal — triggers AI property analysis automatically' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, decorators_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_deal_dto_1.CreateDealDto]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, decorators_1.Roles)(client_1.TeamRole.DISPO_REP, client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, decorators_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/matches'),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI-ranked buyer matches for this deal' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "getMatches", null);
__decorate([
    (0, common_1.Post)(':id/trigger-matching'),
    (0, decorators_1.Roles)(client_1.TeamRole.DISPO_REP, client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, swagger_1.ApiOperation)({ summary: 'Queue AI matching job for this deal' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "triggerMatching", null);
__decorate([
    (0, common_1.Post)(':id/release'),
    (0, decorators_1.Roles)(client_1.TeamRole.DISPO_REP, client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, swagger_1.ApiOperation)({ summary: 'Release deal to a buyer tier (1, 2, or 3)' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, decorators_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "release", null);
__decorate([
    (0, common_1.Post)(':id/generate-campaign'),
    (0, decorators_1.Roles)(client_1.TeamRole.DISPO_REP, client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, swagger_1.ApiOperation)({ summary: 'AI-generate SMS + email campaign for this deal' }),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "generateCampaign", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, decorators_1.Roles)(client_1.TeamRole.DISPO_REP, client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)('status')),
    __param(3, (0, decorators_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, decorators_1.Roles)(client_1.TeamRole.ADMIN, client_1.TeamRole.OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "remove", null);
exports.DealsController = DealsController = __decorate([
    (0, swagger_1.ApiTags)('deals'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('deals'),
    __metadata("design:paramtypes", [deals_service_1.DealsService])
], DealsController);
//# sourceMappingURL=deals.controller.js.map