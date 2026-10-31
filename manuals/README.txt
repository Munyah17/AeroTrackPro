=====================================================================
                 AEROTRACK PRO — DEVICE SETUP MANUAL
                  Quick Start for GPS Trackers (ST-901A)
=====================================================================

This booklet explains, in plain language, how to get a GPS tracker
working with AeroTrack. You do not need to be a computer expert.
Follow each step once, in order, and the tracker will start reporting
its position to your AeroTrack account.

You will need:
  - A GPS tracker (e.g. SinoTrack ST-901A) fitted in the vehicle
  - A working SIM card inside the tracker (with SMS + data credit)
  - A phone that can send SMS messages to the tracker's SIM number
  - About 10 minutes


=====================================================================
1. DEPLOYMENT
=====================================================================
"Deployment" means where the AeroTrack system lives. It is already
set up for you — this section just explains what is where, so you
understand the pieces.

  - The AeroTrack website (the app you log in to) lives on the
    internet at your Vercel address. Open it in any browser —
    phone or computer. Nothing to install.

  - The tracking database lives on Supabase. That is where all
    positions, vehicles, and alerts are saved. You never touch it
    directly — the app does that for you.

  - The device listener lives at a fixed internet address:

        IP address : 149.248.215.167
        Port       : 5013        (for ST-901A / H02 devices)

    This is the "mailbox" your tracker talks to. The tracker sends
    its position here over the mobile network, and AeroTrack saves it.

  - That is everything. There is no extra equipment on your side
    besides the tracker itself and its SIM card.


=====================================================================
2. SETUP & CONFIG
=====================================================================
Do these steps once, in order, with the tracker powered on and its
SIM inserted.

  STEP 1 — Send the tracker its internet settings (APN)
    The SIM's APN depends on the mobile carrier. Send ONE of these
    SMS messages to the tracker's phone number:

      Econet   : 8030000 econet.net
      NetOne   : 8030000 netone
      Telecel  : 8030000 isp.telecel.co.zw

    The tracker should reply "OK".

  STEP 2 — Tell the tracker where to report
    Send this SMS exactly as written (spaces included):

        8040000 149.248.215.167 5013

    The tracker should reply "OK".

  STEP 3 — Turn on live tracking mode
    Send this SMS:

        7100000

    This switches the tracker to GPRS mode so it sends positions
    over the internet instead of SMS.

  STEP 4 — Set the clock
    Send this SMS:

        8960000E00

    This sets the tracker clock to UTC. AeroTrack shows the correct
    local time in the app automatically.

  STEP 5 — Check it all worked
    Send this SMS:

        RCONF

    The tracker replies with its current settings. Confirm the reply
    shows "149.248.215.167" and "5013".

  STEP 6 — Watch it go live
    - Log in to your AeroTrack app.
    - Open your vehicle. Within 1–5 minutes (while the vehicle is
      outside or driving) the dot on the map moves to its position.
    - If nothing appears after 10 minutes, repeat STEP 5 and check
      the SIM has data credit.


=====================================================================
3. OPERATION
=====================================================================
Day-to-day use, once the tracker is live.

  SEE YOUR VEHICLE
    - Open the app and tap your vehicle.
    - The map shows its last reported position and speed.
    - The "last seen" time tells you when it last phoned home.

  SEND A COMMAND TO THE TRACKER
    - Go to the Commands page in the app.
    - Pick the command (e.g. cut engine / restore engine).
    - AeroTrack hands the command to the listener, which sends it
      down the tracker's live connection.
    - Statuses you will see:
        "pending" — waiting for the tracker to connect or answer
        "sent"    — delivered to the tracker, waiting for its reply
        "acked"   — the tracker confirmed it received the command
        "failed"  — delivery failed (check the tracker is online)

  IF THE TRACKER STOPS REPORTING
    - Check the vehicle is not parked underground / in a metal
      building (GPS needs sky view).
    - Check the SIM still has data credit — send RCONF by SMS;
      if there is no reply, top up the SIM first.
    - Send RESET by SMS to reboot the tracker, then wait 5 minutes.
    - Still nothing? Re-run STEP 5 in the Setup section and compare
      the settings to this booklet.

  IMPORTANT PHONE NUMBERS & CODES
    - Tracker SMS password   : set by your installer (ask them)
    - Listener IP / port     : 149.248.215.167 : 5013
    - Support                : contact your AeroTrack account manager

=====================================================================
                 End of quick-start — keep this safe
=====================================================================
