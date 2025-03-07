"use client"

import React, { forwardRef } from 'react';
import { Autocomplete as GoogleAutocomplete } from '@react-google-maps/api';

interface AutocompleteProps {
  children: React.ReactElement<any>;
  onLoad?: (autocomplete: google.maps.places.Autocomplete) => void;
  onPlaceChanged?: () => void;
}

export const Autocomplete = forwardRef<HTMLInputElement, AutocompleteProps>(
  ({ children, onLoad, onPlaceChanged }, ref) => {
    return (
      <GoogleAutocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        restrictions={{ country: 'us' }}
        fields={['formatted_address', 'geometry', 'name']}
      >
        {React.isValidElement(children) && React.cloneElement(children, { ref })}
      </GoogleAutocomplete>
    );
  }
);

Autocomplete.displayName = 'Autocomplete'; 