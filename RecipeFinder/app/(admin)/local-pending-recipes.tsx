import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { LocalRecipeService } from '../../services/localRecipeService';
import { RecipeService } from '../../services/recipeService';
import { UserService } from '../../services/userService';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { LocalRecipe } from '../../services/localRecipeService';

const LocalPendingRecipesScreen = () => {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<LocalRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.back();
      return;
    }
    loadLocalPendingRecipes();
  }, [isAdmin]);

  const loadLocalPendingRecipes = async () => {
    try {
      const localRecipes = await LocalRecipeService.getLocalRecipes();
      setRecipes(localRecipes);
    } catch (error) {
      console.error('Error loading local pending recipes:', error);
      Alert.alert('Error', 'Failed to load local pending recipes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLocalPendingRecipes();
  };

  const handleApproveRecipe = async (recipeId: string) => {
    Alert.alert(
      'Approve Recipe',
      'This will move the recipe from local storage to Firebase with pending status for final review.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: () => processLocalRecipe(recipeId, 'approve'),
        },
      ]
    );
  };

  const handleDeclineRecipe = async (recipeId: string) => {
    Alert.alert(
      'Decline Recipe',
      'This will permanently delete the recipe from local storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => processLocalRecipe(recipeId, 'decline'),
        },
      ]
    );
  };

  const processLocalRecipe = async (recipeId: string, action: 'approve' | 'decline') => {
    try {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) {
        Alert.alert('Error', 'Recipe not found');
        return;
      }

      if (action === 'approve') {
        // Submit to Firebase and remove from local storage
        await LocalRecipeService.submitLocalRecipeToFirebase(recipe);
        
        Alert.alert('Success', 'Recipe has been moved to Firebase for final review');
      } else {
        // Just delete from local storage
        await LocalRecipeService.deleteLocalRecipe(recipeId);
        
        // Create notification for user
        await UserService.createNotification({
          userId: recipe.userId,
          title: 'Recipe Declined',
          message: `Your recipe "${recipe.title}" was declined and has been removed.`,
          type: 'recipe_declined',
          read: false
        });
        
        Alert.alert('Success', 'Recipe has been declined and removed');
      }

      // Refresh the list
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
    } catch (error) {
      console.error(`Error ${action}ing recipe:`, error);
      Alert.alert('Error', `Failed to ${action} recipe`);
    }
  };

  const renderRecipeItem = ({ item }: { item: LocalRecipe }) => (
    <View style={styles.recipeCard}>
      <Image source={{ uri: item.image }} style={styles.recipeImage} />
      <View style={styles.recipeContent}>
        <Text style={styles.recipeTitle}>{item.title}</Text>
        <Text style={styles.recipeDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.recipeDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>{item.cookTime}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>{item.servings} servings</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="pricetag-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>{item.category}</Text>
          </View>
        </View>
        <Text style={styles.submittedDate}>
          Submitted: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApproveRecipe(item.id)}
        >
          <Ionicons name="checkmark-outline" size={20} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Submit to Firebase</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleDeclineRecipe(item.id)}
        >
          <Ionicons name="close-outline" size={20} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={80} color={COLORS.textLight} />
      <Text style={styles.emptyTitle}>No Local Pending Recipes</Text>
      <Text style={styles.emptySubtitle}>
        There are no recipes waiting in local storage for approval.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Local Pending Recipes</Text>
        <View style={styles.headerRight}>
          <Text style={styles.countBadge}>{recipes.length}</Text>
        </View>
      </View>

      <FlatList
        data={recipes}
        renderItem={renderRecipeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 24,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  recipeContent: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
    lineHeight: 20,
  },
  recipeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  submittedDate: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  approveButton: {
    backgroundColor: COLORS.success,
    borderBottomLeftRadius: 12,
  },
  declineButton: {
    backgroundColor: COLORS.error,
    borderBottomRightRadius: 12,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
});

export default LocalPendingRecipesScreen;