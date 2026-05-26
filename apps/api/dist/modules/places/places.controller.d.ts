export declare class PlacesController {
    autocomplete(input: string): Promise<{
        predictions: any;
        error?: undefined;
    } | {
        predictions: any[];
        error: any;
    }>;
    details(placeId: string): Promise<{
        result: {
            address_components: any;
        };
        error?: undefined;
    } | {
        result: any;
        error: any;
    }>;
}
