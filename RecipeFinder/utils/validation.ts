import { ValidationResult, FormErrors } from '../types/user';

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Display name validation
export const validateDisplayName = (displayName: string): boolean => {
  return displayName.trim().length >= 2 && displayName.trim().length <= 50;
};

// Phone number validation
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// URL validation
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// YouTube URL validation
export const validateYouTubeUrl = (url: string): boolean => {
  if (!url) return true; // Optional field
  const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
};

// Recipe title validation
export const validateRecipeTitle = (title: string): boolean => {
  return title.trim().length >= 3 && title.trim().length <= 100;
};

// Recipe description validation
export const validateRecipeDescription = (description: string): boolean => {
  return description.trim().length >= 10 && description.trim().length <= 1000;
};

// Cook time validation
export const validateCookTime = (cookTime: string): boolean => {
  const timeRegex = /^\d+\s*(min|mins|minute|minutes|hour|hours|hr|hrs)$/i;
  return timeRegex.test(cookTime.trim());
};

// Servings validation
export const validateServings = (servings: string): boolean => {
  const servingsNum = parseInt(servings);
  return !isNaN(servingsNum) && servingsNum > 0 && servingsNum <= 50;
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>"'&]/g, '') // Remove potentially harmful characters
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
};

// Sanitize HTML content
export const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// Validate form data
export const validateForm = (data: Record<string, any>, rules: Record<string, (value: any) => boolean>): FormErrors => {
  const errors: FormErrors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const validator = rules[field];
    
    if (!validator(value)) {
      errors[field] = `Invalid ${field}`;
    }
  });
  
  return errors;
};

// Validate recipe ingredients
export const validateIngredients = (ingredients: Array<{name: string, measure: string}>): boolean => {
  if (!ingredients || ingredients.length === 0) return false;
  
  return ingredients.every(ingredient => 
    ingredient.name.trim().length > 0 && 
    ingredient.measure.trim().length > 0
  );
};

// Validate recipe instructions
export const validateInstructions = (instructions: string[]): boolean => {
  if (!instructions || instructions.length === 0) return false;
  
  return instructions.every(instruction => 
    instruction.trim().length >= 10
  );
};

// Validate verification code
export const validateVerificationCode = (code: string): boolean => {
  const codeRegex = /^\d{6}$/;
  return codeRegex.test(code.trim());
};

// Validate category name
export const validateCategoryName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 30;
};

// Validate image URL
export const validateImageUrl = (url: string): boolean => {
  if (!url) return true; // Optional field
  const imageRegex = /\.(jpg|jpeg|png|gif|webp)$/i;
  return validateUrl(url) && imageRegex.test(url);
};

// Password confirmation validation
export const validatePasswordConfirmation = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword && password.length > 0;
};

// Comprehensive user registration validation
export const validateUserRegistration = (userData: {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!validateEmail(userData.email)) {
    errors.push('Please enter a valid email address');
  }
  
  const passwordValidation = validatePassword(userData.password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }
  
  if (!validatePasswordConfirmation(userData.password, userData.confirmPassword)) {
    errors.push('Passwords do not match');
  }
  
  if (!validateDisplayName(userData.displayName)) {
    errors.push('Display name must be between 2 and 50 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Comprehensive recipe validation
export const validateRecipe = (recipeData: {
  title: string;
  description: string;
  cookTime: string;
  servings: string;
  ingredients: Array<{name: string, measure: string}>;
  instructions: string[];
  videoUrl?: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!validateRecipeTitle(recipeData.title)) {
    errors.push('Recipe title must be between 3 and 100 characters');
  }
  
  if (!validateRecipeDescription(recipeData.description)) {
    errors.push('Recipe description must be between 10 and 1000 characters');
  }
  
  if (!validateCookTime(recipeData.cookTime)) {
    errors.push('Please enter a valid cook time (e.g., "30 mins", "1 hour")');
  }
  
  if (!validateServings(recipeData.servings)) {
    errors.push('Servings must be a number between 1 and 50');
  }
  
  if (!validateIngredients(recipeData.ingredients)) {
    errors.push('Please add at least one ingredient with name and measure');
  }
  
  if (!validateInstructions(recipeData.instructions)) {
    errors.push('Please add at least one instruction with at least 10 characters');
  }
  
  if (recipeData.videoUrl && !validateYouTubeUrl(recipeData.videoUrl)) {
    errors.push('Please enter a valid YouTube URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Auth form validation
export const validateAuthForm = (data: {
  email: string;
  password: string;
  type: 'signin' | 'signup';
  confirmPassword?: string;
  displayName?: string;
}): FormErrors => {
  const errors: FormErrors = {};

  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long';
  }

  // Additional validation for signup
  if (data.type === 'signup') {
    if (data.confirmPassword !== undefined) {
      if (!validatePasswordConfirmation(data.password, data.confirmPassword)) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    if (data.displayName !== undefined) {
      if (!data.displayName) {
        errors.displayName = 'Display name is required';
      } else if (!validateDisplayName(data.displayName)) {
        errors.displayName = 'Display name must be between 2 and 50 characters';
      }
    }
  }

  return errors;
};

export default {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validatePhoneNumber,
  validateUrl,
  validateYouTubeUrl,
  validateRecipeTitle,
  validateRecipeDescription,
  validateCookTime,
  validateServings,
  sanitizeInput,
  sanitizeHtml,
  validateForm,
  validateIngredients,
  validateInstructions,
  validateVerificationCode,
  validateCategoryName,
  validateImageUrl,
  validatePasswordConfirmation,
  validateUserRegistration,
  validateRecipe,
  validateAuthForm
};