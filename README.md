# Traffic Light Timer

A count-up timer that turns the whole screen green, amber and red at the times you set.

- **Green** and **amber** show for 6 seconds at their minute marks, then the screen goes back to dark grey.
- **Red** comes on at its minute mark and stays on until you press Stop or Reset.
- **Stop** pauses the timer and shows the time. Every stop is saved in the timer history.

## Use it

Open https://moniquehyho.github.io/traffic-light-timer/

## Watch it on a phone

Scan the QR code at the bottom of the timer screen. The phone shows the ticking timer and changes colour with the screen. Several phones can connect at once, on any network.

Phones connect directly to the timer page over WebRTC using [PeerJS](https://peerjs.com/). PeerJS's free public server only introduces the two devices; the timer updates go device to device. Both devices need internet access, and some strict office networks block this kind of connection.
