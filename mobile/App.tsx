import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MobTrainer</Text>
      <Text style={styles.subtitle}>Treinos e acompanhamento nutricional</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1f2937'
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563'
  }
});
