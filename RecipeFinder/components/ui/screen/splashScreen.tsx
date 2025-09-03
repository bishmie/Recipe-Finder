import { useEffect } from "react"; 
 import { View, Image, Text } from "react-native"; 
 import { StatusBar } from "expo-status-bar"; 
 import { heightPercentageToDP as hp } from "react-native-responsive-screen"; 
 import Animated, { useSharedValue, withSpring } from "react-native-reanimated"; 
 import { useNavigation } from "@react-navigation/native"; 
 import { styles } from "../../../assets/styles/splash.styles";
 
 export default function SplashScreen() { 
   const ringPadding1 = useSharedValue(0); 
   const ringPadding2 = useSharedValue(0); 
 
   const navigation = useNavigation(); 
 
   useEffect(() => { 
     ringPadding1.value = 0; 
     ringPadding2.value = 0; 
 
     setTimeout(() => { 
       ringPadding1.value = withSpring(ringPadding1.value + hp(5.3)); 
     }, 100); 
 
     setTimeout(() => { 
       ringPadding2.value = withSpring(ringPadding2.value + hp(5.5)); 
     }, 300); 
 
    //  setTimeout(() => navigation.navigate("Home"), 2500); 
   }, []); 
 
   return ( 
     <View style={styles.container}> 
       <StatusBar style="light" /> 
 
       {/* Logo */} 
       <Animated.View 
         style={[styles.ringOuter, { padding: ringPadding2 }]} 
       > 
         <Animated.View 
           style={[styles.ringInner, { padding: ringPadding1 }]} 
         > 
           <Image 
             source={require("../../../assets/images/Welcome.png")} 
             style={{ width: hp(20), height: hp(20) }} 
           /> 
         </Animated.View> 
       </Animated.View> 
 
       {/* Title */} 
       <View style={styles.titleContainer}> 
         <Text style={styles.title}>FoodCoast</Text> 
         <Text style={styles.subtitle}>Food Heals</Text> 
       </View> 
     </View> 
   ); 
 }