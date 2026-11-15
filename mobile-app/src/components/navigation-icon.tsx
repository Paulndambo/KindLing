import { StyleSheet, View, type ColorValue } from 'react-native';

type IconName = 'home' | 'learn' | 'assessments' | 'profile';

/** Small geometric icons keep the same stroke weight on every platform. */
export function NavigationIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.frame}>
      {name === 'home' ? <>
        <View style={[styles.roof, { borderColor: color }]} />
        <View style={[styles.house, { borderColor: color }]} />
        <View style={[styles.door, { borderColor: color }]} />
      </> : name === 'learn' ? <>
        <View style={[styles.bookLeft, { borderColor: color }]} />
        <View style={[styles.bookRight, { borderColor: color }]} />
      </> : name === 'assessments' ? <>
        <View style={[styles.sheet, { borderColor: color }]} />
        <View style={[styles.check, { borderColor: color }]} />
      </> : <>
        <View style={[styles.head, { borderColor: color }]} />
        <View style={[styles.shoulders, { borderColor: color }]} />
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 24, height: 24 },
  roof: { position: 'absolute', width: 14, height: 14, borderLeftWidth: 1.8, borderTopWidth: 1.8, transform: [{ rotate: '45deg' }], top: 3, left: 5, borderTopLeftRadius: 2 },
  house: { position: 'absolute', width: 17, height: 12, borderWidth: 1.8, borderTopWidth: 0, bottom: 1, left: 3.5, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  door: { position: 'absolute', width: 5, height: 8, borderWidth: 1.8, borderBottomWidth: 0, bottom: 1, left: 9.5, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  bookLeft: { position: 'absolute', width: 10, height: 17, borderWidth: 1.8, borderTopLeftRadius: 3, borderBottomLeftRadius: 3, left: 2, top: 4 },
  bookRight: { position: 'absolute', width: 10, height: 17, borderWidth: 1.8, borderTopRightRadius: 3, borderBottomRightRadius: 3, right: 2, top: 4 },
  sheet: { position: 'absolute', width: 17, height: 21, borderWidth: 1.8, borderRadius: 3, top: 1.5, left: 3.5 },
  check: { position: 'absolute', width: 9, height: 5, borderLeftWidth: 1.8, borderBottomWidth: 1.8, transform: [{ rotate: '-45deg' }], top: 9, left: 8 },
  head: { position: 'absolute', width: 8, height: 8, borderWidth: 1.8, borderRadius: 4, left: 8, top: 1 },
  shoulders: { position: 'absolute', width: 18, height: 10, borderWidth: 1.8, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, left: 3, bottom: 1 },
});
