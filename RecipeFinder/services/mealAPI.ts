// API service for fetching meal data from TheMealDB API
// Documentation: https://www.themealdb.com/api.php

const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

// Transform the API response to our app's recipe format
const transformMealToRecipe = (meal: any) => {
  return {
    id: meal.idMeal,
    title: meal.strMeal,
    image: meal.strMealThumb,
    description: meal.strInstructions,
    cookTime: '30 mins', // TheMealDB doesn't provide cook time, so we're using a default
    servings: '4', // TheMealDB doesn't provide servings, so we're using a default
    ingredients: getIngredientsFromMeal(meal),
    instructions: meal.strInstructions.split('\r\n').filter((step: string) => step.trim() !== '')
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
    const meals = [];
    
    // TheMealDB only returns one random meal per request, so we need to make multiple requests
    for (let i = 0; i < count; i++) {
      const response = await fetch(`${API_BASE_URL}/random.php`);
      const data = await response.json();
      
      if (data.meals && data.meals.length > 0) {
        const transformedMeal = transformMealToRecipe(data.meals[0]);
        meals.push(transformedMeal);
      }
    }
    
    return meals;
  } catch (error) {
    console.error('Error fetching random meals:', error);
    throw error;
  }
};

// Get meals by category
export const getMealsByCategory = async (category: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/filter.php?c=${category}`);
    const data = await response.json();
    
    if (!data.meals) return [];
    
    // The filter endpoint doesn't return full meal details, so we need to fetch each meal individually
    const mealPromises = data.meals.slice(0, 10).map(async (meal: any) => {
      return await getMealById(meal.idMeal);
    });
    
    return await Promise.all(mealPromises);
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    console.error(`Error searching meals with query ${query}:`, error);
    throw error;
  }
};

// Get all meal categories
export const getMealCategories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/categories.php`);
    const data = await response.json();
    
    if (!data.categories) return [];
    
    return data.categories.map((category: any) => ({
      id: category.idCategory,
      name: category.strCategory,
      image: category.strCategoryThumb,
      description: category.strCategoryDescription
    }));
  } catch (error) {
    console.error('Error fetching meal categories:', error);
    throw error;
  }
};