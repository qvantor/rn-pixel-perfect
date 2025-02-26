import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Image, Dimensions, ScrollView } from 'react-native';
import Constants from 'expo-constants';

type SetImage = {
  type: 'setImage';
  image: string;
};

type ChangeOpacity = {
  type: 'changeOpacity';
  value: number;
};
type SetHidden = {
  type: 'setHidden';
  value: boolean;
};
type SetScroll = {
  type: 'setScroll';
  value: boolean;
};

type ServerMessages = SetImage | ChangeOpacity | SetHidden | SetScroll;

export const validateMessage = (data: any) => {
  try {
    const parsed = JSON.parse(String(data));
    if ('type' in parsed && typeof parsed.type === 'string')
      return parsed as ServerMessages;
    return null;
  } catch {
    return null;
  }
};

const getHost = (userHost?: string) => {
  if (userHost) return userHost;
  if (!Constants.expoConfig?.hostUri) return 'localhost';
  const [host] = Constants.expoConfig.hostUri.split(':');
  return host;
};

const ImgStyle = {
  width: '100%',
} as const;

export const Overlay = ({ host, port }: { host?: string; port?: number }) => {
  const [img, setImg] = useState<{ src: string; height: number } | null>(null);
  const [opacity, setOpacity] = useState<number>(0.6);
  const [hidden, setHidden] = useState<boolean>(false);
  const [scroll, setScroll] = useState<boolean>(false);
  const scrollRef = useRef<ScrollView>(null);
  const onSetImage = useCallback(async (msg: SetImage) => {
    const { width, height } = await Image.getSize(msg.image);
    const screenWidth = Dimensions.get('screen').width;
    setImg({
      src: msg.image,
      height: height / (width / screenWidth),
    });
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`ws://${getHost(host)}:${port ?? 3210}`);
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'register',
          name: Constants.deviceName ?? 'Unknown',
        }),
      );
    };
    ws.onmessage = (e) => {
      const msg = validateMessage(e.data);
      switch (msg?.type) {
        case 'setImage': {
          return onSetImage(msg);
        }
        case 'changeOpacity':
          return setOpacity((value) =>
            Math.min(Math.max(value + msg.value, 0), 1),
          );
        case 'setHidden':
          return setHidden(msg.value);
        case 'setScroll':
          return setScroll(msg.value);
        case undefined: {
          throw new Error('Not implemented yet: undefined case');
        }
      }
    };
    ws.onerror = (e) => {
      console.error('rn-pixel-perfect', e);
    };

    ws.onclose = () => {
      setImg(null);
    };
    return () => {
      ws.close();
    };
  }, [port, host, onSetImage]);
  const style = useMemo(
    () =>
      ({
        position: 'absolute',
        top: 0,
        width: '100%',
        height: '100%',
        opacity,
        pointerEvents: scroll ? undefined : 'none',
      }) as const,
    [opacity, scroll],
  );

  if (!img || hidden) return null;
  return (
    <ScrollView ref={scrollRef} style={style}>
      <Image
        style={[ImgStyle, { height: img.height }]}
        source={{ uri: img.src }}
      />
    </ScrollView>
  );
};
