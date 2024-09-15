import { useState, useEffect, useMemo } from 'react';
import { Image, View } from 'react-native';
import Constants from 'expo-constants';

type SetImage = {
  type: 'setImage';
  image: string;
};

type MoveUp = {
  type: 'move';
  value: number;
};

type ChangeOpacity = {
  type: 'changeOpacity';
  value: number;
};
type SetHidden = {
  type: 'setHidden';
  value: boolean;
};

export type ServerMessages = SetImage | MoveUp | ChangeOpacity | SetHidden;

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

const CommonStyle = {
  position: 'absolute',
  left: 0,
  width: '100%',
  height: '100%',
} as const;

export const Overlay = ({ host, port }: { host?: string; port?: number }) => {
  const [img, setImg] = useState<string | null>(null);
  const [top, setTop] = useState<number>(0);
  const [opacity, setOpacity] = useState<number>(0.6);
  const [hidden, setHidden] = useState<boolean>(false);
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
          setTop(0);
          return setImg(msg?.image);
        }
        case 'move':
          return setTop((prev) => prev + msg.value);
        case 'changeOpacity':
          return setOpacity((value) =>
            Math.min(Math.max(value + msg.value, 0), 1),
          );
        case 'setHidden':
          return setHidden(msg.value);
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
  }, [port, host]);
  const style = useMemo(
    () => ({
      ...CommonStyle,
      top,
      opacity,
    }),
    [top, opacity],
  );
  if (!img || hidden) return null;
  return (
    <View pointerEvents="none" style={style}>
      <Image style={CommonStyle} source={{ uri: img }} />
    </View>
  );
};
