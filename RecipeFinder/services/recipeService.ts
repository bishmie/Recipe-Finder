// Local recipe service to replace external API calls

// Types
export interface Ingredient {
  name: string;
  measure: string;
}

export interface Recipe {
  id: string;
  title: string;
  image: string;
  description: string;
  cookTime: string;
  servings: string;
  area?: string;
  category?: string;
  ingredients: Ingredient[];
  instructions: string[];
}

export interface Category {
  id: string;
  name: string;
  image: string;
  description: string;
}

// Mock data for recipes
const mockRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Fish Pie',
    image: 'https://www.themealdb.com/images/media/meals/ysxwuq1487323065.jpg',
    description: 'A classic British dish made with white fish in a creamy sauce, topped with mashed potatoes.',
    cookTime: '30 minutes',
    servings: '4',
    area: 'British',
    category: 'Seafood',
    ingredients: [
      { name: 'Floury Potatoes', measure: '1kg' },
      { name: 'Butter', measure: '50g' },
      { name: 'Milk', measure: '4 tbsp' },
      { name: 'White Fish Fillets', measure: '400g' },
      { name: 'Leek', measure: '1 finely sliced' },
      { name: 'Dijon Mustard', measure: '2 tsp' },
      { name: 'Creme Fraiche', measure: '100ml' },
      { name: 'Parsley', measure: '2 tbsp chopped' },
      { name: 'Lemon', measure: '1' },
      { name: 'Gruyère', measure: '50g' },
      { name: 'Green Beans', measure: '200g' }
    ],
    instructions: [
      'Preheat the oven to 200°C/fan 180°C/gas mark 6.',
      'Boil the potatoes for 15-20 mins until tender. Drain, then mash with the butter and milk. Season with salt and pepper.',
      'Put the fish in a large frying pan with the leek and cover with cold water. Bring to a gentle simmer and cook for 5 mins until the fish flakes easily.',
      'Carefully lift the fish onto a plate and strain the cooking liquid into a jug.',
      'Put the frying pan back on the heat and add the mustard, crème fraîche and 100ml of the reserved cooking liquid. Bring to a gentle simmer.',
      'Flake the fish into a baking dish, removing any bones. Add the parsley and lemon zest to the sauce, then pour over the fish.',
      'Top with the mashed potato and sprinkle with the cheese. Bake for 25-30 mins until golden and bubbling.',
      'Meanwhile, cook the green beans in boiling water for 3-4 mins. Serve with the fish pie.'
    ]
  },
  {
    id: '2',
    title: 'Beef Stroganoff',
    image: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg',
    description: 'A Russian dish of sautéed beef in a sauce with sour cream.',
    cookTime: '45 minutes',
    servings: '4',
    area: 'Russian',
    category: 'Beef',
    ingredients: [
      { name: 'Beef Fillet', measure: '500g' },
      { name: 'Olive Oil', measure: '1 tbsp' },
      { name: 'Onion', measure: '1 sliced' },
      { name: 'Mushrooms', measure: '250g' },
      { name: 'Butter', measure: '30g' },
      { name: 'Plain Flour', measure: '1 tbsp' },
      { name: 'Beef Stock', measure: '150ml' },
      { name: 'Dijon Mustard', measure: '1 tsp' },
      { name: 'Sour Cream', measure: '100ml' },
      { name: 'Parsley', measure: '2 tbsp chopped' }
    ],
    instructions: [
      'Heat the olive oil in a large frying pan, then add the sliced onion and cook for 3-4 mins until starting to soften.',
      'Add the mushrooms and cook for a further 5 mins until the mushrooms are golden.',
      'Remove the onion and mushrooms from the pan and set aside.',
      'In the same pan, melt the butter, then add the beef strips and cook for 3-4 mins until browned all over.',
      'Add the flour and cook for 1 min more.',
      'Gradually add the stock, stirring constantly, until the mixture thickens.',
      'Stir in the mustard and sour cream, then return the onion and mushrooms to the pan.',
      'Simmer for 5 mins until the sauce thickens slightly, then season to taste.',
      'Scatter with parsley and serve with rice or pasta.'
    ]
  },
  {
    id: '3',
    title: 'Chicken Tikka Masala',
    image: 'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg',
    description: 'A popular Indian dish of marinated chicken in a spiced curry sauce.',
    cookTime: '50 minutes',
    servings: '4',
    area: 'Indian',
    category: 'Chicken',
    ingredients: [
      { name: 'Chicken Breasts', measure: '4' },
      { name: 'Yogurt', measure: '150g' },
      { name: 'Lemon Juice', measure: '2 tbsp' },
      { name: 'Garam Masala', measure: '2 tsp' },
      { name: 'Ground Cumin', measure: '1 tsp' },
      { name: 'Ground Coriander', measure: '1 tsp' },
      { name: 'Paprika', measure: '1 tsp' },
      { name: 'Turmeric', measure: '1/2 tsp' },
      { name: 'Onion', measure: '2 chopped' },
      { name: 'Garlic', measure: '3 cloves minced' },
      { name: 'Ginger', measure: '2cm piece grated' },
      { name: 'Tomato Puree', measure: '2 tbsp' },
      { name: 'Chopped Tomatoes', measure: '400g can' },
      { name: 'Double Cream', measure: '150ml' },
      { name: 'Fresh Coriander', measure: 'handful chopped' }
    ],
    instructions: [
      'In a bowl, mix the yogurt, lemon juice, garam masala, cumin, coriander, paprika, and turmeric. Add the chicken and coat well. Cover and refrigerate for at least 1 hour.',
      'Preheat the grill to high. Thread the chicken onto skewers and grill for 8-10 mins until charred and cooked through.',
      'Meanwhile, heat oil in a large pan. Add the onions and cook for 5 mins until softened.',
      'Add the garlic and ginger and cook for 1 min more.',
      'Add the tomato puree and cook for 1 min, then add the chopped tomatoes and 100ml water.',
      'Simmer for 15 mins until the sauce thickens.',
      'Add the cream and simmer for 5 mins more.',
      'Add the grilled chicken to the sauce and heat through.',
      'Scatter with fresh coriander and serve with rice and naan bread.'
    ]
  },
  {
    id: '4',
    title: 'Apple Crumble',
    image: 'https://www.themealdb.com/images/media/meals/wxywrq1468235067.jpg',
    description: 'A classic British dessert with stewed apples topped with a crumbly mixture.',
    cookTime: '40 minutes',
    servings: '6',
    area: 'British',
    category: 'Dessert',
    ingredients: [
      { name: 'Bramley Apples', measure: '4 large' },
      { name: 'Caster Sugar', measure: '100g' },
      { name: 'Lemon', measure: '1 zested' },
      { name: 'Cinnamon', measure: '1 tsp' },
      { name: 'Plain Flour', measure: '200g' },
      { name: 'Butter', measure: '100g cold cubed' },
      { name: 'Demerara Sugar', measure: '100g' },
      { name: 'Rolled Oats', measure: '50g' }
    ],
    instructions: [
      'Preheat the oven to 190°C/fan 170°C/gas mark 5.',
      'Peel, core and slice the apples into a large ovenproof dish.',
      'Add the caster sugar, lemon zest and cinnamon, and mix well.',
      'For the crumble topping, mix the flour and butter together until it resembles breadcrumbs.',
      'Stir in the demerara sugar and oats.',
      'Sprinkle the crumble mixture over the apples and bake for 30-35 mins until golden and bubbling.',
      'Serve with custard or ice cream.'
    ]
  },
  {
    id: '5',
    title: 'Lamb Biryani',
    image: 'https://www.themealdb.com/images/media/meals/xrttsx1487339558.jpg',
    description: 'A fragrant Indian rice dish with tender lamb in aromatic spices.',
    cookTime: '1 hour 30 minutes',
    servings: '6',
    area: 'Indian',
    category: 'Lamb',
    ingredients: [
      { name: 'Lamb', measure: '500g diced' },
      { name: 'Basmati Rice', measure: '300g' },
      { name: 'Onion', measure: '2 sliced' },
      { name: 'Garlic', measure: '4 cloves minced' },
      { name: 'Ginger', measure: '2cm piece grated' },
      { name: 'Garam Masala', measure: '2 tsp' },
      { name: 'Ground Cumin', measure: '1 tsp' },
      { name: 'Ground Coriander', measure: '1 tsp' },
      { name: 'Turmeric', measure: '1/2 tsp' },
      { name: 'Cardamom Pods', measure: '6 crushed' },
      { name: 'Cinnamon Stick', measure: '1' },
      { name: 'Bay Leaves', measure: '2' },
      { name: 'Natural Yogurt', measure: '150g' },
      { name: 'Tomatoes', measure: '2 chopped' },
      { name: 'Fresh Coriander', measure: 'handful chopped' },
      { name: 'Fresh Mint', measure: 'handful chopped' },
      { name: 'Saffron', measure: 'pinch' },
      { name: 'Milk', measure: '2 tbsp warm' }
    ],
    instructions: [
      'Marinate the lamb in yogurt, half the garam masala, half the cumin, half the coriander, and half the turmeric for at least 1 hour.',
      'Soak the saffron in warm milk and set aside.',
      'Rinse the rice until the water runs clear, then soak for 30 mins. Drain well.',
      'Heat oil in a large pan and fry the onions until golden. Remove half and set aside.',
      'Add the garlic and ginger to the pan and cook for 1 min.',
      'Add the remaining spices, cardamom, cinnamon and bay leaves and cook for 1 min more.',
      'Add the marinated lamb and cook for 5 mins until browned.',
      'Add the tomatoes and cook for 5 mins until softened.',
      'Add 300ml water, cover and simmer for 30 mins until the lamb is tender.',
      'Meanwhile, cook the rice in boiling water for 5 mins until just tender. Drain well.',
      'In a large ovenproof dish, layer half the rice, then the lamb mixture, then the remaining rice.',
      'Drizzle over the saffron milk and scatter with the reserved fried onions, fresh coriander and mint.',
      'Cover tightly with foil and bake at 180°C/fan 160°C/gas mark 4 for 20 mins.',
      'Serve with raita and naan bread.'
    ]
  }
];

// Mock data for categories
const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Beef',
    image: 'https://www.themealdb.com/images/category/beef.png',
    description: 'Beef is the culinary name for meat from cattle, particularly skeletal muscle.'
  },
  {
    id: '2',
    name: 'Chicken',
    image: 'https://www.themealdb.com/images/category/chicken.png',
    description: 'Chicken is a type of domesticated fowl, a subspecies of the red junglefowl.'
  },
  {
    id: '3',
    name: 'Dessert',
    image: 'https://www.themealdb.com/images/category/dessert.png',
    description: 'Dessert is a course that concludes a meal. The course usually consists of sweet foods.'
  },
  {
    id: '4',
    name: 'Lamb',
    image: 'https://www.themealdb.com/images/category/lamb.png',
    description: 'Lamb, hogget, and mutton are the meat of domestic sheep at different ages.'
  },
  {
    id: '5',
    name: 'Seafood',
    image: 'https://www.themealdb.com/images/category/seafood.png',
    description: 'Seafood is any form of sea life regarded as food by humans.'
  }
];

// Recipe Service functions
export const RecipeService = {
  // Get all recipes
  getRecipes: (): Recipe[] => {
    return mockRecipes;
  },

  // Get recipe by ID
  getRecipeById: (id: string): Recipe | undefined => {
    return mockRecipes.find(recipe => recipe.id === id);
  },

  // Get recipes by category
  getRecipesByCategory: (category: string): Recipe[] => {
    return mockRecipes.filter(recipe => recipe.category === category);
  },

  // Get random recipes
  getRandomRecipes: (count: number = 5): Recipe[] => {
    const shuffled = [...mockRecipes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  // Get a random recipe for featured section
  getRandomRecipe: (): Recipe => {
    const randomIndex = Math.floor(Math.random() * mockRecipes.length);
    return mockRecipes[randomIndex];
  },

  // Get all categories
  getCategories: (): Category[] => {
    return mockCategories;
  },

  // Search recipes by title
  searchRecipes: (query: string): Recipe[] => {
    const lowercaseQuery = query.toLowerCase();
    return mockRecipes.filter(recipe => 
      recipe.title.toLowerCase().includes(lowercaseQuery) ||
      recipe.description.toLowerCase().includes(lowercaseQuery)
    );
  },

  // Add a new recipe (for CRUD operations)
  addRecipe: (recipe: Omit<Recipe, 'id'>): Recipe => {
    const newRecipe = {
      ...recipe,
      id: (mockRecipes.length + 1).toString()
    };
    mockRecipes.push(newRecipe);
    return newRecipe;
  },

  // Update a recipe
  updateRecipe: (id: string, recipeData: Partial<Recipe>): Recipe | undefined => {
    const index = mockRecipes.findIndex(recipe => recipe.id === id);
    if (index !== -1) {
      mockRecipes[index] = { ...mockRecipes[index], ...recipeData };
      return mockRecipes[index];
    }
    return undefined;
  },

  // Delete a recipe
  deleteRecipe: (id: string): boolean => {
    const index = mockRecipes.findIndex(recipe => recipe.id === id);
    if (index !== -1) {
      mockRecipes.splice(index, 1);
      return true;
    }
    return false;
  }
};