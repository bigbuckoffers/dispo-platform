export declare class PlacesController {
    autocomplete(input: string): Promise<{
        predictions: any;
    }>;
    details(placeId: string): Promise<{
        result: {
            address_components: any;
        };
    }>;
}
