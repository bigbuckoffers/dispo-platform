"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealsModule = void 0;
const common_1 = require("@nestjs/common");
const deals_controller_1 = require("./deals.controller");
const deals_service_1 = require("./deals.service");
const deals_scoring_service_1 = require("./deals-scoring.service");
const deals_ai_parser_service_1 = require("./deals-ai-parser.service");
const matching_module_1 = require("../matching/matching.module");
const ai_module_1 = require("../ai/ai.module");
let DealsModule = class DealsModule {
};
exports.DealsModule = DealsModule;
exports.DealsModule = DealsModule = __decorate([
    (0, common_1.Module)({
        imports: [matching_module_1.MatchingModule, ai_module_1.AiModule],
        controllers: [deals_controller_1.DealsController],
        providers: [deals_service_1.DealsService, deals_scoring_service_1.DealsScoringService, deals_ai_parser_service_1.DealsAiParserService],
        exports: [deals_service_1.DealsService, deals_scoring_service_1.DealsScoringService],
    })
], DealsModule);
//# sourceMappingURL=deals.module.js.map