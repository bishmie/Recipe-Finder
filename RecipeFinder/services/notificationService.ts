import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Collections
const NOTIFICATION_TOKENS_COLLECTION = 'notification_tokens';
const ADMIN_TOKENS_COLLECTION = 'admin_tokens';

// Types
export interface NotificationData {
  type: 'recipe_approved' | 'recipe_declined' | 'new_recipe_submitted';
  recipeId: string;
  recipeName: string;
  reason?: string; // For declined recipes
  userId?: string; // For admin notifications
}

export interface NotificationToken {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  updatedAt: Date;
}

export const NotificationService = {
  // Request notification permissions
  requestPermissions: async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  },

  // Get and store notification token
  registerForPushNotifications: async (): Promise<string | null> => {
    try {
      if (!auth.currentUser) {
        console.log('No authenticated user found');
        return null;
      }

      // Request permissions first
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your actual project ID
      });

      if (!token.data) {
        console.log('Failed to get push token');
        return null;
      }

      // Store token in Firebase
      await NotificationService.storeNotificationToken(token.data);
      
      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  },

  // Store notification token in Firebase
  storeNotificationToken: async (token: string): Promise<void> => {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated');
      }

      const userId = auth.currentUser.uid;
      const platform = Platform.OS as 'ios' | 'android';
      
      const tokenData: NotificationToken = {
        userId,
        token,
        platform,
        updatedAt: new Date()
      };

      // Store in user tokens collection
      await setDoc(doc(db, NOTIFICATION_TOKENS_COLLECTION, userId), tokenData);
      
      // If user is admin, also store in admin tokens collection
      const adminEmails = [
        'bishmimalshi@gmail.com',
        'admin@recipefinder.com',
      ];
      
      if (auth.currentUser.email && adminEmails.includes(auth.currentUser.email)) {
        await setDoc(doc(db, ADMIN_TOKENS_COLLECTION, userId), tokenData);
      }
      
      console.log('Notification token stored successfully');
    } catch (error) {
      console.error('Error storing notification token:', error);
      throw error;
    }
  },

  // Get user's notification token
  getUserToken: async (userId: string): Promise<string | null> => {
    try {
      const tokenDoc = await getDoc(doc(db, NOTIFICATION_TOKENS_COLLECTION, userId));
      if (tokenDoc.exists()) {
        const data = tokenDoc.data() as NotificationToken;
        return data.token;
      }
      return null;
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  },

  // Get all admin tokens
  getAdminTokens: async (): Promise<string[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, ADMIN_TOKENS_COLLECTION));
      const tokens: string[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as NotificationToken;
        tokens.push(data.token);
      });
      
      return tokens;
    } catch (error) {
      console.error('Error getting admin tokens:', error);
      return [];
    }
  },

  // Send notification to user when recipe is approved
  notifyRecipeApproved: async (userId: string, recipeName: string, recipeId: string): Promise<void> => {
    try {
      const token = await NotificationService.getUserToken(userId);
      if (!token) {
        console.log('No notification token found for user:', userId);
        return;
      }

      const message = {
        to: token,
        sound: 'default',
        title: '🎉 Recipe Approved!',
        body: `Your recipe "${recipeName}" has been approved and is now published!`,
        data: {
          type: 'recipe_approved',
          recipeId,
          recipeName
        } as NotificationData,
      };

      await NotificationService.sendPushNotification(message);
    } catch (error) {
      console.error('Error sending recipe approved notification:', error);
    }
  },

  // Send notification to user when recipe is declined
  notifyRecipeDeclined: async (userId: string, recipeName: string, recipeId: string, reason?: string): Promise<void> => {
    try {
      const token = await NotificationService.getUserToken(userId);
      if (!token) {
        console.log('No notification token found for user:', userId);
        return;
      }

      const message = {
        to: token,
        sound: 'default',
        title: '❌ Recipe Declined',
        body: `Your recipe "${recipeName}" was declined${reason ? `: ${reason}` : '.'}`,
        data: {
          type: 'recipe_declined',
          recipeId,
          recipeName,
          reason
        } as NotificationData,
      };

      await NotificationService.sendPushNotification(message);
    } catch (error) {
      console.error('Error sending recipe declined notification:', error);
    }
  },

  // Send notification to admins when new recipe is submitted
  notifyAdminsNewRecipe: async (recipeName: string, recipeId: string, userId: string): Promise<void> => {
    try {
      const adminTokens = await NotificationService.getAdminTokens();
      if (adminTokens.length === 0) {
        console.log('No admin tokens found');
        return;
      }

      const messages = adminTokens.map(token => ({
        to: token,
        sound: 'default',
        title: '📝 New Recipe Submitted',
        body: `A new recipe "${recipeName}" has been submitted for review.`,
        data: {
          type: 'new_recipe_submitted',
          recipeId,
          recipeName,
          userId
        } as NotificationData,
      }));

      // Send notifications to all admins
      await Promise.all(messages.map(message => NotificationService.sendPushNotification(message)));
    } catch (error) {
      console.error('Error sending new recipe notification to admins:', error);
    }
  },

  // Send push notification via Expo's push service
  sendPushNotification: async (message: any): Promise<void> => {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      if (result.errors) {
        console.error('Push notification errors:', result.errors);
      } else {
        console.log('Push notification sent successfully:', result);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  },

  // Handle notification received while app is running
  addNotificationReceivedListener: (handler: (notification: Notifications.Notification) => void) => {
    return Notifications.addNotificationReceivedListener(handler);
  },

  // Handle notification response (when user taps notification)
  addNotificationResponseReceivedListener: (handler: (response: Notifications.NotificationResponse) => void) => {
    return Notifications.addNotificationResponseReceivedListener(handler);
  },

  // Remove notification token (for logout)
  removeNotificationToken: async (): Promise<void> => {
    try {
      if (!auth.currentUser) {
        return;
      }

      const userId = auth.currentUser.uid;
      
      // Remove from both collections
      await Promise.all([
        setDoc(doc(db, NOTIFICATION_TOKENS_COLLECTION, userId), { token: null, updatedAt: new Date() }, { merge: true }),
        setDoc(doc(db, ADMIN_TOKENS_COLLECTION, userId), { token: null, updatedAt: new Date() }, { merge: true })
      ]);
      
      console.log('Notification token removed successfully');
    } catch (error) {
      console.error('Error removing notification token:', error);
    }
  }
};