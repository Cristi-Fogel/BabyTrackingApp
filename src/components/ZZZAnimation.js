import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function ZZZAnimation({ style, textStyle }) {
  // Animații separate pentru fiecare literă Z
  const anim1 = useRef(new Animated.Value(0.5)).current;
  const anim2 = useRef(new Animated.Value(0.5)).current;
  const anim3 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animateLetter = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.5,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const loop1 = animateLetter(anim1, 0);
    const loop2 = animateLetter(anim2, 300);
    const loop3 = animateLetter(anim3, 600);

    loop1.start();
    loop2.start();
    loop3.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [anim1, anim2, anim3]);

  return (
    <View style={[styles.container, style]}>
      <Animated.Text style={[styles.letter, textStyle, { transform: [{ scale: anim1 }] }]}>
        Z
      </Animated.Text>
      <Animated.Text style={[styles.letter, textStyle, { transform: [{ scale: anim2 }], marginLeft: 1 }]}>
        z
      </Animated.Text>
      <Animated.Text style={[styles.letter, textStyle, { transform: [{ scale: anim3 }], marginLeft: 1 }]}>
        z
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  letter: {
    fontWeight: 'bold',
    fontSize: 12,
  },
});