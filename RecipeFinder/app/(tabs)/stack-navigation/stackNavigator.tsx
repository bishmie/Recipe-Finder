import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native'
import React from 'react'
import SplashScreen from '@/components/ui/screen/splashScreen';
const Stack = createStackNavigator();
export default function stackNavigator(){
  return (
   <Stack.Screen name={'Welcome'}
                    options={{ headerLeft: () => null, headerShown: false }}
                    component={SplashScreen} />
  )
}