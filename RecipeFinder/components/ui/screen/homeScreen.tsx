import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, Modal, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { homeStyles } from "../../../assets/styles/home.styles";
import LogoutModal from '../LogoutModal';
import { Image } from "expo-image";
import { COLORS } from "../../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import CategoryFilter from "../../../components/CategoryFilter";
import RecipeCard from "../../../components/RecipeCard";
import LoadingSpinner from "../../../components/LoadingSpinner";

import { RecipeService } from '../../../services/recipeService';
import { getMealCategories } from '../../../services/mealAPI';
import { useAuth } from "../../../hooks/useAuth";

// Types
interface Category {
  id: string;
  name: string;
  image: string;
  description: string;
}

interface Recipe {
  id: string;
  title: string;
  image: string;
  cookTime?: string;
  servings?: string;
  area?: string;
  source?: 'firebase' | 'mealdb';
}

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { signOut, user, loading: authLoading } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredRecipe, setFeaturedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState<boolean>(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const fetchedCategories = await getMealCategories();
      setCategories(fetchedCategories);
      
      // Set initial category and load its recipes
      if (fetchedCategories.length > 0) {
        const initialCategory = fetchedCategories[0].name;
        setSelectedCategory(initialCategory);
        await loadCategoryData(initialCategory);
      }
      
      // Load featured recipe
      const randomRecipe = await RecipeService.getRandomRecipe();
      if (randomRecipe) {
        setFeaturedRecipe(randomRecipe);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryData = async (category: string) => {
    console.log('HomeScreen.loadCategoryData called with category:', category);
    try {
      const recipes = await RecipeService.getRecipesByCategory(category);
      console.log('HomeScreen.loadCategoryData received recipes:', recipes?.length || 0);
      setRecipes(recipes);
    } catch (error: any) {
      console.error("Error loading category data:", error);
      setRecipes([]);
    }
  };

  const handleCategorySelect = async (category: string) => {
    console.log('Category selected:', category);
    setSelectedCategory(category);
    await loadCategoryData(category);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    setProfileMenuVisible(false);
    setLogoutModalVisible(true);
  };

  const handleCancelLogout = () => {
    setLogoutModalVisible(false);
  };

  useEffect(() => {
    // Wait for auth to be initialized before loading data
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  if (loading && !refreshing)
    return <LoadingSpinner message="Loading delicious recipes..." />;

  return (
    <View style={homeStyles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={homeStyles.scrollContent}
      >
        {/* HEADER WITH PROFILE AND NOTIFICATION ICONS */}
        <View style={homeStyles.welcomeSection}>
          <TouchableOpacity 
            style={homeStyles.iconButton}
            onPress={() => setProfileMenuVisible(true)}
          >
            <Ionicons name="person-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={homeStyles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        {/* Profile Menu Modal */}
        <Modal
          visible={profileMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setProfileMenuVisible(false)}
        >
          <TouchableOpacity 
            style={homeStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setProfileMenuVisible(false)}
          >
            <View style={homeStyles.profileMenu}>
              <TouchableOpacity 
                style={homeStyles.profileMenuItem}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color={COLORS.text} />
                <Text style={homeStyles.profileMenuItemText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        
        {/* Logout Confirmation Modal */}
      <LogoutModal
        visible={logoutModalVisible}
        onCancel={handleCancelLogout}
        message="Are you sure you want to logout?"
      />

        {/* TITLE SECTION */}
        <View style={homeStyles.titleSection}>
          <Text style={homeStyles.welcomeText}>Recipe Finder</Text>
        </View>

        {/* FEATURED SECTION */}
        {featuredRecipe && (
          <View style={homeStyles.featuredSection}>
            <TouchableOpacity
              style={homeStyles.featuredCard}
              activeOpacity={0.9}
              onPress={() => (router.push as any)(`/recipe/${featuredRecipe.id}`)}
            >
              <View style={homeStyles.featuredImageContainer}>
                <Image
                  source={{ uri: featuredRecipe.image }}
                  style={homeStyles.featuredImage}
                  contentFit="cover"
                  transition={500}
                />
                <View style={homeStyles.featuredOverlay}>
                  <View style={homeStyles.featuredBadge}>
                    <Text style={homeStyles.featuredBadgeText}>
                      {featuredRecipe.source === 'firebase' ? 'User Recipe' : 'Featured'}
                    </Text>
                  </View>

                  <View style={homeStyles.featuredContent}>
                    <Text style={homeStyles.featuredTitle} numberOfLines={2}>
                      {featuredRecipe.title}
                    </Text>

                    <View style={homeStyles.featuredMeta}>
                      <View style={homeStyles.metaItem}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={COLORS.white}
                        />
                        <Text style={homeStyles.metaText}>
                          {featuredRecipe.cookTime}
                        </Text>
                      </View>
                      <View style={homeStyles.metaItem}>
                        <Ionicons
                          name="people-outline"
                          size={16}
                          color={COLORS.white}
                        />
                        <Text style={homeStyles.metaText}>
                          {featuredRecipe.servings}
                        </Text>
                      </View>
                      {featuredRecipe.area && (
                        <View style={homeStyles.metaItem}>
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color={COLORS.white}
                          />
                          <Text style={homeStyles.metaText}>
                            {featuredRecipe.area}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory || categories[0].name}
            onSelectCategory={handleCategorySelect}
          />
        )}

        <View style={homeStyles.recipesSection}>
          <View style={homeStyles.sectionHeader}>
            <Text style={homeStyles.sectionTitle}>{selectedCategory}</Text>
          </View>

          {recipes.length > 0 ? (
            <FlatList
              data={recipes}
              renderItem={({ item }) => <RecipeCard recipe={item} />}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={homeStyles.row}
              contentContainerStyle={homeStyles.recipesGrid}
              scrollEnabled={false}
            />
          ) : (
            <View style={homeStyles.emptyState}>
              <Ionicons
                name="restaurant-outline"
                size={64}
                color={COLORS.textLight}
              />
              <Text style={homeStyles.emptyTitle}>No recipes found</Text>
              <Text style={homeStyles.emptyDescription}>
                Try a different category
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;
