import { Controller, Get, Query } from '@nestjs/common';
import axios from 'axios';

const GKEY = 'AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s';

@Controller('places')
export class PlacesController {
  @Get('autocomplete')
  async autocomplete(@Query('input') input: string) {
    if (!input || input.length < 3) return { predictions: [] };
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: { input, types: 'address', components: 'country:us', key: GKEY }
    });
    return res.data;
  }

  @Get('details')
  async details(@Query('place_id') placeId: string) {
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: { place_id: placeId, fields: 'address_components', key: GKEY }
    });
    return res.data;
  }
}
