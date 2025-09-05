import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { useAuth } from '../../../hooks/useAuth';
import { RecipeService } from '../../../services/recipeService';
import { LocalRecipeService } from '../../../services/localRecipeService';
import type { LocalRecipe } from '../../../services/localRecipeService';
import { Recipe } from '../../../types/user';
import SafeScreen from '../../../components/SafeScreen';

interface EditableIngredient {
  name: string;
  measure: string;
}

interface EditableRecipe {
  title: string;
  description: string;
  image: string;
  cookTime: string;
  servings: string;
  category: string;
  area: string;
  youtubeUrl: string;
  ingredients: EditableIngredient[];
  instructions: string[];
}

const EditRecipeScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalRecipe, setOriginalRecipe] = useState<Recipe | null>(null);
  const [recipe, setRecipe] = useState<EditableRecipe>({
    title: '',
    description: '',
    image: '',
    cookTime: '',
    servings: '',
    category: '',
    area: '',
    youtubeUrl: '',
    ingredients: [{ name: '', measure: '' }],
    instructions: [''],
  });

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    if (!id) {
      Alert.alert('Error', 'Recipe ID is missing');
      router.back();
      return;
    }

    try {
      setLoading(true);
      let recipeData: Recipe | LocalRecipe | null = null;
      
      // Check if it's a local recipe
      if (id.startsWith('local_')) {
        const localRecipe = await LocalRecipeService.getLocalRecipeById(id);
        if (localRecipe) {
          // Convert LocalRecipe to Recipe format
          recipeData = {
            id: localRecipe.id,
            title: localRecipe.title,
            description: localRecipe.description,
            image: localRecipe.image,
            cookTime: localRecipe.cookTime,
            servings: localRecipe.servings,
            category: localRecipe.category,
            area: localRecipe.area,
            youtubeUrl: localRecipe.videoUrl,
            ingredients: localRecipe.ingredients,
            instructions: localRecipe.instructions,
            userId: localRecipe.userId,
            status: 'local_pending' as any,
            createdAt: localRecipe.createdAt,
            updatedAt: localRecipe.createdAt
          };
        }
      } else {
        // Load from Firebase
        recipeData = await RecipeService.getRecipeById(id);
      }
      
      if (!recipeData) {
        Alert.alert('Error', 'Recipe not found');
        router.back();
        return;
      }

      // Check if user owns this recipe
      if (recipeData.userId !== user?.uid) {
        Alert.alert('Error', 'You can only edit your own recipes');
        router.back();
        return;
      }

      setOriginalRecipe(recipeData);
      setRecipe({
        title: recipeData.title || '',
        description: recipeData.description || '',
        image: recipeData.image || '',
        cookTime: recipeData.cookTime || '',
        servings: recipeData.servings || '',
        category: recipeData.category || '',
        area: recipeData.area || '',
        youtubeUrl: recipeData.youtubeUrl || '',
        ingredients: recipeData.ingredients?.length > 0 
          ? recipeData.ingredients.map(ing => ({ name: ing.name || '', measure: ing.measure || '' }))
          : [{ name: '', measure: '' }],
        instructions: recipeData.instructions?.length > 0 
          ? recipeData.instructions 
          : [''],
      });
    } catch (error) {
      console.error('Error loading recipe:', error);
      Alert.alert('Error', 'Failed to load recipe');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    setRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', measure: '' }]
    }));
  };

  const removeIngredient = (index: number) => {
    if (recipe.ingredients.length > 1) {
      setRecipe(prev => ({
        ...prev,
        ingredients: prev.ingredients.filter((_, i) => i !== index)
      }));
    }
  };

  const updateIngredient = (index: number, field: 'name' | 'measure', value: string) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const addInstruction = () => {
    setRecipe(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const removeInstruction = (index: number) => {
    if (recipe.instructions.length > 1) {
      setRecipe(prev => ({
        ...prev,
        instructions: prev.instructions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateInstruction = (index: number, value: string) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? value : inst
      )
    }));
  };

  const validateRecipe = (): boolean => {
    if (!recipe.title.trim()) {
      Alert.alert('Validation Error', 'Recipe title is required');
      return false;
    }
    if (!recipe.description.trim()) {
      Alert.alert('Validation Error', 'Recipe description is required');
      return false;
    }
    
    const validIngredients = recipe.ingredients.filter(ing => ing.name.trim());
    if (validIngredients.length === 0) {
      Alert.alert('Validation Error', 'At least one ingredient is required');
      return false;
    }
    
    const validInstructions = recipe.instructions.filter(inst => inst.trim());
    if (validInstructions.length === 0) {
      Alert.alert('Validation Error', 'At least one instruction is required');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateRecipe() || !originalRecipe) return;

    try {
      setSaving(true);
      
      // Filter out empty ingredients and instructions
      const validIngredients = recipe.ingredients.filter(ing => ing.name.trim());
      const validInstructions = recipe.instructions.filter(inst => inst.trim());
      
      let success = false;
      
      // Check if it's a local recipe
      if (id!.startsWith('local_')) {
        // Update local recipe
        const updatedLocalRecipe: Partial<LocalRecipe> = {
          title: recipe.title.trim(),
          description: recipe.description.trim(),
          image: recipe.image.trim(),
          cookTime: recipe.cookTime.trim(),
          servings: recipe.servings.trim(),
          category: recipe.category.trim(),
          area: recipe.area.trim(),
          videoUrl: recipe.youtubeUrl.trim(),
          ingredients: validIngredients,
          instructions: validInstructions,
        };
        
        success = await LocalRecipeService.updateLocalRecipe(id!, updatedLocalRecipe);
      } else {
        // Update Firebase recipe
        const updatedRecipe: Partial<Recipe> = {
          title: recipe.title.trim(),
          description: recipe.description.trim(),
          image: recipe.image.trim(),
          cookTime: recipe.cookTime.trim(),
          servings: recipe.servings.trim(),
          category: recipe.category.trim(),
          area: recipe.area.trim(),
          youtubeUrl: recipe.youtubeUrl.trim(),
          ingredients: validIngredients,
          instructions: validInstructions,
          // If the recipe was previously approved, set it back to pending when edited
          status: originalRecipe.status === 'approved' ? 'pending' : originalRecipe.status,
          updatedAt: new Date(),
        };

        success = await RecipeService.updateRecipe(id!, updatedRecipe);
      }
      
      if (success) {
        let statusMessage = 'Recipe updated successfully!';
        
        if (!id!.startsWith('local_') && originalRecipe.status === 'approved') {
          statusMessage = 'Recipe updated successfully! It will be reviewed again before being published.';
        }
        
        Alert.alert('Success', statusMessage, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to update recipe');
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      Alert.alert('Error', 'Failed to update recipe');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Recipe</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {originalRecipe?.status === 'approved' && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={20} color="#FF9500" />
            <Text style={styles.warningText}>
              This recipe is published. Editing will require admin approval again.
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Recipe Title *</Text>
          <TextInput
            style={styles.input}
            value={recipe.title}
            onChangeText={(text) => setRecipe(prev => ({ ...prev, title: text }))}
            placeholder="Enter recipe title"
            editable={!saving}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={recipe.description}
            onChangeText={(text) => setRecipe(prev => ({ ...prev, description: text }))}
            placeholder="Enter recipe description"
            multiline
            numberOfLines={3}
            editable={!saving}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Image URL</Text>
          <TextInput
            style={styles.input}
            value={recipe.image}
            onChangeText={(text) => setRecipe(prev => ({ ...prev, image: text }))}
            placeholder="Enter image URL (optional)"
            editable={!saving}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Cook Time</Text>
            <TextInput
              style={styles.input}
              value={recipe.cookTime}
              onChangeText={(text) => setRecipe(prev => ({ ...prev, cookTime: text }))}
              placeholder="e.g., 30 mins"
              editable={!saving}
            />
          </View>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Servings</Text>
            <TextInput
              style={styles.input}
              value={recipe.servings}
              onChangeText={(text) => setRecipe(prev => ({ ...prev, servings: text }))}
              placeholder="e.g., 4 people"
              editable={!saving}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={recipe.category}
              onChangeText={(text) => setRecipe(prev => ({ ...prev, category: text }))}
              placeholder="e.g., Dessert"
              editable={!saving}
            />
          </View>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Cuisine</Text>
            <TextInput
              style={styles.input}
              value={recipe.area}
              onChangeText={(text) => setRecipe(prev => ({ ...prev, area: text }))}
              placeholder="e.g., Italian"
              editable={!saving}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>YouTube URL</Text>
          <TextInput
            style={styles.input}
            value={recipe.youtubeUrl}
            onChangeText={(text) => setRecipe(prev => ({ ...prev, youtubeUrl: text }))}
            placeholder="Enter YouTube video URL (optional)"
            editable={!saving}
          />
        </View>

        {/* Ingredients Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredients *</Text>
            <TouchableOpacity onPress={addIngredient} style={styles.addButton} disabled={saving}>
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {recipe.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <View style={styles.ingredientInputs}>
                <TextInput
                  style={[styles.input, styles.ingredientName]}
                  value={ingredient.name}
                  onChangeText={(text) => updateIngredient(index, 'name', text)}
                  placeholder="Ingredient name"
                  editable={!saving}
                />
                <TextInput
                  style={[styles.input, styles.ingredientMeasure]}
                  value={ingredient.measure}
                  onChangeText={(text) => updateIngredient(index, 'measure', text)}
                  placeholder="Amount"
                  editable={!saving}
                />
              </View>
              {recipe.ingredients.length > 1 && (
                <TouchableOpacity 
                  onPress={() => removeIngredient(index)} 
                  style={styles.removeButton}
                  disabled={saving}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Instructions Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Instructions *</Text>
            <TouchableOpacity onPress={addInstruction} style={styles.addButton} disabled={saving}>
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {recipe.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.instructionInput]}
                value={instruction}
                onChangeText={(text) => updateInstruction(index, text)}
                placeholder={`Step ${index + 1} instructions`}
                multiline
                numberOfLines={2}
                editable={!saving}
              />
              {recipe.instructions.length > 1 && (
                <TouchableOpacity 
                  onPress={() => removeInstruction(index)} 
                  style={styles.removeButton}
                  disabled={saving}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ingredientInputs: {
    flex: 1,
    flexDirection: 'row',
  },
  ingredientName: {
    flex: 2,
    marginRight: 10,
  },
  ingredientMeasure: {
    flex: 1,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 6,
  },
  stepNumberText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  instructionInput: {
    flex: 1,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default EditRecipeScreen;