import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Svg, Rect } from 'react-native-svg';
import MersenneTwister from 'mersenne-twister';
import Color from 'color';

const COLORS = [
  '#01888C',
  '#FC7500',
  '#034F5D',
  '#F73F01',
  '#FC1960',
  '#C7144C',
  '#F3C100',
  '#1598F2',
  '#2465E1',
  '#F19E02',
];

const WOBBLE = 30;
const SHAPE_COUNT = 3;

interface JazziconProps {
  size?: number;
  address?: string;
  seed?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export const Jazzicon: React.FC<JazziconProps> = ({ size = 40, address, seed, containerStyle }) => {
  const { colors, randomNumbers } = useMemo(() => {
    let actualSeed = seed;

    if (address) {
      const normalizedAddress = address.toLowerCase();
      if (normalizedAddress.startsWith('0x')) {
        actualSeed = parseInt(normalizedAddress.slice(2, 10), 16);
      }
    }

    const generator = new MersenneTwister(actualSeed);
    const amount = generator.random() * 30 - WOBBLE / 2;

    const rotatedColors = COLORS.map(hex => new Color(hex).rotate(amount).hex());

    // Pre-generate all random numbers we'll need
    const nums: number[] = [];

    // Background color
    nums.push(generator.random());

    // For each shape: firstRot, velocity random, secondRot, color random
    for (let i = 0; i < SHAPE_COUNT; i++) {
      nums.push(generator.random()); // firstRot
      nums.push(generator.random()); // velocity
      nums.push(generator.random()); // secondRot
      nums.push(generator.random()); // color skip
      nums.push(generator.random()); // color index
    }

    return { colors: rotatedColors, randomNumbers: nums };
  }, [address, seed]);

  let randomIndex = 0;
  const getNextRandom = () => randomNumbers[randomIndex++];

  const getColor = (colorArray: string[]) => {
    getNextRandom(); // Skip one random number (matching original behavior)
    const index = Math.floor(colorArray.length * getNextRandom());
    return colorArray.splice(index, 1)[0];
  };

  const workingColors = [...colors];
  const backgroundColor = getColor(workingColors);

  const shapes = Array(SHAPE_COUNT)
    .fill(0)
    .map((_, index) => {
      const center = size / 2;
      const firstRot = getNextRandom();
      const angle = Math.PI * 2 * firstRot;
      const velocity = (size / SHAPE_COUNT) * getNextRandom() + (index * size) / SHAPE_COUNT;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      const secondRot = getNextRandom();
      const rot = firstRot * 360 + secondRot * 180;
      const fill = getColor(workingColors);

      return { tx, ty, rot, center, fill };
    });

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius: size / 2,
        },
        containerStyle,
      ]}
    >
      <Svg width={size} height={size}>
        {shapes.map((shape, index) => (
          <Rect
            key={`shape_${index}`}
            x={0}
            y={0}
            width={size}
            height={size}
            fill={shape.fill}
            transform={`translate(${shape.tx} ${shape.ty}) rotate(${shape.rot.toFixed(1)} ${shape.center} ${shape.center})`}
          />
        ))}
      </Svg>
    </View>
  );
};
