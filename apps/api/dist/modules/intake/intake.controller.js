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
exports.IntakeController = void 0;
const common_1 = require("@nestjs/common");
const intake_service_1 = require("./intake.service");
let IntakeController = class IntakeController {
    constructor(intakeService) {
        this.intakeService = intakeService;
    }
    getBuyerByToken(token) {
        return this.intakeService.getBuyerByToken(token);
    }
    submitIntake(token, data) {
        return this.intakeService.submitIntake(token, data);
    }
    generateToken(buyerId) {
        return this.intakeService.generateToken(buyerId);
    }
    generateBulkTokens(body) {
        return this.intakeService.generateBulkTokens(body.orgId || 'c87f4e63-fd29-4ff5-823f-e4926daa0820');
    }
    getPendingSubmissions(orgId) {
        return this.intakeService.getPendingSubmissions(orgId || 'c87f4e63-fd29-4ff5-823f-e4926daa0820');
    }
    approveSubmission(id, body) {
        return this.intakeService.approveSubmission(id, body);
    }
    trackEvent(token, body) {
        return this.intakeService.trackEvent(token, body.event, body.metadata || {});
    }
    rejectSubmission(id) {
        return this.intakeService.rejectSubmission(id);
    }
};
exports.IntakeController = IntakeController;
__decorate([
    (0, common_1.Get)('token/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntakeController.prototype, "getBuyerByToken", null);
__decorate([
    (0, common_1.Post)('token/:token/submit'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], IntakeController.prototype, "submitIntake", null);
__decorate([
    (0, common_1.Post)('generate/:buyerId'),
    __param(0, (0, common_1.Param)('buyerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntakeController.prototype, "generateToken", null);
__decorate([
    (0, common_1.Post)('generate-bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntakeController.prototype, "generateBulkTokens", null);
__decorate([
    (0, common_1.Get)('submissions'),
    __param(0, (0, common_1.Query)('orgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntakeController.prototype, "getPendingSubmissions", null);
__decorate([
    (0, common_1.Post)('submissions/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], IntakeController.prototype, "approveSubmission", null);
__decorate([
    (0, common_1.Post)('token/:token/track'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], IntakeController.prototype, "trackEvent", null);
__decorate([
    (0, common_1.Post)('submissions/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntakeController.prototype, "rejectSubmission", null);
exports.IntakeController = IntakeController = __decorate([
    (0, common_1.Controller)('intake'),
    __metadata("design:paramtypes", [intake_service_1.IntakeService])
], IntakeController);
//# sourceMappingURL=intake.controller.js.map