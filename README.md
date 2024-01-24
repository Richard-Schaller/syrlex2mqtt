# syrlex2mqtt

The SYR water softening units of the LEX Plus series, e.g. LEX Plus 10 Connect or LEX Plus 10 S Connect, are sharing their status with the SYR Connect cloud and receiving commands and settings changes from it. The SYR Connect cloud can be either accessed through the [SYR Connect web interface](https://syrconnect.de/) or the [SYR App](https://www.syr.de/de/SYR_App). syrlex2mqtt simulates the SyrConnect cloud and makes the SYR water softening units of the LEX Plus series available via MQTT.

## Features

- The following sensor values are currently exposed via MQTT:

  - Salt Remaining [weeks]
  - Status Message [text]
  - Regeneration Running [on/off]
  - Last Regeneration [timestamp]
  - Current Water Flow [l/min]
  - Total Water Consumption [l] (seems to be less accurate than a water meter)
  - Number of Regenerations [number]
  - Remaining Resin Capacity [%]
  - Remaining Water Capacity [l]

- The following configuration settings can be changed via MQTT:

  - Salt in Stock [kg]
  - Regeneration Interval [days] (allows larger values than the 4 days that are available in the UI; use at your own risk)
  - Regeneration Week Days [subset of week days]
  - Regeneration Time [hour:minute]
- The following actions can be requested via MQTT:
  - Immediately start a regeneration

## Supported Devices and Firmware versions

Currently the following devices are known to work:
- LEX Plus 10 Connect
  - Unknown firmware version
- LEX Plus 10 S Connect
  - firmware SLPS 1.7 (uses HTTP)
  - firmware SLPS 1.9 (uses HTTPS but without validating the certificate)

If you have a different device or one of the mentioned devices with a different firmware, please test and report back. Newer firmware versions are known to more thorougly check HTTPS certificates. But, it is possible to [downgrade the firmware](#firmware-downgrade).

## Setup

Setting up syrlex2mqtt involves multiple steps:

- Get syrlex2mqtt running on a server reachable under a fixed IP, e.g. 192.168.178.42:
  - Check-out this project
  - Run `npm install`
  - If using the default ports, switching to root user is necessary for syrlex2mqtt being allowed to open port 80 and 443.
  - Set up the required [environment variables](#Options). Additionally, `VERBOSE_LOGGING=true` might be helpful for a first setup.
  - Run `node syrlex2mqtt.js`
- Setup a DNS server under a fixed IP, e.g. 192.168.178.21, that redirects the following domains to your syrlex2mqtt server, e.g. 192.168.178.42:
  - connect.saocal.pl
  - www.husty.pl
  - husty.pl
  - syrconnect.de
  - firmware.syrconnect.de
  - syrconnect.consoft.de
- Configure your SYR water softening unit to use a static IP, gateway and DNS server by using the on-screen display of the device and going to Settings/Network. Set the following settings
  - DHCP-Client: off
  - IP-Address:&nbsp; &lt;unused IP&gt;, e.g. 192.168.178.201
  - Subnet mask:&nbsp; &lt;subnet mask of your network&gt;, likely 255.255.255.0
  - Default Gateway:&nbsp; &lt;IP of your router&gt;, e.g. 192.168.178.1
  - DNS server:&nbsp; &lt;IP of your DNS server&gt;, e.g. 192.168.178.21
  - Save the settings and then restart your water softening unit by interrupting power supply
- Check that the set up is working:
  - If possible, look at the log of your DNS server to see if the SYR water softening unit tried to resolve any of the mention domains 
  - Look at the output of syrlex2mqtt to see if a device is connecting with syrlex2mqtt
  - Check if a new device is showing up in your MQTT broker, e.g. with [MQTT explorer](http://mqtt-explorer.com/).

## Options

Options are set via environment variables

Variable | Required | Description 
-|-|-
MQTT_SERVER | yes | The MQTT server to use
MQTT_USER | yes | The username for connecting with the MQTT server
MQTT_PASSWORD | yes | The password for connecting with the MQTT server
HTTP_PORT | no | The port to listen for incoming connections from the SYR water softening unit. The unit expects to be able to communicate with port 80. (default: `80`)
HTTPS_PORT | no | The port to listen for incoming connections from the SYR water softening unit. The unit expects to be able to communicate with port 443. (default: `443`)
VERBOSE_LOGGING | no | Set to `true` to get log output about the communication with the SYR water softening unit (default: `false`)
ADDITIONAL_PROPERTIES | no | A comma separated list of additional properties to request from the SYR water softening unit, e.g. `TOF, CWF` to get statistics about the water consumption of the current day and week (see description of the [SYR Connect Protocol](doc/syrconnect-protocol.md) for further information). The properties are exposed via MQTT under their name, e.g. `TOF` and `CWF`. (default: empty)


## Firmware downgrade
The firmware can be downgraded by setting up a http server replicating the original firmware servers (see http://husty.pl/firmware/ and http://firmware.syrconnect.de/firmware/). Use the following description **at your own risk** (e.g. risk of bricking your device):

- Get your hands on the firmware you want to install. For example SLPS 1.9 can be found under http://firmware.syrconnect.de/firmware/LatestPacks/LexPlus.zip .
- Set up a directory structure that looks like the original firmware server, e.g.
  - firmware
    - saocal2
      - scf.cfg
      - slp0.bin
      - slp0_dat.pak
      - slpl.bin
      - slpl_dat.pak
      - slps.bin
- Set up a http server serving this directory, e.g. via `npx`:
  - Run `npx http-server -o <path to directory containing the firmware directory>`
  - Make sure the directory structure looks like the official server
- Configure your DNS server (see [Section Setup](#Setup)) to point to the http server 
- At the SYR water softening unit go into menu Settings/Network and choose `Firmware Upgrade`
- After the upgrade finished, go to Settings/Device State to see if the firmare successfully upgraded

The water softening unit is first looking for the file `scf.cfg`. This text file describes which firmware version is available for which device and how the two corresponding firmware files (`.bin` and `.pak`) are named. The bin file contains the actual firmware (in encrypted form) and the pak file is actually a zip file containing the UI elements.
