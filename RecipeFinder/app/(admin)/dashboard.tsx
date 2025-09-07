import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { AdminService } from '../../services/adminService';
import LoadingSpinner from '../../components/LoadingSpinner';
import LogoutModal from '../../components/ui/LogoutModal';

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
  const [pendingEditsCount, setPendingEditsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/home');
      return;
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const stats = await AdminService.getAdminStats();
      const allPendingRecipes = await AdminService.getAllPendingRecipes();
      
      // Separate new recipes from edits
      const newRecipes = allPendingRecipes.filter(recipe => recipe.status === 'pending');
      const pendingEdits = allPendingRecipes.filter(recipe => recipe.status === 'pending_edit');
      
      setPendingRecipesCount(newRecipes.length);
      setPendingEditsCount(pendingEdits.length);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', `Failed to load dashboard data: ${error?.message || 'Unknown error'}`);
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
    setLogoutModalVisible(true);
  };

  const handleCancelLogout = () => {
    setLogoutModalVisible(false);
  };




  const statCards: StatCard[] = [
    {
      title: 'New Pending Recipes',
      value: pendingRecipesCount,
      icon: 'add-circle-outline',
      color: '#FF9500',
      onPress: () => router.push('/(admin)/pending-recipes?filter=new'),
    },
    {
      title: 'Pending Recipe Edits',
      value: pendingEditsCount,
      icon: 'create-outline',
      color: '#007AFF',
      onPress: () => router.push('/(admin)/pending-recipes?filter=edits'),
    },
    {
      title: 'Total Pending Items',
      value: pendingRecipesCount + pendingEditsCount,
      icon: 'time-outline',
      color: '#34C759',
      onPress: () => router.push('/(admin)/pending-recipes?filter=all'),
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
              <Text style={styles.actionTitle}>Review Pending Items</Text>
              <Text style={styles.actionSubtitle}>
                {pendingRecipesCount + pendingEditsCount} items waiting for approval
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

        </View>
      </ScrollView>
      
      {/* Logout Confirmation Modal */}
       <LogoutModal
         visible={logoutModalVisible}
         onCancel={handleCancelLogout}
         message="Are you sure you want to logout from admin dashboard?"
       />
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