import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RoomCard from '../../components/RoomCard';
import { useNotices } from '../../hooks/useNotices';

export default function RoomFeedScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text>Room Feed Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
