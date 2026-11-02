# Traffic Light Timer

A count-up timer that turns the whole screen green, amber and red at the times you set.

- **Green** and **amber** show for 6 seconds at their minute marks, then the screen goes back to dark grey.
- **Red** comes on at its minute mark and stays on until you press Stop or Reset.
- **Stop** pauses the timer and shows the time. Every stop is saved in the timer history.

## Use it online

Open https://moniquehyho.github.io/traffic-light-timer/

## Use it with a phone (same Wi-Fi)

Phone pairing needs the small local server, so run it from your laptop:

1. Install [Python](https://www.python.org/) and the QR code package: `python -m pip install qrcode`
2. Double-click `start-timer.bat` (or run `python server.py`).
3. Scan the QR code at the bottom of the screen with your phone. The phone shows the ticking timer.

The phone and laptop must be on the same Wi-Fi. Windows may ask you to allow Python through the firewall the first time.
