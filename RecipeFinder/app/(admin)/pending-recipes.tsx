import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import SafeScreen from '../../components/SafeScreen';
import { PendingRecipe, RecipeService } from '../../services/recipeService';
// Styles are defined inline below

type FilterType = 'all' | 'new' | 'edits';

const PendingRecipes = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAdmin } = useAuth();
  const [allRecipes, setAllRecipes] = useState<PendingRecipe[]>([]);
  const [recipes, setRecipes] = useState<PendingRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRecipes, setProcessingRecipes] = useState<Set<string>>(new Set());
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [recipeToProcess, setRecipeToProcess] = useState<PendingRecipe | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [currentFilter, setCurrentFilter] = useState<FilterType>((params.filter as FilterType) || 'all');

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/home');
      return;
    }

    // Set up real-time listener for pending recipes
    const unsubscribe = RecipeService.listenToAllPendingRecipes((pendingRecipes) => {
      const sortedRecipes = pendingRecipes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllRecipes(sortedRecipes);
      setLoading(false);
    });

    // Initial load
    loadPendingRecipes();

    // Cleanup listener
    return () => {
      unsubscribe();
    };
  }, [isAdmin]);

  // Filter recipes based on current filter
  useEffect(() => {
    const filterRecipes = () => {
      switch (currentFilter) {
        case 'new':
          return allRecipes.filter(recipe => recipe.status === 'pending');
        case 'edits':
          return allRecipes.filter(recipe => recipe.status === 'pending_edit');
        case 'all':
        default:
          return allRecipes;
      }
    };
    
    setRecipes(filterRecipes());
  }, [allRecipes, currentFilter]);

  // Update filter when URL params change
  useEffect(() => {
    const newFilter = (params.filter as FilterType) || 'all';
    setCurrentFilter(newFilter);
  }, [params.filter]);

  const loadPendingRecipes = async () => {
    try {
      setLoading(true);
      const pendingRecipes = await RecipeService.getAllPendingRecipes();
      setAllRecipes(pendingRecipes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Error loading pending recipes:', error);
      Alert.alert('Error', 'Failed to load pending recipes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingRecipes();
  };

  const handleApproveRecipe = async (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      Alert.alert('Error', 'Recipe not found');
      return;
    }
    setRecipeToProcess(recipe);
    setShowApproveModal(true);
  };

  const handleDeclineRecipe = async (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      Alert.alert('Error', 'Recipe not found');
      return;
    }
    setRecipeToProcess(recipe);
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  const confirmApprove = async () => {
    if (!recipeToProcess) return;
    setShowApproveModal(false);
    await processRecipe(recipeToProcess.id, 'approve');
    setRecipeToProcess(null);
  };

  const confirmDecline = async () => {
    if (!recipeToProcess) return;
    setShowDeclineModal(false);
    await processRecipe(recipeToProcess.id, 'decline', declineReason);
    setRecipeToProcess(null);
    setDeclineReason('');
  };

  const cancelApprove = () => {
    setShowApproveModal(false);
    setRecipeToProcess(null);
  };

  const cancelDecline = () => {
    setShowDeclineModal(false);
    setRecipeToProcess(null);
    setDeclineReason('');
  };

  const processRecipe = async (recipeId: string, action: 'approve' | 'decline', reason?: string) => {
    setProcessingRecipes(prev => new Set([...prev, recipeId]));
    
    try {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) {
        throw new Error('Recipe not found');
      }
      
      if (action === 'approve') {
        await RecipeService.approveRecipe(recipeId, user!.uid);
        Alert.alert(
          'Success',
          `Recipe "${recipe.title}" has been approved and published successfully`
        );
      } else {
        await RecipeService.declineRecipe(recipeId, user!.uid, reason);
        Alert.alert(
          'Success',
          `Recipe "${recipe.title}" has been declined`
        );
      }
      
      // Immediately remove the recipe from local state to prevent duplicate actions
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      setAllRecipes(prev => prev.filter(r => r.id !== recipeId));
    } catch (error: any) {
      console.error(`Error ${action}ing recipe:`, error);
      Alert.alert('Error', `Failed to ${action} recipe: ${error?.message || 'Unknown error'}`);
    } finally {
      setProcessingRecipes(prev => {
        const updated = new Set(prev);
        updated.delete(recipeId);
        return updated;
      });
    }
  };

  const renderRecipeItem = ({ item }: { item: PendingRecipe }) => {
    const isProcessing = processingRecipes.has(item.id!);
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return COLORS.warning;
        case 'pending_edit': return COLORS.info;
        default: return COLORS.gray;
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending': return 'Pending Review';
        case 'pending_edit': return 'Edit Pending';
        default: return 'Unknown';
      }
    };
    
    return (
      <View style={styles.recipeCard}>
        <Image source={{ uri: item.image }} style={styles.recipeImage} />
        
        <View style={styles.recipeContent}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusBadgeText}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.recipeAuthor}>
            By: {item.authorName || 'Unknown'}
          </Text>
          
          <Text style={styles.recipeDescription} numberOfLines={3}>
            {item.description}
          </Text>
          
          <View style={styles.recipeMetadata}>
            <View style={styles.metadataItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.metadataText}>{item.cookTime}</Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Ionicons name="people-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.metadataText}>{item.servings} servings</Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => router.push(`/recipe/${item.id}`)}
            >
              <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
                View
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApproveRecipe(item.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>
                    {item.source === 'local' ? 'Approve & Publish' : 'Approve'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleDeclineRecipe(item.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <Ionicons name="close-outline" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Pending Recipes</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.countBadge}>{recipes.length}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, currentFilter === 'all' && styles.activeFilterTab]}
          onPress={() => router.replace('/admin/pending-recipes?filter=all')}
        >
          <Text style={[styles.filterTabText, currentFilter === 'all' && styles.activeFilterTabText]}>
            All ({allRecipes.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, currentFilter === 'new' && styles.activeFilterTab]}
          onPress={() => router.replace('/admin/pending-recipes?filter=new')}
        >
          <Text style={[styles.filterTabText, currentFilter === 'new' && styles.activeFilterTabText]}>
            New ({allRecipes.filter(r => r.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, currentFilter === 'edits' && styles.activeFilterTab]}
          onPress={() => router.replace('/admin/pending-recipes?filter=edits')}
        >
          <Text style={[styles.filterTabText, currentFilter === 'edits' && styles.activeFilterTabText]}>
            Edits ({allRecipes.filter(r => r.status === 'pending_edit').length})
          </Text>
        </TouchableOpacity>
      </View>

      {recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
          <Text style={styles.emptyStateText}>
            No pending recipes to review at the moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Approve Recipe Modal */}
      <Modal
        visible={showApproveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelApprove}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: COLORS.text,
              marginBottom: 12
            }}>
              Approve Recipe
            </Text>
            <Text style={{
              fontSize: 16,
              color: COLORS.textLight,
              marginBottom: 24,
              lineHeight: 22
            }}>
              Are you sure you want to approve "{recipeToProcess?.title}"? This will publish the recipe and make it visible to all users.
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12
            }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: COLORS.border
                }}
                onPress={cancelApprove}
              >
                <Text style={{
                  color: COLORS.text,
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#34C759'
                }}
                onPress={confirmApprove}
              >
                <Text style={{
                  color: COLORS.white,
                  fontWeight: '600'
                }}>
                  Approve
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Decline Recipe Modal */}
      <Modal
        visible={showDeclineModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDecline}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: COLORS.text,
              marginBottom: 12
            }}>
              Decline Recipe
            </Text>
            <Text style={{
              fontSize: 16,
              color: COLORS.textLight,
              marginBottom: 16,
              lineHeight: 22
            }}>
              Are you sure you want to decline "{recipeToProcess?.title}"?
            </Text>
            <Text style={{
              fontSize: 14,
              color: COLORS.text,
              marginBottom: 8,
              fontWeight: '600'
            }}>
              Reason for decline (optional):
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 12,
                marginBottom: 24,
                minHeight: 80,
                textAlignVertical: 'top'
              }}
              multiline
              placeholder="Enter reason for declining this recipe..."
              value={declineReason}
              onChangeText={setDeclineReason}
            />
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12
            }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: COLORS.border
                }}
                onPress={cancelDecline}
              >
                <Text style={{
                  color: COLORS.text,
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#FF3B30'
                }}
                onPress={confirmDecline}
              >
                <Text style={{
                  color: COLORS.white,
                  fontWeight: '600'
                }}>
                  Decline
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    flex: 1,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  localBadge: {
    backgroundColor: '#FF9500',
  },
  firebaseBadge: {
    backgroundColor: '#007AFF',
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  recipeAuthor: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeMetadata: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metadataText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  viewButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  activeFilterTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default PendingRecipes;