import { StyleSheet, Dimensions } from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { COLORS } from "../../constants/colors";

const { height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    height: height, // Use full device height
    width: '100%',
  },
  ringOuter: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 9999,
    marginBottom: hp(12), 
  },
  ringInner: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 9999,
  },
  titleContainer: {
    alignItems: "center",
    marginTop: hp(5),
  },
  title: {
    fontSize: hp(7),
    fontWeight: "bold",
    color: COLORS.white,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: hp(2),
    fontWeight: "500",
    color: COLORS.white,
    letterSpacing: 1.5,
    marginTop: 5,
  },
});