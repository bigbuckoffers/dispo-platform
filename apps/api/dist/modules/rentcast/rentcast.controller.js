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
exports.RentCastController = void 0;
const common_1 = require("@nestjs/common");
const rentcast_service_1 = require("./rentcast.service");
let RentCastController = class RentCastController {
    constructor(svc) {
        this.svc = svc;
    }
    getUsage() { return this.svc.getUsage(); }
    async estimate(b) {
        const usage = this.svc.getUsage();
        if (usage.status === 'limit_reached')
            return { error: 'limit_reached', message: usage.message, usage };
        const value = await this.svc.getValueEstimate(b.address, b.city, b.state, b.zipCode, b.beds, b.baths, b.sqft, b.propertyType);
        return { value, usage: this.svc.getUsage() };
    }
};
exports.RentCastController = RentCastController;
__decorate([
    (0, common_1.Get)('usage'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RentCastController.prototype, "getUsage", null);
__decorate([
    (0, common_1.Post)('estimate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RentCastController.prototype, "estimate", null);
exports.RentCastController = RentCastController = __decorate([
    (0, common_1.Controller)('api/v1/rentcast'),
    __metadata("design:paramtypes", [rentcast_service_1.RentCastService])
], RentCastController);
//# sourceMappingURL=rentcast.controller.js.map