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
exports.DealSourcesController = void 0;
const common_1 = require("@nestjs/common");
const deal_sources_service_1 = require("./deal-sources.service");
let DealSourcesController = class DealSourcesController {
    constructor(svc) {
        this.svc = svc;
    }
    async findAll(orgId) {
        const org = orgId || await this.svc.getDefaultOrgId();
        return this.svc.findAll(org);
    }
    findOne(id) {
        return this.svc.findOne(id);
    }
    async create(body) {
        const orgId = body.organizationId || await this.svc.getDefaultOrgId();
        return this.svc.findOrCreate(orgId, body);
    }
    update(id, body) {
        return this.svc.update(id, body);
    }
    recalculate(id) {
        return this.svc.recalculateScore(id);
    }
};
exports.DealSourcesController = DealSourcesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('orgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DealSourcesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DealSourcesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DealSourcesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DealSourcesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/recalculate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DealSourcesController.prototype, "recalculate", null);
exports.DealSourcesController = DealSourcesController = __decorate([
    (0, common_1.Controller)('api/v1/sources'),
    __metadata("design:paramtypes", [deal_sources_service_1.DealSourcesService])
], DealSourcesController);
//# sourceMappingURL=deal-sources.controller.js.map