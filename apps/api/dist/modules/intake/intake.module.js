"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntakeModule = void 0;
const common_1 = require("@nestjs/common");
const intake_service_1 = require("./intake.service");
const intake_controller_1 = require("./intake.controller");
const prisma_module_1 = require("../../shared/prisma/prisma.module");
const notifications_module_1 = require("../notifications/notifications.module");
let IntakeModule = class IntakeModule {
};
exports.IntakeModule = IntakeModule;
exports.IntakeModule = IntakeModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, notifications_module_1.NotificationsModule],
        controllers: [intake_controller_1.IntakeController],
        providers: [intake_service_1.IntakeService],
        exports: [intake_service_1.IntakeService],
    })
], IntakeModule);
//# sourceMappingURL=intake.module.js.map