import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { addRecipeModalStyles as styles } from '../../assets/styles/addRecipeModalStyles';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import type { Ingredient, Recipe } from '../../services/recipeService';
import { RecipeService } from '../../services/recipeService';
import { CategoryPicker } from './CategoryPicker';

interface AddRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeAdded?: (recipe: Recipe) => void;
  editMode?: boolean;
  existingRecipe?: Recipe;
  onRecipeUpdated?: (recipe: Recipe) => void;
}

interface IngredientInput {
  id: string;
  name: string;
  measure: string;
}

interface InstructionInput {
  id: string;
  text: string;
}

export const AddRecipeModal: React.FC<AddRecipeModalProps> = ({
  visible,
  onClose,
  onRecipeAdded,
  editMode = false,
  existingRecipe,
  onRecipeUpdated,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [category, setCategory] = useState('');
  const [area, setArea] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { id: '1', name: '', measure: '' }
  ]);
  const [instructions, setInstructions] = useState<InstructionInput[]>([
    { id: '1', text: '' }
  ]);
  const [loading, setLoading] = useState(false);

  // Pre-populate form fields when editing
  useEffect(() => {
    if (editMode && existingRecipe) {
      setTitle(existingRecipe.title || '');
      setDescription(existingRecipe.description || '');
      setImage(existingRecipe.image || '');
      setCookTime(existingRecipe.cookTime || '');
      setServings(existingRecipe.servings || '');
      setCategory(existingRecipe.category || '');
      setArea(existingRecipe.area || '');
      setVideoUrl(existingRecipe.youtubeUrl || '');
      
      // Convert ingredients
      if (existingRecipe.ingredients && existingRecipe.ingredients.length > 0) {
        const convertedIngredients = existingRecipe.ingredients.map((ing, index) => ({
          id: (index + 1).toString(),
          name: ing.name || '',
          measure: ing.measure || ''
        }));
        setIngredients(convertedIngredients);
      }
      
      // Convert instructions
      if (existingRecipe.instructions && existingRecipe.instructions.length > 0) {
        const convertedInstructions = existingRecipe.instructions.map((inst, index) => ({
          id: (index + 1).toString(),
          text: inst || ''
        }));
        setInstructions(convertedInstructions);
      }
    } else {
      // Reset form when not editing
      resetForm();
    }
  }, [editMode, existingRecipe, visible]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImage('');
    setCookTime('');
    setServings('');
    setCategory('');
    setArea('');
    setVideoUrl('');
    setIngredients([{ id: '1', name: '', measure: '' }]);
    setInstructions([{ id: '1', text: '' }]);
  };

  const validateYouTubeUrl = (url: string): boolean => {
    if (!url) return true; // Optional field
    const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const addIngredient = () => {
    const newId = (ingredients.length + 1).toString();
    setIngredients([...ingredients, { id: newId, name: '', measure: '' }]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: 'name' | 'measure', value: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const addInstruction = () => {
    const newId = (instructions.length + 1).toString();
    setInstructions([...instructions, { id: newId, text: '' }]);
  };

  const removeInstruction = (id: string) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter(inst => inst.id !== id));
    }
  };

  const updateInstruction = (id: string, value: string) => {
    setInstructions(instructions.map(inst => 
      inst.id === id ? { ...inst, text: value } : inst
    ));
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Error', 'Recipe title is required');
      return false;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Recipe description is required');
      return false;
    }

    if (!category.trim()) {
      Alert.alert('Error', 'Please select a category for your recipe');
      return false;
    }

    const validIngredients = ingredients.filter(ing => ing.name.trim() && ing.measure.trim());
    if (validIngredients.length === 0) {
      Alert.alert('Error', 'At least one ingredient with name and measure is required');
      return false;
    }

    const validInstructions = instructions.filter(inst => inst.text.trim());
    if (validInstructions.length === 0) {
      Alert.alert('Error', 'At least one instruction is required');
      return false;
    }

    if (videoUrl && !validateYouTubeUrl(videoUrl)) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to save a recipe');
      return;
    }

    setLoading(true);
    try {
      const validIngredients: Ingredient[] = ingredients
        .filter(ing => ing.name.trim() && ing.measure.trim())
        .map(ing => ({
          name: ing.name.trim(),
          measure: ing.measure.trim()
        }));

      const validInstructions: string[] = instructions
        .filter(inst => inst.text.trim())
        .map(inst => inst.text.trim());

      if (editMode && existingRecipe) {
        // Update existing pending recipe
        await RecipeService.updatePendingRecipe(existingRecipe.id, {
          title: title.trim(),
          description: description.trim(),
          image: image.trim() || 'https://via.placeholder.com/300x200?text=Recipe+Image',
          cookTime: cookTime.trim() || '30 mins',
          servings: servings.trim() || '4',
          category: category.trim(),
          area: area.trim(),
          ingredients: validIngredients,
          instructions: validInstructions,
          videoUrl: videoUrl.trim() || undefined
        });

        Alert.alert(
          'Recipe Updated!', 
          'Your recipe has been updated successfully.',
          [{ text: 'OK' }]
        );
        
        // Convert to Recipe format for parent component
        const recipeForParent: Recipe = {
          ...existingRecipe,
          title: title.trim(),
          description: description.trim(),
          image: image.trim() || 'https://via.placeholder.com/300x200?text=Recipe+Image',
          cookTime: cookTime.trim() || '30 mins',
          servings: servings.trim() || '4',
          category: category.trim(),
          area: area.trim(),
          ingredients: validIngredients,
          instructions: validInstructions,
          videoUrl: videoUrl.trim() || undefined,
          youtubeUrl: videoUrl.trim() || undefined,
          updatedAt: new Date().toISOString()
        };
        
        // Notify parent component and close modal
        onRecipeUpdated?.(recipeForParent);
        resetForm();
        onClose();
      } else {
        // Create new recipe as pending
        const pendingRecipe = await RecipeService.addPendingRecipe(user.uid, {
          title: title.trim(),
          description: description.trim(),
          image: image.trim() || 'https://via.placeholder.com/300x200?text=Recipe+Image',
          cookTime: cookTime.trim() || '30 mins',
          servings: servings.trim() || '4',
          category: category.trim(),
          area: area.trim(),
          ingredients: validIngredients,
          instructions: validInstructions,
          videoUrl: videoUrl.trim() || undefined
        });

        Alert.alert(
          'Recipe Saved!', 
          'Your recipe has been saved and will be submitted for admin approval. You can view it in your "My Recipes" section.',
          [{ text: 'OK' }]
        );
        
        // Convert pending recipe to Recipe format for parent component
        const recipeForParent: Recipe = {
          id: pendingRecipe.id!,
          title: pendingRecipe.title,
          description: pendingRecipe.description,
          image: pendingRecipe.image,
          cookTime: pendingRecipe.cookTime,
          servings: pendingRecipe.servings,
          category: pendingRecipe.category,
          area: pendingRecipe.area,
          youtubeUrl: pendingRecipe.videoUrl,
          ingredients: pendingRecipe.ingredients,
          instructions: pendingRecipe.instructions,
          userId: pendingRecipe.ownerId,
          status: 'pending' as any,
          createdAt: pendingRecipe.createdAt,
          updatedAt: pendingRecipe.updatedAt
        };
        
        // Notify parent component and close modal
        onRecipeAdded?.(recipeForParent);
        resetForm();
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', `Failed to save recipe: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {editMode ? 'Edit Recipe' : 'Add Recipe'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Recipe Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter recipe title"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter recipe description"
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={image}
              onChangeText={setImage}
              placeholder="Enter image URL (optional)"
              editable={!loading}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Cook Time</Text>
              <TextInput
                style={styles.input}
                value={cookTime}
                onChangeText={setCookTime}
                placeholder="e.g., 30 mins"
                editable={!loading}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Servings</Text>
              <TextInput
                style={styles.input}
                value={servings}
                onChangeText={setServings}
                placeholder="e.g., 4"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Category *</Text>
              <CategoryPicker
                selectedCategory={category}
                onCategorySelect={setCategory}
                disabled={loading}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Area/Cuisine</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="e.g., Italian"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>YouTube Video URL</Text>
            <TextInput
              style={styles.input}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://www.youtube.com/watch?v=... (optional)"
              editable={!loading}
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>Add a YouTube tutorial video for this recipe</Text>
          </View>

          {/* Ingredients Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingredients *</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={addIngredient}
                disabled={loading}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            {ingredients.map((ingredient, index) => (
              <View key={ingredient.id} style={styles.ingredientRow}>
                <View style={styles.ingredientInputs}>
                  <TextInput
                    style={[styles.input, styles.ingredientNameInput]}
                    value={ingredient.name}
                    onChangeText={(value) => updateIngredient(ingredient.id, 'name', value)}
                    placeholder="Ingredient name"
                    editable={!loading}
                  />
                  <TextInput
                    style={[styles.input, styles.ingredientMeasureInput]}
                    value={ingredient.measure}
                    onChangeText={(value) => updateIngredient(ingredient.id, 'measure', value)}
                    placeholder="Amount"
                    editable={!loading}
                  />
                </View>
                {ingredients.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeIngredient(ingredient.id)}
                    disabled={loading}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Instructions Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Instructions *</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={addInstruction}
                disabled={loading}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            {instructions.map((instruction, index) => (
              <View key={instruction.id} style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.instructionInput]}
                  value={instruction.text}
                  onChangeText={(value) => updateInstruction(instruction.id, value)}
                  placeholder={`Step ${index + 1} instructions`}
                  multiline
                  numberOfLines={2}
                  editable={!loading}
                />
                {instructions.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeInstruction(instruction.id)}
                    disabled={loading}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading || !title.trim() || !description.trim() || !category.trim()}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{editMode ? 'Update Recipe' : 'Add Recipe'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};