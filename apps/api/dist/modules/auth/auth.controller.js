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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const svix_1 = require("svix");
const config_1 = require("@nestjs/config");
const decorators_1 = require("../../shared/decorators");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const auth_service_1 = require("./auth.service");
let AuthController = class AuthController {
    constructor(authService, config) {
        this.authService = authService;
        this.config = config;
    }
    getProfile(userId) {
        return this.authService.getProfile(userId);
    }
    async handleClerkWebhook(req, svixId, svixTimestamp, svixSignature, body) {
        const secret = this.config.get('CLERK_WEBHOOK_SECRET');
        if (secret) {
            const wh = new svix_1.Webhook(secret);
            try {
                wh.verify(JSON.stringify(body), {
                    'svix-id': svixId,
                    'svix-timestamp': svixTimestamp,
                    'svix-signature': svixSignature,
                });
            }
            catch {
                return { error: 'Invalid signature' };
            }
        }
        if (body.type === 'user.created') {
            await this.authService.syncUserFromClerk(body.data);
        }
        return { received: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, decorators_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)('webhooks/clerk'),
    (0, decorators_1.Public)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('svix-id')),
    __param(2, (0, common_1.Headers)('svix-timestamp')),
    __param(3, (0, common_1.Headers)('svix-signature')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "handleClerkWebhook", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map