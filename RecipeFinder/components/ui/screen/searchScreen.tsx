import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { searchStyles } from "../../../assets/styles/search.styles";
import { COLORS } from "../../../constants/colors";
import { RecipeService } from "../../../services/recipeService";
import RecipeCard from "../../RecipeCard";
import { SafeAreaView } from "react-native-safe-area-context";

// Types
interface Recipe {
  id: string;
  title: string;
  image: string;
  description?: string;
  cookTime?: string;
  servings?: string;
  area?: string;
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  // Quick filter options
  const quickFilters = ["All", "Breakfast", "Lunch", "Dinner", "Dessert"];

  // Search for recipes when query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      // Show popular recipes when no search query
      setRecipes(RecipeService.getRandomRecipes(12));
      return;
    }

    setLoading(true);
    
    // Simulate search delay
    const timer = setTimeout(() => {
      const results = RecipeService.searchRecipes(searchQuery);
      setRecipes(results);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter recipes by category
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setLoading(true);

    setTimeout(() => {
      if (filter === "All") {
        if (searchQuery.trim() === "") {
          setRecipes(RecipeService.getRandomRecipes(12));
        } else {
          setRecipes(RecipeService.searchRecipes(searchQuery));
        }
      } else {
        const filteredRecipes = RecipeService.getRecipesByCategory(filter);
        setRecipes(filteredRecipes);
      }
      setLoading(false);
    }, 300);
  };

  // Clear search input
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Render recipe item in grid
  const renderRecipeItem = ({ item, index }: { item: Recipe; index: number }) => (
    <View style={{ width: "48%" }}>
      <RecipeCard recipe={item} />
    </View>
  );

  return (
    <SafeAreaView style={searchStyles.container}>
      {/* Search Input */}
      <View style={searchStyles.searchSection}>
        <View style={searchStyles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={COLORS.textLight}
            style={searchStyles.searchIcon}
          />
          <TextInput
            style={searchStyles.searchInput}
            placeholder="Search recipes, ingredients..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={searchStyles.clearButton}
              onPress={handleClearSearch}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Filters */}
        <View style={searchStyles.quickFilters}>
          <View style={searchStyles.filterButtons}>
            {quickFilters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  searchStyles.quickFilterButton,
                  activeFilter === filter && searchStyles.activeQuickFilter,
                ]}
                onPress={() => handleFilterChange(filter)}
              >
                <Text
                  style={[
                    searchStyles.quickFilterText,
                    activeFilter === filter && searchStyles.activeQuickFilterText,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Results Section */}
      <View style={searchStyles.resultsSection}>
        <View style={searchStyles.resultsHeader}>
          <Text style={searchStyles.resultsTitle}>
            {searchQuery.trim() === "" ? "Popular Recipes" : "Search Results"}
          </Text>
          <Text style={searchStyles.resultsCount}>{recipes.length} found</Text>
        </View>

        {loading ? (
          <View style={searchStyles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : recipes.length > 0 ? (
          <FlatList
            data={recipes}
            renderItem={renderRecipeItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={searchStyles.row}
            contentContainerStyle={searchStyles.recipesGrid}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={searchStyles.emptyState}>
            <Ionicons name="search" size={48} color={COLORS.textLight} />
            <Text style={searchStyles.emptyTitle}>No recipes found</Text>
            <Text style={searchStyles.emptyDescription}>
              Try searching with different keywords or browse our categories
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}