import { Controller, Get, Query } from '@nestjs/common';
import axios from 'axios';

const GKEY = 'AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s';

@Controller('places')
export class PlacesController {
  @Get('autocomplete')
  async autocomplete(@Query('input') input: string) {
    if (!input || input.length < 3) return { predictions: [] };
    const res = await axios.post(
      'https://places.googleapis.com/v1/places:autocomplete',
      { input, includedRegionCodes: ['us'] },
      { headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GKEY } }
    );
    // Convert to legacy format for frontend compatibility
    const suggestions = (res.data.suggestions || []).map((s: any) => ({
      place_id: s.placePrediction?.placeId,
      description: s.placePrediction?.text?.text,
      structured_formatting: {
        main_text: s.placePrediction?.structuredFormat?.mainText?.text,
        secondary_text: s.placePrediction?.structuredFormat?.secondaryText?.text,
      }
    }));
    return { predictions: suggestions };
  }

  @Get('details')
  async details(@Query('place_id') placeId: string) {
    const res = await axios.get(
      `https://places.googleapis.com/v1/places/${placeId}`,
      { headers: { 'X-Goog-Api-Key': GKEY, 'X-Goog-FieldMask': 'addressComponents' } }
    );
    // Convert to legacy format
    return { result: { address_components: res.data.addressComponents } };
  }
}
