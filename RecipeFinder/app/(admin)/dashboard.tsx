import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { RecipeService } from '../../services/recipeService';
import { LocalRecipeService } from '../../services/localRecipeService';
import LoadingSpinner from '../../components/LoadingSpinner';

interface StatCard {
  title: string;
  value: number;
  icon: string;
  color: string;
  onPress?: () => void;
}

const AdminDashboard = () => {
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const [pendingRecipesCount, setPendingRecipesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [localPendingCount, setLocalPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/home');
      return;
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [pendingRecipes, localRecipes] = await Promise.all([
        RecipeService.getPendingRecipes(),
        LocalRecipeService.getLocalRecipes()
      ]);
      setPendingRecipesCount(pendingRecipes.length);
      setLocalPendingCount(localRecipes.length);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };




  const statCards: StatCard[] = [
    {
      title: 'Pending Recipes',
      value: pendingRecipesCount + localPendingCount,
      icon: 'time-outline',
      color: '#FF9500',
      onPress: () => router.push('/(admin)/pending-recipes'),
    },
  ];

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
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, Admin!</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          {statCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.statCard, { borderLeftColor: card.color }]}
              onPress={card.onPress}
              disabled={!card.onPress}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statCardHeader}>
                  <Ionicons name={card.icon as any} size={24} color={card.color} />
                  <Text style={styles.statValue}>{card.value}</Text>
                </View>
                <Text style={styles.statTitle}>{card.title}</Text>
              </View>
              {card.onPress && (
                <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/pending-recipes')}
          >
            <Ionicons name="time-outline" size={24} color={COLORS.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Review Pending Recipes</Text>
              <Text style={styles.actionSubtitle}>
                {pendingRecipesCount + localPendingCount} recipes waiting for approval
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(admin)/all-recipes')}
          >
            <Ionicons name="restaurant-outline" size={24} color={COLORS.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage All Recipes</Text>
              <Text style={styles.actionSubtitle}>
                View and manage all recipes in the system
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardContent: {
    flex: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 12,
  },
  statTitle: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});

export default AdminDashboard;