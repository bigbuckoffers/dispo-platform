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
exports.DispoController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const decorators_1 = require("../../shared/decorators");
const dispo_service_1 = require("./dispo.service");
let DispoController = class DispoController {
    constructor(dispoService) {
        this.dispoService = dispoService;
    }
    getCampaigns(orgId, dealId) {
        return this.dispoService.getOrgCampaigns(orgId, dealId);
    }
    getCampaignStats(id) {
        return this.dispoService.getCampaignStats(id);
    }
    handleTwilioWebhook(body) {
        return this.dispoService.handleTwilioWebhook(body);
    }
};
exports.DispoController = DispoController;
__decorate([
    (0, common_1.Get)('campaigns'),
    __param(0, (0, decorators_1.OrgId)()),
    __param(1, (0, common_1.Query)('dealId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DispoController.prototype, "getCampaigns", null);
__decorate([
    (0, common_1.Get)('campaigns/:id/stats'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DispoController.prototype, "getCampaignStats", null);
__decorate([
    (0, common_1.Post)('webhooks/twilio'),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DispoController.prototype, "handleTwilioWebhook", null);
exports.DispoController = DispoController = __decorate([
    (0, swagger_1.ApiTags)('dispo'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('dispo'),
    __metadata("design:paramtypes", [dispo_service_1.DispoService])
], DispoController);
//# sourceMappingURL=dispo.controller.js.map