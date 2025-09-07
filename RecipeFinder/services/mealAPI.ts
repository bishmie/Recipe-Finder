// API service for fetching meal data from TheMealDB API
// Documentation: https://www.themealdb.com/api.php

const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

// Test function to check API connectivity
const testAPIConnectivity = async () => {
  try {
    console.log('Testing MealDB API connectivity...');
    const response = await fetch(`${API_BASE_URL}/categories.php`);
    console.log('API Response status:', response.status);
    console.log('API Response headers:', response.headers);
    if (response.ok) {
      const data = await response.json();
      console.log('API test successful, categories count:', data.categories?.length || 0);
      
      // Test getMealsByCategory with a simple fetch
      console.log('Testing category filter API...');
      const categoryResponse = await fetch(`${API_BASE_URL}/filter.php?c=Seafood`);
      console.log('Category API Response status:', categoryResponse.status);
      
      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json();
        console.log('Category API test successful, meals count:', categoryData.meals?.length || 0);
      } else {
        console.error('Category API test failed with status:', categoryResponse.status);
      }
      
      return true;
    } else {
      console.error('API test failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('API connectivity test failed:', error);
    return false;
  }
};

// Call test on module load
testAPIConnectivity();



// Transform the API response to our app's recipe format
const transformMealToRecipe = (meal: any) => {
  return {
    id: meal.idMeal,
    title: meal.strMeal,
    image: meal.strMealThumb,
    description: meal.strInstructions || '',
    cookTime: '30 mins', // TheMealDB doesn't provide cook time, so we're using a default
    servings: '4', // TheMealDB doesn't provide servings, so we're using a default
    ingredients: getIngredientsFromMeal(meal),
    instructions: meal.strInstructions ? meal.strInstructions.split('\r\n').filter((step: string) => step.trim() !== '') : [],
    videoUrl: meal.strYoutube || undefined, // YouTube video URL from MealDB
    area: meal.strArea,
    category: meal.strCategory
  };
};

// Extract ingredients and measurements from meal object
const getIngredientsFromMeal = (meal: any) => {
  const ingredients = [];
  
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    
    if (ingredient && ingredient.trim() !== '') {
      ingredients.push({
        name: ingredient,
        measure: measure || ''
      });
    }
  }
  
  return ingredients;
};

// Get a random selection of meals
export const getRandomMeals = async (count = 10) => {
  try {
    console.log('getRandomMeals called for', count, 'meals');
    const meals = [];
    
    // TheMealDB only returns one random meal per request, so we need to make multiple requests
    for (let i = 0; i < count; i++) {
      console.log(`Fetching random meal ${i + 1}/${count} from:`, `${API_BASE_URL}/random.php`);
      const response = await fetch(`${API_BASE_URL}/random.php`);
      console.log(`Random meal ${i + 1} response status:`, response.status, 'ok:', response.ok);
      
      if (!response.ok) {
        console.error(`HTTP error for random meal ${i + 1}! status: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`Random meal ${i + 1} data:`, data?.meals?.length || 0, 'meals received');
      
      if (data.meals && data.meals.length > 0) {
        const transformedMeal = transformMealToRecipe(data.meals[0]);
        meals.push(transformedMeal);
        console.log(`Random meal ${i + 1} transformed successfully`);
      }
    }
    
    console.log('getRandomMeals returning:', meals.length, 'meals');
    return meals;
  } catch (error: any) {
    console.error('Error fetching random meals:', error);
    console.error('Error details:', error.message, error.stack);
    throw error;
  }
};

// Get meals by category
export const getMealsByCategory = async (category: string) => {
  console.log(`getMealsByCategory called with category: ${category}`);
  try {
    // Encode the category to handle special characters
    const encodedCategory = encodeURIComponent(category);
    const url = `${API_BASE_URL}/filter.php?c=${encodedCategory}`;
    console.log(`Fetching from URL: ${url}`);
    console.log(`API_BASE_URL: ${API_BASE_URL}`);
    console.log(`Original category: ${category}, Encoded: ${encodedCategory}`);
    
    const response = await fetch(url);
    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`API response data:`, data);
    
    if (!data.meals) {
      console.log('No meals found in response');
      return [];
    }
    
    console.log(`Found ${data.meals.length} meals, fetching details for first 10...`);
    
    // The filter endpoint doesn't return full meal details, so we need to fetch each meal individually
    const mealPromises = data.meals.slice(0, 10).map(async (meal: any) => {
      console.log(`Fetching details for meal ID: ${meal.idMeal}`);
      return await getMealById(meal.idMeal);
    });
    
    const results = await Promise.all(mealPromises);
    console.log(`Successfully fetched ${results.length} detailed meals`);
    return results;
  } catch (error: any) {
    console.error(`Error fetching meals by category ${category}:`, error);
    throw error;
  }
};

// Get meal by ID
export const getMealById = async (id: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/lookup.php?i=${id}`);
    const data = await response.json();
    
    if (!data.meals || data.meals.length === 0) {
      throw new Error('Meal not found');
    }
    
    return transformMealToRecipe(data.meals[0]);
  } catch (error: any) {
    console.error(`Error fetching meal with ID ${id}:`, error);
    throw error;
  }
};

// Search meals by name
export const searchMealsByName = async (query: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/search.php?s=${query}`);
    const data = await response.json();
    
    if (!data.meals) return [];
    
    return data.meals.map(transformMealToRecipe);
  } catch (error: any) {
    console.error(`Error searching meals with query ${query}:`, error);
    throw error;
  }
};

// Get all meal categories
export const getMealCategories = async () => {
  try {
    console.log('getMealCategories called, fetching from:', `${API_BASE_URL}/categories.php`);
    const response = await fetch(`${API_BASE_URL}/categories.php`);
    console.log('getMealCategories response status:', response.status);
    console.log('getMealCategories response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('getMealCategories data received:', data?.categories?.length || 0, 'categories');
    
    if (!data.categories) return [];
    
    const categories = data.categories.map((category: any) => ({
      id: category.idCategory,
      name: category.strCategory,
      image: category.strCategoryThumb,
      description: category.strCategoryDescription
    }));
    
    console.log('getMealCategories returning:', categories.length, 'processed categories');
    return categories;
  } catch (error: any) {
    console.error('Error fetching meal categories:', error);
    console.error('Error details:', error.message, error.stack);
    throw error;
  }
};
// Additional exports that match the expected function signatures
export const getRandomRecipes = async (count: number = 5) => {
  return await getRandomMeals(count);
};

export const getRandomRecipe = async () => {
  const meals = await getRandomMeals(1);
  return meals.length > 0 ? meals[0] : undefined;
};

export const getRecipeById = async (id: string) => {
  return await getMealById(id);
};

export const getRecipesByCategory = async (category: string) => {
  console.log('MealAPI.getRecipesByCategory called with category:', category);
  try {
    const result = await getMealsByCategory(category);
    console.log('MealAPI.getRecipesByCategory result:', result?.length || 0, 'recipes');
    return result;
  } catch (error) {
    console.error('MealAPI.getRecipesByCategory error:', error);
    throw error;
  }
};

export const getCategories = async () => {
  return await getMealCategories();
};

export const searchRecipes = async (query: string) => {
  return await searchMealsByName(query);
};

