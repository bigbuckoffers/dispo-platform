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
exports.PlacesController = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const GKEY = 'AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s';
let PlacesController = class PlacesController {
    async autocomplete(input) {
        if (!input || input.length < 3)
            return { predictions: [] };
        try {
            const res = await axios_1.default.post(`https://places.googleapis.com/v1/places:autocomplete?key=${GKEY}`, { input, includedRegionCodes: ['us'] }, { headers: { 'Content-Type': 'application/json' } });
            const suggestions = (res.data.suggestions || []).map((s) => ({
                place_id: s.placePrediction?.placeId,
                description: s.placePrediction?.text?.text,
                structured_formatting: {
                    main_text: s.placePrediction?.structuredFormat?.mainText?.text,
                    secondary_text: s.placePrediction?.structuredFormat?.secondaryText?.text,
                }
            }));
            return { predictions: suggestions };
        }
        catch (e) {
            return { predictions: [], error: e.response?.data || e.message };
        }
    }
    async details(placeId) {
        try {
            const res = await axios_1.default.get(`https://places.googleapis.com/v1/places/${placeId}?key=${GKEY}&fields=addressComponents`);
            return { result: { address_components: res.data.addressComponents } };
        }
        catch (e) {
            return { result: null, error: e.response?.data || e.message };
        }
    }
};
exports.PlacesController = PlacesController;
__decorate([
    (0, common_1.Get)('autocomplete'),
    __param(0, (0, common_1.Query)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlacesController.prototype, "autocomplete", null);
__decorate([
    (0, common_1.Get)('details'),
    __param(0, (0, common_1.Query)('place_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlacesController.prototype, "details", null);
exports.PlacesController = PlacesController = __decorate([
    (0, common_1.Controller)('places')
], PlacesController);
//# sourceMappingURL=places.controller.js.map