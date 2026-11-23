# Traffic Light Timer

A count-up timer that turns the whole screen green, amber and red at the times you set.

- The screen turns **green** at its minute mark and stays green until **amber** comes in, then stays amber until **red**.
- **Red** comes on at its minute mark and stays on until you press Stop or Reset.
- **Pause** holds the timer and **Resume** carries on. **Stop** ends the timer and saves its time in the timer history.
- **Reset** clears the timer. If it wasn't stopped first, its time is still saved in the history.

## Use it

1. On the laptop or big screen, open https://moniquehyho.github.io/traffic-light-timer/ (double-click for full screen). It only shows the colours and a QR code in the corner.
2. Scan the QR code with your phone. The phone is the remote: set the minutes for each colour, then Start, Stop, Resume or Reset. It also shows the ticking timer and the timer history.

Several phones can connect at once, on any network.

On a phone, opening the main link goes straight to the control panel and the phone runs the timer on its own screen. Add `?screen` to the link to show the colour screen on any device.

Pick the screen colours on the phone: choose a palette (Bright, Neon, Classic or Deep), or tap the colour square next to each colour to choose your own.

Phones connect directly to the timer page over WebRTC using [PeerJS](https://peerjs.com/). PeerJS's free public server only introduces the two devices; the timer updates go device to device. Both devices need internet access, and some strict office networks block this kind of connection.
