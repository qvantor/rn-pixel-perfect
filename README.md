# React Native Pixel Perfect

<div>
  <img align="right" width="35%" src="https://github.com/qvantor/rn-pixel-perfect/raw/main/assets/presentation.gif">
</div>

A simple tool for pixel-perfect layouts, allowing you to compare design screens with your app's implementation.

### Usage

1. Install and start the CLI tool, this tool helps in distributing and controlling design screens.

```bash
npm i -g rn-pixel-perfect-cli
rn-pixel-perfect
```

2. Install the React Native component

```bash
npm i rn-pixel-perfect
```

3. Add the Overlay component to your app's layout file, typically near the end of your component tree.

```tsx
// app/_layout.tsx
import {Overlay} from "rn-pixel-perfect";

function RootLayout() {
    return (
        <ThemeProvider value={DefaultTheme}>
            <Stack>
                // Your screen's here
            </Stack>
            {__DEV__ && <Overlay/>} // <--- put at the end
        </ThemeProvider>
    );
}
```

4. Now you can control and adjust your design screens from the terminal.

## CLI Usage (`rn-pixel-perfect-cli`)

The CLI tool serves images from a folder, allowing you to navigate between screens and adjust their position and
opacity.

![image](https://github.com/qvantor/rn-pixel-perfect/raw/main/assets/terminal.png)

### Cli parameters

| Name   | Description                 | Default |
|--------|-----------------------------|---------|
| folder | Folder to serve images from | ui      |
| port   | Port to listen on           | `3210`  |

#### Example Command:

```bash
rn-pixel-perfect --folder images --port 1234
```

### Keyboard shortcuts

| Shortcut                      | Description      | 
|-------------------------------|------------------|
| <kbd>↑</kbd>                  | Scroll up        | 
| <kbd>↓</kbd>                  | Scroll down      | 
| <kbd>←</kbd>                  | Prev screen      | 
| <kbd>→</kbd>                  | Next screen      | 
| <kbd>↑</kbd>+<kbd>Shift</kbd> | Fast scroll up   | 
| <kbd>↓</kbd>+<kbd>Shift</kbd> | Fast scroll down | 
| <kbd>←</kbd>+<kbd>Shift</kbd> | Decrease opacity | 
| <kbd>→</kbd>+<kbd>Shift</kbd> | Increase opacity | 
| <kbd>h</kbd>                  | Hide Ui          | 

## Overlay React Native Component

The `Overlay` component displays design overlays on your app's screens and connects with the CLI for live control. 
No parameters are needed by default. 
Uses `expo-constants`.

### Props

| Name | Description                  | Default       |
|------|------------------------------|---------------|
| host | Host to rn-pixel-perfect-cli | Expo Host URI |
| port | Port to rn-pixel-perfect-cli | `3210`        |

#### Example:

```tsx
import {Overlay} from "rn-pixel-perfect";

// in root render
<Overlay host='PC-IP-IN-LOCAL-NETWORK' port={1234}/>

```
