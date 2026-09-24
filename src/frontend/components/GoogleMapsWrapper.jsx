import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const GoogleMapsWrapper = ({ children }) => {
  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      solutionChannel="GMP_visgl_reactgooglemaps_v1"
      region="IN"
      language="en"
      libraries={['places', 'marker', 'geometry']}
    >
      {children}
    </APIProvider>
  );
};
