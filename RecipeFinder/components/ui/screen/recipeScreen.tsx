import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { recipeDetailStyles } from '../../../assets/styles/recipe-detail.styles';
import { COLORS } from '../../../constants/colors';
import { Recipe, RecipeService } from '../../../services/recipeService';

export default function RecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isFavorite, setIsFavorite] = useState(false);

  // Load recipe data
  React.useEffect(() => {
    const loadRecipe = async () => {
      if (!id) {
        setError('Recipe ID is missing');
        setLoading(false);
        return;
      }

      try {
        const recipeData = await RecipeService.getRecipeById(id);
        if (!recipeData) {
          setError('Recipe not found');
        } else {
          setRecipe(recipeData);
        }
      } catch (err: any) {
        setError(`Failed to load recipe: ${err?.message || 'Unknown error'}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [id]);

  // Toggle step completion
  const toggleStepCompletion = (stepIndex: number) => {
    setCompletedSteps(prev => {
      const updated = new Set(prev);
      if (updated.has(stepIndex)) {
        updated.delete(stepIndex);
      } else {
        updated.add(stepIndex);
      }
      return updated;
    });
  };

  // Toggle ingredient checked state
  const toggleIngredientChecked = (index: number) => {
    setCheckedIngredients(prev => {
      const updated = new Set(prev);
      if (updated.has(index)) {
        updated.delete(index);
      } else {
        updated.add(index);
      }
      return updated;
    });
  };

  // Toggle favorite status
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  // Handle back navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/home');
    }
  };

  // Error state
  if (error) {
    return (
      <View style={recipeDetailStyles.errorContainer}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primary]}
          style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={recipeDetailStyles.errorContent}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.white} />
            <Text style={recipeDetailStyles.errorTitle}>Oops!</Text>
            <Text style={recipeDetailStyles.errorDescription}>{error}</Text>
            <TouchableOpacity style={recipeDetailStyles.errorButton} onPress={handleBack}>
              <Text style={recipeDetailStyles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Loading state
  if (loading || !recipe) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Get YouTube video ID from a URL
  const getYoutubeVideoId = () => {
    if (!recipe.videoUrl) return null;
    
    // Extract video ID from YouTube URL
    const match = recipe.videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  return (
    <View style={recipeDetailStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header Image with Gradient Overlay */}
        <View style={recipeDetailStyles.headerContainer}>
          <View style={recipeDetailStyles.imageContainer}>
            <Image
              source={{ uri: recipe.image }}
              style={recipeDetailStyles.headerImage}
              contentFit="cover"
              transition={300}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={recipeDetailStyles.gradientOverlay}
            />
          </View>

          {/* Floating Buttons */}
          <View style={recipeDetailStyles.floatingButtons}>
            <TouchableOpacity 
              style={recipeDetailStyles.floatingButton} 
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={recipeDetailStyles.floatingButton} 
              onPress={toggleFavorite}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isFavorite ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color={COLORS.white} 
              />
            </TouchableOpacity>
          </View>

          {/* Title Section */}
          <View style={recipeDetailStyles.titleSection}>
            {recipe.category && (
              <View style={recipeDetailStyles.categoryBadge}>
                <Text style={recipeDetailStyles.categoryText}>{recipe.category}</Text>
              </View>
            )}
            <Text style={recipeDetailStyles.recipeTitle}>{recipe.title}</Text>
            {recipe.area && (
              <View style={recipeDetailStyles.locationRow}>
                <Ionicons name="location-outline" size={18} color={COLORS.white} />
                <Text style={recipeDetailStyles.locationText}>{recipe.area} Cuisine</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={recipeDetailStyles.contentSection}>
          {/* Stats Cards */}
          <View style={recipeDetailStyles.statsContainer}>
            <View style={recipeDetailStyles.statCard}>
              <View style={[recipeDetailStyles.statIconContainer, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="time-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={recipeDetailStyles.statValue}>{recipe.cookTime}</Text>
              <Text style={recipeDetailStyles.statLabel}>Prep Time</Text>
            </View>

            <View style={recipeDetailStyles.statCard}>
              <View style={[recipeDetailStyles.statIconContainer, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="people-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={recipeDetailStyles.statValue}>{recipe.servings}</Text>
              <Text style={recipeDetailStyles.statLabel}>Servings</Text>
            </View>
          </View>

          {/* Video Tutorial Section - Only show if video URL exists */}
          {recipe.videoUrl && getYoutubeVideoId() && (
            <View style={recipeDetailStyles.sectionContainer}>
              <View style={recipeDetailStyles.sectionTitleRow}>
                <View style={[recipeDetailStyles.sectionIcon, { backgroundColor: '#FF0000' + '20' }]}>
                  <Ionicons name="videocam-outline" size={18} color="#FF0000" />
                </View>
                <Text style={recipeDetailStyles.sectionTitle}>Video Tutorial</Text>
              </View>

              <TouchableOpacity 
                style={recipeDetailStyles.videoCard}
                activeOpacity={0.9}
              >
                <WebView
                  style={recipeDetailStyles.webview}
                  javaScriptEnabled={true}
                  source={{ uri: `https://www.youtube.com/embed/${getYoutubeVideoId()}` }}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Ingredients Section */}
          <View style={recipeDetailStyles.sectionContainer}>
            <View style={recipeDetailStyles.sectionTitleRow}>
              <View style={[recipeDetailStyles.sectionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="list-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={recipeDetailStyles.sectionTitle}>Ingredients</Text>
              <View style={recipeDetailStyles.countBadge}>
                <Text style={recipeDetailStyles.countText}>{recipe.ingredients?.length || 0}</Text>
              </View>
            </View>

            <View style={recipeDetailStyles.ingredientsGrid}>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ingredient, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={recipeDetailStyles.ingredientCard}
                    onPress={() => toggleIngredientChecked(index)}
                    activeOpacity={0.8}
                  >
                    <View style={recipeDetailStyles.ingredientNumber}>
                      <Text style={recipeDetailStyles.ingredientNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={recipeDetailStyles.ingredientText}>
                      {ingredient?.name || 'Unknown ingredient'} {ingredient?.measure ? `(${ingredient.measure})` : ''}
                    </Text>
                    <Ionicons 
                      name={checkedIngredients.has(index) ? "checkmark-circle" : "checkmark-circle-outline"} 
                      size={24} 
                      color={COLORS.primary}
                      style={checkedIngredients.has(index) ? {} : recipeDetailStyles.ingredientCheck}
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={recipeDetailStyles.ingredientCard}>
                  <Text style={recipeDetailStyles.ingredientText}>No ingredients available</Text>
                </View>
              )}
            </View>
          </View>

          {/* Instructions Section */}
          <View style={recipeDetailStyles.sectionContainer}>
            <View style={recipeDetailStyles.sectionTitleRow}>
              <View style={[recipeDetailStyles.sectionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={recipeDetailStyles.sectionTitle}>Instructions</Text>
              <View style={recipeDetailStyles.countBadge}>
                <Text style={recipeDetailStyles.countText}>{recipe.instructions?.length || 0}</Text>
              </View>
            </View>

            <View style={recipeDetailStyles.instructionsContainer}>
              {recipe.instructions?.map((instruction, index) => (
                <View key={index} style={recipeDetailStyles.instructionCard}>
                  <View 
                    style={[
                      recipeDetailStyles.stepIndicator, 
                      { backgroundColor: completedSteps.has(index) ? COLORS.text : COLORS.primary }
                    ]}
                  >
                    <Text style={recipeDetailStyles.stepNumber}>{index + 1}</Text>
                  </View>
                  <View style={recipeDetailStyles.instructionContent}>
                    <Text style={recipeDetailStyles.instructionText}>{instruction}</Text>
                    <View style={recipeDetailStyles.instructionFooter}>
                      <Text style={recipeDetailStyles.stepLabel}>Step {index + 1}</Text>
                      <TouchableOpacity 
                        style={recipeDetailStyles.completeButton}
                        onPress={() => toggleStepCompletion(index)}
                      >
                        <Ionicons 
                          name={completedSteps.has(index) ? "checkmark" : "checkmark-outline"} 
                          size={16} 
                          color={COLORS.primary} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Add to Favorites Button */}
          <TouchableOpacity 
            style={recipeDetailStyles.primaryButton}
            onPress={toggleFavorite}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={recipeDetailStyles.buttonGradient}
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={20} 
                color={COLORS.white} 
              />
              <Text style={recipeDetailStyles.buttonText}>
                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}