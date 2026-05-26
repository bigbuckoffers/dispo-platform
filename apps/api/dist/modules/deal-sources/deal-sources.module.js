"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealSourcesModule = void 0;
const common_1 = require("@nestjs/common");
const deal_sources_service_1 = require("./deal-sources.service");
const deal_sources_controller_1 = require("./deal-sources.controller");
const prisma_module_1 = require("../../shared/prisma/prisma.module");
let DealSourcesModule = class DealSourcesModule {
};
exports.DealSourcesModule = DealSourcesModule;
exports.DealSourcesModule = DealSourcesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [deal_sources_controller_1.DealSourcesController],
        providers: [deal_sources_service_1.DealSourcesService],
        exports: [deal_sources_service_1.DealSourcesService],
    })
], DealSourcesModule);
//# sourceMappingURL=deal-sources.module.js.map