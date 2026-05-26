import { Controller, Get, Query } from '@nestjs/common';
import axios from 'axios';

const GKEY = 'AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s';

@Controller('places')
export class PlacesController {
  @Get('autocomplete')
  async autocomplete(@Query('input') input: string) {
    if (!input || input.length < 3) return { predictions: [] };
    try {
      const res = await axios.post(
        `https://places.googleapis.com/v1/places:autocomplete?key=${GKEY}`,
        { input, includedRegionCodes: ['us'] },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const suggestions = (res.data.suggestions || []).map((s: any) => ({
        place_id: s.placePrediction?.placeId,
        description: s.placePrediction?.text?.text,
        structured_formatting: {
          main_text: s.placePrediction?.structuredFormat?.mainText?.text,
          secondary_text: s.placePrediction?.structuredFormat?.secondaryText?.text,
        }
      }));
      return { predictions: suggestions };
    } catch(e: any) {
      return { predictions: [], error: e.response?.data || e.message };
    }
  }

  @Get('details')
  async details(@Query('place_id') placeId: string) {
    try {
      const res = await axios.get(
        `https://places.googleapis.com/v1/places/${placeId}?key=${GKEY}&fields=addressComponents`,
      );
      // Convert new API format to legacy format
      const components = (res.data.addressComponents || []).map((comp: any) => ({
        long_name: comp.longText,
        short_name: comp.shortText,
        types: comp.types,
      }));
      return { result: { address_components: components } };
    } catch(e: any) {
      return { result: null, error: e.response?.data || e.message };
    }
  }
}
