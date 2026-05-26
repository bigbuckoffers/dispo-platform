import { Controller, Get, Query } from '@nestjs/common';
import axios from 'axios';

@Controller('places')
export class PlacesController {
  @Get('autocomplete')
  async autocomplete(@Query('input') input: string) {
    if (!input || input.length < 3) return { predictions: [] };
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: { input, types: 'address', components: 'country:us', key: process.env.GOOGLE_MAPS_KEY || 'AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s' }
    });
    return res.data;
  }

  @Get('details')
  async details(@Query('place_id') placeId: string) {
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: { place_id: placeId, fields: 'address_components', key: process.env.GOOGLE_MAPS_KEY || 'AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s' }
    });
    return res.data;
  }
}
