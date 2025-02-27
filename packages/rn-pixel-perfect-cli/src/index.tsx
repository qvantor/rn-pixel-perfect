#!/usr/bin/env node

import { useCallback, useEffect, useRef, useState } from 'react';
import { render, Text, Box, useInput } from 'ink';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as util from 'node:util';
import Server, { WebSocketServer } from 'ws';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { clearTimeout } from 'node:timers';

const { values } = util.parseArgs({
  args: process.argv,
  options: {
    folder: {
      type: 'string',
      short: 'f',
    },
    port: {
      type: 'string',
      short: 'p',
    },
  },
  allowPositionals: true,
});
const CONSTANTS = {
  folder: values.folder ?? 'ui',
  port: values.port ? Number(values.port) : 3210,
};

type Device = {
  name: string;
  connection: Server;
};
type ConnectionsStoreType = {
  devices: Device[];
  addConnection: (device: Device) => void;
  removeConnection: (connection: Server) => void;
};
const ConnectionsStore = createStore<ConnectionsStoreType>((set) => ({
  devices: [],
  addConnection: (device: Device) =>
    set(({ devices }) => ({ devices: [...devices, device] })),
  removeConnection: (connection: Server) =>
    set(({ devices }) => ({
      devices: devices.filter((device) => device.connection !== connection),
    })),
}));

type ImagesStoreType = {
  selected: number;
  images: string[];
  hidden: boolean;
  scroll: boolean;
  setSelected: (selected: number) => void;
  setImages: (images: string[]) => void;
  toggleHidden: () => void;
  toggleScroll: () => void;
};

const ImagesStore = createStore<ImagesStoreType>((set) => ({
  selected: 0,
  images: [],
  hidden: false,
  scroll: false,
  setSelected: (selected: number) => set({ selected }),
  setImages: (images: string[]) => set({ images }),
  toggleHidden: () => set(({ hidden }) => ({ hidden: !hidden })),
  toggleScroll: () => set(({ scroll }) => ({ scroll: !scroll })),
}));

type RegisterMsg = {
  type: 'register';
  name: 'string';
};
type ClientMessages = RegisterMsg;

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

function uint8ArrayToBase64(uint8Array: Uint8Array) {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i] as number);
  }
  return btoa(binary);
}

const validateMessage = (data: any) => {
  try {
    const parsed = JSON.parse(String(data));
    if ('type' in parsed && typeof parsed.type === 'string')
      return parsed as ClientMessages;
    return null;
  } catch {
    return null;
  }
};

const wss = new WebSocketServer({ port: CONSTANTS.port });
wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    const msg = validateMessage(data);
    switch (msg?.type) {
      case 'register': {
        const { selected, images, hidden, scroll } = ImagesStore.getState();
        if (images[selected]) setImage(images[selected], ws);
        if (hidden) sendServerMessage({ type: 'setHidden', value: hidden }, ws);
        if (scroll) sendServerMessage({ type: 'setScroll', value: scroll }, ws);
        return ConnectionsStore.getState().addConnection({
          name: msg?.name,
          connection: ws,
        });
      }
    }
  });
  ws.on('close', function close() {
    ConnectionsStore.getState().removeConnection(ws);
  });
});

const sendServerMessage = (message: ServerMessages, target?: Server) => {
  const formated = JSON.stringify(message);
  if (target) return target.send(formated);
  ConnectionsStore.getState().devices.forEach(({ connection }) => {
    connection.send(formated);
  });
};

const setImage = async (name: string, target?: Server) => {
  try {
    const file = await fs.promises.readFile(path.join(CONSTANTS.folder, name));
    const imageBase64 = uint8ArrayToBase64(new Uint8Array(file));
    sendServerMessage(
      {
        type: 'setImage',
        image: `data:image/png;base64,${imageBase64}`,
      },
      target,
    );
  } catch {
    console.error(`Failed to load file: ${name}`);
  }
};

const setHidden = (value: boolean) =>
  sendServerMessage({
    type: 'setHidden',
    value,
  });

const setScroll = (value: boolean) =>
  sendServerMessage({
    type: 'setScroll',
    value,
  });

const changeOpacity = (plus: boolean) =>
  sendServerMessage({ type: 'changeOpacity', value: plus ? 0.2 : -0.2 });

const HelpItem = ({ title, value }: { title: string; value: string }) => {
  return (
    <Box>
      <Box width={5}>
        <Text color="blue" bold>
          {title}
        </Text>
      </Box>
      <Text color="gray">{value}</Text>
    </Box>
  );
};

const FileSelector = () => {
  const {
    images,
    setImages,
    hidden,
    scroll,
    toggleHidden,
    toggleScroll,
    selected,
    setSelected,
  } = useStore(ImagesStore);
  const timeout = useRef<NodeJS.Timeout>();
  const [error, setError] = useState<string | null>(null);
  useInput((char, key) => {
    const listSize = images.length;
    const prev = ImagesStore.getState().selected;
    if (key.rightArrow) {
      let newVal = (prev ?? 0) + 1;
      if (listSize <= newVal) newVal = 0;
      return setSelected(newVal); // next screen
    } else if (key.leftArrow) {
      let newVal = (prev ?? 0) - 1;
      if (newVal < 0) newVal = listSize - 1;
      return setSelected(newVal); // prev screen
    } else if (key.upArrow)
      return changeOpacity(true); // plus opacity
    else if (key.downArrow)
      return changeOpacity(false); // minus opacity
    else if (char === 'H' || char === 'h')
      toggleHidden(); // toggle hidden
    else if (char === 'S' || char === 's') toggleScroll(); // toggle scroll
  });

  const readFolder = useCallback(() => {
    fs.promises
      .readdir(CONSTANTS.folder)
      .then((list) => {
        const imgList = list.filter((item) =>
          new RegExp(/\.(jpg|jpeg|png|gif|bmp|webp)$/i).test(item),
        );

        setImages(imgList);
        if (imgList[0]) setSelected(0);
      })
      .catch((e) => {
        setError(e.message ?? `Could not open ${CONSTANTS.folder} folder`);
      });
  }, [setImages, setSelected]);

  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      if (images[selected]) setImage(images[selected]);
    }, 200);
  }, [selected, images]);

  useEffect(() => {
    setHidden(hidden);
  }, [hidden]);

  useEffect(() => {
    setScroll(scroll);
  }, [scroll]);

  useEffect(() => {
    if (!fs.existsSync(CONSTANTS.folder)) {
      return setError(`Folder ./${CONSTANTS.folder} not found`);
    }

    readFolder();
    const watcher = fs.watch(CONSTANTS.folder, () => {
      readFolder();
    });
    return () => {
      watcher.close();
    };
  }, [readFolder]);

  const devices = useStore(ConnectionsStore, (store) => store.devices);
  return (
    <Box flexDirection="column" paddingTop={1}>
      <Box>
        <Box flexGrow={1} flexDirection="column">
          <Box>
            <Text color="blue">Devices: [</Text>
            {devices.map((device, i) => (
              <Text key={i}>
                {device.name}
                {devices.length - 1 !== i && ','}
              </Text>
            ))}
            <Text color="blue">]</Text>
          </Box>
          <Box>
            <Text color="blue">Folder: </Text>
            <Text>{CONSTANTS.folder}</Text>
          </Box>
          <Box>
            <Text color="blue">WS on: </Text>
            <Text>ws://localhost:{CONSTANTS.port}</Text>
          </Box>
        </Box>
        <Box flexGrow={1} gap={6}>
          <Box flexDirection="column">
            <HelpItem title="←" value="Prev screen" />
            <HelpItem title="→" value="Next screen" />
          </Box>
          <Box flexDirection="column">
            <HelpItem title="↑" value="Increase opacity" />
            <HelpItem title="↓" value="Decrease opacity" />
          </Box>
          <Box flexDirection="column">
            <HelpItem title="s" value={scroll ? 'Scroll on ' : 'Scroll off'} />
            <HelpItem title="h" value={hidden ? 'Show Ui' : 'Hide Ui'} />
          </Box>
        </Box>
      </Box>
      <Box flexWrap="wrap">
        {images.map((image, index) => {
          const isSelected = index === selected;
          return (
            <Box
              key={image}
              width="12.5%"
              borderColor={isSelected && !hidden ? 'greenBright' : 'gray'}
              borderStyle="round"
            >
              <Text color={isSelected ? 'greenBright' : 'black'}>{image}</Text>
            </Box>
          );
        })}
      </Box>
      {error && <Text color="redBright">{error}</Text>}
    </Box>
  );
};
render(<FileSelector />);
