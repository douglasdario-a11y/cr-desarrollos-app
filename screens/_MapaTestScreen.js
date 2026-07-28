import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MapaTestScreen() {
  return (
    <View style={s.container}>
      <MapView
        style={s.mapa}
        initialRegion={{ latitude: 9.9333, longitude: -84.0833, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        <Marker coordinate={{ latitude: 9.9333, longitude: -84.0833 }} title="Prueba" />
      </MapView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  mapa: { flex: 1 },
});
