import { View, Text, StyleSheet } from 'react-native';
import NoFavoritesFound from '../../components/NoFavoritesFound';

export default function Favorites() {
  // This is a placeholder. In a real implementation, you would fetch favorites from Firebase
  const hasFavorites = false;

  return (
    <View style={styles.container}>
      {hasFavorites ? (
        <Text style={styles.text}>Your favorite recipes will appear here</Text>
      ) : (
        <NoFavoritesFound />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
});