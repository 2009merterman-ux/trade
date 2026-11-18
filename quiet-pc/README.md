# QuietPC

A small Windows tool that makes your PC quieter at night and quicker to open apps.

## How to use

1. Download the `quiet-pc` folder (both files).
2. Double-click **`Start QuietPC.bat`** and say **Yes** when Windows asks for admin.
3. Pick a number from the menu.

| # | Option | What it does |
|---|--------|--------------|
| 1 | Night mode | Switches to a "Quiet Night" power plan: CPU turbo off, passive cooling, no wake-ups at night. This is what quiets the fans. |
| 2 | Day / gaming mode | Goes back to your normal power plan, at full speed. |
| 3 | Auto schedule | Turns on Night mode every night and Day mode every morning, at times you choose. |
| 4 | Startup apps | Asks you about each app that starts with Windows, one at a time. Saying yes only stops it auto-starting. |
| 5 | Clean temp junk | Shows how much Windows temp junk there is and deletes it only if you type Y. |
| 6 | What's making noise | Shows which programs are using the most CPU, plus disk space and RAM. |
| 7 | Tips | Fixes that need your hands: dust, FPS cap, fan curves, SSD. |
| 8 | Undo everything | Puts everything back the way it was. |

## Safety promises

- It never uninstalls or deletes programs or games.
- The only things it can delete are Windows temp files, and only after you say Y.
- Startup apps are only disabled (the same switch as in Task Manager > Startup), and you can turn them back on with option 8.
