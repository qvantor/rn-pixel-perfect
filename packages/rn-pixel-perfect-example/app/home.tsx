import { View, Image } from 'react-native';

const ViewStyle = { flex: 1, backgroundColor: '#242C3B' };
const ImageStyle = { width: '100%', height: '100%', top: 2 } as const;
export default function Home() {
  return (
    <View style={ViewStyle}>
      <Image
        style={ImageStyle}
        source={require('../assets/images/wrong-bag.png')}
      />
    </View>
  );
}
