# Table of Contents

- [Table of Contents](#table-of-contents)
- [ThermaConnect](#thermaconnect)
  - [System Layout](#system-layout)
  - [Workflows](#workflows)
    - [Sample Workflow for Provisioning](#sample-workflow-for-provisioning)
    - [Provisioning Details](#provisioning-details)
    - [Resetup Workflow](#resetup-workflow)
    - [Transmission Interval WorkFlow](#transmission-interval-workflow)
  - [TempCheck Workflow](#tempcheck-workflow)
  - [MQTT Server for ThermoWorks Devices](#mqtt-server-for-thermoworks-devices)
  - [Brokers](#brokers)
  - [Support Connection Protocols](#support-connection-protocols)
  - [Support Authentication](#support-authentication)
  - [Topics](#topics)
  - [Step-by-Step: MQTT Integration Guide](#step-by-step-mqtt-integration-guide)
    - [Prerequisites](#prerequisites)
    - [Step 1: Set Up Your MQTT Broker](#step-1-set-up-your-mqtt-broker)
    - [Step 2: Configure Authentication](#step-2-configure-authentication)
    - [Step 3: Create the Topic Structure](#step-3-create-the-topic-structure)
    - [Step 4: Prepare and Publish Device Configuration](#step-4-prepare-and-publish-device-configuration)
    - [Step 5: Subscribe to Device State and Telemetry](#step-5-subscribe-to-device-state-and-telemetry)
    - [Step 6: Provision the Device via BLE](#step-6-provision-the-device-via-ble)
    - [Step 7: Verify the Connection](#step-7-verify-the-connection)
    - [Step 8: Handle Incoming Messages in Your Backend](#step-8-handle-incoming-messages-in-your-backend)
    - [Step 9: Update Device Configuration Remotely](#step-9-update-device-configuration-remotely)
    - [Troubleshooting](#troubleshooting)
- [BLE Service Details](#ble-service-details)
  - [Device Information Service](#device-information-service)
  - [Battery Information Service](#battery-information-service)
  - [Wifi/IoT Information Service](#wifiiot-information-service)
  - [RFX Service](#rfx-service)
  - [RFX Probe Information](#rfx-probe-information)
  - [Device Detail Service](#device-detail-service)
    - [Label](#label)
    - [Action Label](#action-label)
    - [Number of channels](#number-of-channels)
    - [Provisioning Status](#provisioning-status)
    - [Display Unit](#display-unit)
    - [Recording Rate in Seconds](#recording-rate-in-seconds)
    - [Transmission Rate in Seconds](#transmission-rate-in-seconds)
  - [Channel 1 Service](#channel-1-service)
    - [Channel 1 Type](#channel-1-type)
    - [Channel 1 Status](#channel-1-status)
    - [Channel 1 Value](#channel-1-value)
    - [Channel 1 Unit](#channel-1-unit)
    - [Channel 1 High Alarm Enabled](#channel-1-high-alarm-enabled)
    - [Channel 1 High Alarm Value](#channel-1-high-alarm-value)
    - [Channel 1 High Alarm Units](#channel-1-high-alarm-units)
    - [Channel 1 High Alarm Muted](#channel-1-high-alarm-muted)
    - [Channel 1 High Alarm Alarming](#channel-1-high-alarm-alarming)
    - [Channel 1 Low Alarm Enabled](#channel-1-low-alarm-enabled)
    - [Channel 1 Low Alarm Value](#channel-1-low-alarm-value)
    - [Channel 1 Low Alarm Units](#channel-1-low-alarm-units)
    - [Channel 1 Low Alarm Muted](#channel-1-low-alarm-muted)
    - [Channel 1 Low Alarm Alarming](#channel-1-low-alarm-alarming)
    - [Channel 1 User Trim Value](#channel-1-user-trim-value)
    - [Channel 1 User Trim Units](#channel-1-user-trim-units)
    - [Channel 1 System Trim Value for (ThermoWorks Calibration Only)](#channel-1-system-trim-value-for-thermoworks-calibration-only)
    - [Channel 1 System Trim Units (ThermoWorks Calibration Only)](#channel-1-system-trim-units-thermoworks-calibration-only)
  - [Billow Detail Service](#billow-detail-service)
  - [All Characteristics are sent and received as strings.](#all-characteristics-are-sent-and-received-as-strings)
  - [Over The Air Update Service](#over-the-air-update-service)
- [ThermoWorks Iot Communication Definitions](#thermoworks-iot-communication-definitions)
  - [Device Config Sample](#device-config-sample)
  - [telemetry Sample](#telemetry-sample)
  - [State Sample](#state-sample)
    - [Example of Channel 1 high alarming sounding](#example-of-channel-1-high-alarming-sounding)
    - [Example of Channel 1 high alarm enabled](#example-of-channel-1-high-alarm-enabled)
    - [Example of Channel 1 high alarm value change](#example-of-channel-1-high-alarm-value-change)
  - [Device Definitions](#device-definitions)
  - [Channel Data Definitions](#channel-data-definitions)
  - [Alarm Definitions](#alarm-definitions)
  - [Reading Definitions](#reading-definitions)
  - [Reading Definition](#reading-definition)
  - [Trim Definitions](#trim-definitions)
- [Error](#error)
  - [MQTT Connection Errors](#mqtt-connection-errors)
  - [MQTT TLS Errors](#mqtt-tls-errors)
  - [Wifi Errors](#wifi-errors)

# ThermaConnect

Documentation about ThermoWorks IoT Devices for Integration Partners

## System Layout

Here is a sample of how you could implement the ThermoWorks IoT Devices in your system.

```mermaid
flowchart TD
    A[ThermoWorks IoT Device] --> B[MQTT Server]
    B --> A
    B --> C[Backend]
    C --> B
    C --> D[USER]
    D --> C
```

<details open>

<summary>Initial Provisioning Workflow</summary>

## Workflows

This documentation is for a provisioning workflow for a ThermoWorks IoT device. It includes steps for setting up the device, connecting it to Wi-Fi and MQTT, and transmitting data.

### Sample Workflow for Provisioning

```mermaid
sequenceDiagram
    participant USER;
    Participant NODE as NODE;
    Note over NODE: Display Reads NEED SETUP;
    loop setupmode;
       USER->>NODE: Hold Button till in SETUPMODE;
    end;
    Note over NODE: Display Reads SETUPMODE;
    USER->>APP: BLE Scan for NODE;
    APP->>NODE: Connect to Device;
    APP->>NODE: Write SSID;
    APP->>NODE: Write PASSWORD;
    APP->>NODE: Write MQTT URL
    APP->>NODE: Write MQTT PORT
    APP->>NODE: Write MQTT Username
    APP->>NODE: Write MQTT Password
    APP->>NODE: Write CA CERT
    APP->>NODE: Write CLIENT CERT
    APP->>NODE: Write CLIENT KEY
    APP->>NODE: Write Start Command
    Note over NODE: Starts connection attempts
    NODE-->>WIFI: Connect to Wi-Fi
    NODE->>APP: Update Wi-Fi Connection Characteristic
    NODE->>MQTT: Connect to MQTT
    MQTT-->>NODE: MQTT Connected
    Note over NODE: Display will now show readings.
    NODE->>APP: Update IOT Connection Characteristic
    NODE->>MQTT: Subscribe to topic /devices/TXXXXXXXXXXXX/config
    MQTT-->>NODE: Send config
    NODE->>MQTT: Send state /devices/TXXXXXXXXXXXX/state
    NODE->>MQTT: Send telemetry /devices/TXXXXXXXXXXXX/event
    MQTT--xNODE: MQTT Disconnect
    WIFI--xNODE: WIFI Disconnect
    NODE--xAPP: BLE Disconnects
    Note over NODE: Screen goes to sleep
```

### Provisioning Details

1. NODE: Display reads NEEDS SETUP

When the device is unprovisioned we save battery life by putting the device to sleep and showing NEEDS SETUP on the display.

2. USER: Press Button until the display reads SETUPMODE

User holds the START button for 5-10 seconds until the display reads SETUPMODE. This starts the BLE and sets up a 10-minute timer before the device shuts down.

3. APP: Your app will then need to scan for BLE Devices. You can filter with the following.

Device Name: `NODE`
This will only show NODES

or

DEVICE Company Id: `0x0B11`
This will show NODES and any future supported ThermoWorks IoT Devices.

4. APP: Use the scan results to connect to one of the NODEs in the results

> [!IMPORTANT]
> When sending information to ThermoWorks IoT Devices it is important to send all fields.
>
> This makes sure that no fields are set from a previous provisioning and all defaults are overwritten. If a field is unused send an empty string and this will mark the field as unused.

5. APP: Send the follow fields via BLE. Details about these fields can be found the BLE Documentation.

   - WIFI SSID
   - WIFI PASSWORD
   - MQTT URL
   - MQTT PORT
   - MQTT USERNAME
   - MQTT PASSWORD
   - MQTT CA CERT
   - MQTT CLIENT CERT
   - MQTT CLIENT KEY

6. NODE: After the fields are sent the device will attempt to connect to WW-Fi and MQTT.
7. NODE: Wi-Fi Status Change, Connected or Not.

After the device first attempts to connect to Wi-Fi it will update the Wi-Fi Connection BLE Characteristic with its status.

If the connection is successful it will continue on and attempt to connect to the MQTT Server.

If it is not, it will continue to attempt the connection and update the Wi-Fi Error BLE Characteristic with an error code.

8. MQTT Status Change, Connected or Not

After successful Wi-Fi connection the device will attempt to connect to the MQTT Server. When connecting to the server please note:

- If the MQTT URL Starts with mqtts or wss a CA CERT is required.
- If the MQTT URL starts with mqtt or ws the CA Cert should be empty.
- Auth is determined by what is saved in storage and in this order:
  - If a username and password is entered it will use them
  - Else if a client cert is present it will use that and the client key
  - Else if no auth fields are set it will use unauthenticated.

If the connection is successful it will update the MQTT Connection Characteristic.

If the connection is unsuccessful it will update the MQTT Error Characteristic with an error code.

9. NODE: Normal Operation Transmission.
   - Send State
   - Send Telemetry
   - Get Config
   - Sleep

### Resetup Workflow

- Hold Button until device display reads SETUP MODE
- Connect to Device VIA BLE
- Send Wi-Fi / Password / MQTT Details to Device via BLE Characteristics
- Device will attempt to Connect
- MQTT Connection Successful
  - Device will connect to the topic "/devices/{deviceId}/config" to download the latest config.
  - Device will send on "devices/{deviceId}/state" the state of the device
  - Device will send on "devices/{deviceId}/events" any readings pending in the device.
- MQTT Connection Unsuccessful
  - Will update the Wi-Fi or Iot Error characteristics with details about what caused the failure.

### Transmission Interval WorkFlow

> [!NOTE]
> The sleep/wake cycle described below applies to battery-powered devices (e.g., NODE). RFX Gateway devices maintain a persistent Wi-Fi and MQTT connection and do **not** sleep between transmissions.

```mermaid
sequenceDiagram
    participant NODE
    Note over NODE: Wake up
    NODE->>WIFI: WIFI CONNECTION
    WIFI-->>NODE: CONNECTED
    NODE->>BROKER: REQUEST CONNECTION
    BROKER-->>NODE: CONNECTED
    NODE->>BROKER: SUBSCRIBE TO CONFIG
    BROKER-->>NODE: SEND CONFIG
    NODE->>BROKER: SEND STATE
    NODE->>BROKER: SEND TELEMETERY
    BROKER--xNODE: DISCONNECT
    WIFI--xNODE: DISCONNECT
    Note over NODE: Sleep
```

**Battery-powered devices (e.g., NODE):**
- Devices wake up from sleep or long button press by user
- Device will attempt to Connect
- MQTT Connection Successful
  - Device will connect to the topic "/devices/{deviceId}/config" to download the latest config.
  - Device will send on "devices/{deviceId}/state" the state of the device
  - Device will send on "devices/{deviceId}/events" any readings pending in the device.
- MQTT Connection Unsuccessful
  - Will display error on action label.
- Device disconnects and goes back to sleep until the next transmission interval.

**RFX Gateway devices:**
- Gateway stays powered on and maintains a persistent Wi-Fi and MQTT connection.
- Telemetry data is forwarded to the broker as it is received from RFX probes — there is no sleep/wake cycle.
- The gateway remains subscribed to its config topic and will receive configuration updates in real time.

## TempCheck Workflow

- Device wakes from sleep or short button press
- Takes a reading
- Check to see if the alarm state has changed on each channel, either going into an alarm or out of alarm state.
  - If alarm state has changed turn on the Wi-Fi and send the reading.
- Go to Sleep until the next TempCheck or Transmission interval whichever is first.

</details>

<details open>
<summary>MQTT Server Setup</summary>

## MQTT Server for ThermoWorks Devices

MQTT is a lightweight messaging protocol that is ideal for IoT devices due to its low bandwidth usage and low power consumption. It is also designed to work well in unreliable network conditions, making it a good choice for devices that may have intermittent connectivity. Additionally, MQTT supports a variety of authentication methods, making it a secure choice for IoT applications.

## Brokers

There are many MQTT brokers available, both self-hosted and cloud-managed. ThermoWorks does not have a specific recommendation — you will need to research which broker best supports your use case based on factors such as scale, authentication requirements, TLS support, high availability needs, and budget.

### Self-Hosted / On-Premise

These brokers can be installed and run on your own infrastructure:

| Broker                                                    | Notes                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Mosquitto](https://mosquitto.org/)                       | Lightweight, easy to set up. Good for development and small-to-medium deployments.         |
| [EMQX](https://www.emqx.io/)                             | High-performance, highly scalable. Supports clustering and millions of connections.        |
| [HiveMQ (Community Edition)](https://www.hivemq.com/)     | Java-based with an extension framework. Community edition is free and open source.         |
| [VerneMQ](https://vernemq.com/)                           | Distributed, built on Erlang/OTP. Designed for high availability and horizontal scaling.   |
| [NanoMQ](https://nanomq.io/)                              | Ultra-lightweight, edge-focused broker. Low resource footprint for embedded/edge use.      |
| [RabbitMQ](https://www.rabbitmq.com/)                     | General-purpose message broker with MQTT plugin support. Good if you already use AMQP.     |

### Cloud-Managed / Hosted

These services provide a fully managed MQTT broker so you don't need to maintain your own infrastructure:

| Service                                                           | Notes                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/)        | Managed HiveMQ with a free tier. Supports MQTT 3.1.1 and 5.0.                             |
| [EMQX Cloud](https://www.emqx.com/en/cloud)                      | Managed EMQX clusters on AWS, Azure, or GCP.                                              |
| [AWS IoT Core](https://aws.amazon.com/iot-core/)                  | Fully managed MQTT on AWS. Scales automatically, integrates with the AWS ecosystem.        |
| [Azure IoT Hub](https://azure.microsoft.com/en-us/products/iot-hub/) | Microsoft's managed IoT gateway with MQTT support and Azure service integration.       |
| [CloudMQTT / CloudAMQP](https://www.cloudamqp.com/)              | Hosted Mosquitto and RabbitMQ instances with simple setup.                                 |
| [Cedalo](https://cedalo.com/)                                     | Managed Mosquitto-based MQTT with a management UI.                                         |

### Choosing a Broker

When evaluating brokers, consider:

- **Scale** — How many devices will connect simultaneously? Some brokers are designed for millions of concurrent connections, while others are better suited for smaller deployments.
- **Authentication** — ThermoWorks devices support username/password and TLS (CA cert). Ensure the broker supports your preferred auth method.
- **TLS Support** — Required for `mqtts://` and `wss://` connections. All production deployments should use TLS.
- **Reliability / HA** — For mission-critical applications, look for brokers with clustering and failover capabilities.
- **Integration** — Consider how the broker fits into your existing infrastructure (cloud provider, databases, alerting systems).
- **Cost** — Self-hosted brokers are free but require operational overhead. Cloud-managed services trade cost for convenience.

## Support Connection Protocols

- MQTT
- MQTTS
- MQTT over WebSockets
- MQTTS over WebSockets

## Support Authentication

- Unauthenticated
- User Name / Password
- Client Key / Cert <sup>\*see warning</sup>

> [!WARNING]
> Client Key / Cert is currently unavailable and will cause issues with NODE. Please contact sales for more information if this is required for your configuration.

You set the broker and the authentication via the BLE when the device is in setup mode.

## Topics

- Configuration

  When ThermoWorks Devices connect to the MQTT server they will connect to the following topic to retrieve its configuration.

  /devices/{deviceId}/config

  The configuration is a json object [def](#device-config-object)

- State

  Upon connection to the MQTT server the device will send its current state to the following topic.

  /devices/{deviceId}/state

  The state is a json object [def](#state-object)

- Events (Telemetry)

      Upon connection to the MQTT server the device will send any pending readings to the following topic.

      /devices/{deviceId}/events

      The event is a json object [def](#telemetry-sample)

      > [!note]
      > RFX Probes send telemetry data to a different topic format: `/probes/{probeId}/events`. For more details, see the [RFX Probe Information](#rfx-probe-information) section.

## Step-by-Step: MQTT Integration Guide

This section provides a detailed walkthrough for integrating your backend system with ThermoWorks IoT devices over MQTT. Follow these steps to go from a fresh broker to receiving live telemetry data.

### Prerequisites

- An MQTT broker installed and accessible on your network (see [Brokers](#brokers))
- A ThermoWorks IoT device (e.g., NODE, RFX Gateway, etc)
- A BLE-capable mobile app or tool for device provisioning
- The device's serial number (format: `TXXXXXXXXXXXX`, found on the device label or via BLE)

### Step 1: Set Up Your MQTT Broker

Install and start your MQTT broker. Below is an example using **Mosquitto** on a Linux server:

```bash
# Install Mosquitto
sudo apt-get update
sudo apt-get install mosquitto mosquitto-clients

# Start the broker
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

Configure the broker to listen on the appropriate port. Edit the Mosquitto configuration file (e.g., `/etc/mosquitto/mosquitto.conf`):

```text
# For unencrypted MQTT (port 1883)
listener 1883
allow_anonymous true

# For TLS-encrypted MQTTS (port 8883)
listener 8883
cafile /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key
```

> [!IMPORTANT]
> For production environments, always use TLS (MQTTS on port 8883) and disable anonymous access.

Restart the broker after making changes:

```bash
sudo systemctl restart mosquitto
```

### Step 2: Configure Authentication

ThermoWorks devices support three authentication methods. Choose the one that matches your setup:

**Option A: Username / Password**

On Mosquitto, create a password file:

```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd mydeviceuser
# Enter password when prompted
```

Update `mosquitto.conf`:

```text
allow_anonymous false
password_file /etc/mosquitto/passwd
```

During BLE provisioning you will write this username and password to the device.

**Option B: Client Certificate**

> [!WARNING]
> Client Key / Cert is currently unavailable and will cause issues with NODE. Please contact sales for more information if this is required for your configuration.

**Option C: Unauthenticated**

Set `allow_anonymous true` in your broker config. During provisioning, send empty strings for the username, password, client cert, and client key fields.

### Step 3: Create the Topic Structure

ThermoWorks devices use the following topic hierarchy. Your backend must be prepared to handle all three:

| Topic Pattern                     | Direction         | Purpose                               | QoS   |
| --------------------------------- | ----------------- | ------------------------------------- | ----- |
| `/devices/{deviceId}/config`      | Broker → Device   | Send configuration to the device      | 1     |
| `/devices/{deviceId}/state`       | Device → Broker   | Device reports its current state      | 1     |
| `/devices/{deviceId}/events`      | Device → Broker   | Device sends telemetry readings       | 1     |
| `/probes/{probeId}/events`        | Device → Broker   | RFX probe sends telemetry readings    | 1     |

The `{deviceId}` is the device serial number (e.g., `T10061CE92E24`). The `{probeId}` is the RFX probe identifier (e.g., `M123456789012`).

> [!NOTE]
> If you publish a config, it should be a **retained** message so the device receives it immediately upon subscribing. If no config is present on the topic, the device will use its built-in defaults.

### Step 4: Prepare and Publish Device Configuration (Optional)

Publishing a config is **optional**. If no config message exists on the device's config topic, the device will operate using its built-in defaults (e.g., default labels, alarm thresholds, and transmission intervals).

When you are ready to customize the device's behavior, publish a config JSON as a **retained message** on the device's config topic. The device will pick it up the next time it connects and subscribes.

**Minimal config example:**

```json
{
    "label": "Kitchen Smoker",
    "actionLabel": "",
    "firmware": "v2.45",
    "units": "F",
    "displayUnits": "F",
    "transmitIntervalInSeconds": 60,
    "recordingIntervalInSeconds": 60,
    "channels": [
        {
            "number": 1,
            "label": "Meat Probe",
            "enabled": true,
            "displayUnits": "F",
            "alarmHigh": {
                "value": 200,
                "units": "F",
                "enabled": true,
                "muted": false
            },
            "alarmLow": {
                "value": 50,
                "units": "F",
                "enabled": true,
                "muted": false
            },
            "trim": {
                "value": 0,
                "units": "F"
            }
        }
    ]
}
```

Publish it with `mosquitto_pub`:

```bash
mosquitto_pub -h your-broker-host -p 8883 \
  --cafile ca.crt \
  -u "mydeviceuser" -P "mypassword" \
  -t "/devices/T10061CE92E24/config" \
  -r \
  -f device_config.json
```

- `-r` makes the message **retained** so the device receives it on first subscribe.
- `-f device_config.json` reads the JSON payload from a file.

For the full config schema and all available fields, see the [Device Config Object](#device-config-object).

### Step 5: Subscribe to Device State and Telemetry

Before provisioning the device, set up subscribers on the state and telemetry topics so you can verify data flow.

**Subscribe to state:**

```bash
mosquitto_sub -h your-broker-host -p 8883 \
  --cafile ca.crt \
  -u "mydeviceuser" -P "mypassword" \
  -t "/devices/T10061CE92E24/state" \
  -v
```

**Subscribe to telemetry:**

```bash
mosquitto_sub -h your-broker-host -p 8883 \
  --cafile ca.crt \
  -u "mydeviceuser" -P "mypassword" \
  -t "/devices/T10061CE92E24/events" \
  -v
```

**Subscribe to all device topics at once (useful for debugging):**

```bash
mosquitto_sub -h your-broker-host -p 8883 \
  --cafile ca.crt \
  -u "mydeviceuser" -P "mypassword" \
  -t "/devices/T10061CE92E24/#" \
  -v
```

### Step 6: Provision the Device via BLE

We recommend developing your own app or website for provisioning devices. There are many resources available for app/web BLE development, so we won't go into detail here.

For **testing purposes only**, ThermoWorks provides a web-based provisioning tool:

> [!WARNING]
> The testing site below is **not guaranteed** to be available at all times. It is updated without notice, and features may change or disappear without warning. **Do not** rely on it for production use.

🔗 [https://thermoworks-iot-provisioning.web.app/](https://thermoworks-iot-provisioning.web.app/)

With the broker running and the config published, you can now provision the physical device:

1. **Enter Setup Mode**
   - **NODE (battery-powered devices):** Hold the START button for 5–10 seconds until the display reads `SETUPMODE`.
   - **RFX Gateway:** Simply power on the device — it enters setup mode automatically.
2. **BLE Scan** — Scan for BLE devices filtering by the device name (e.g., `NODE`, `RFXGATEWAY`) or company ID `0x0B11`.
3. **Connect** — Connect to the device via BLE.
4. **Write the following BLE characteristics** (all fields are required — send empty strings for unused fields):

| Field             | Example Value                         | Notes                                                |
| ----------------- | ------------------------------------- | ---------------------------------------------------- |
| Wi-Fi SSID        | `MyWiFiNetwork`                       | IEEE 802.11 compliant, max 32 chars                  |
| Wi-Fi Password    | `MyWiFiPassword`                      | Max 64 chars                                         |
| MQTT Broker URL   | `mqtts://mqtt.yourserver.com`         | Use `mqtt://` for unencrypted, `mqtts://` for TLS    |
| MQTT Broker Port  | `8883`                                | 1883 for MQTT, 8883 for MQTTS                        |
| MQTT Username     | `mydeviceuser`                        | Empty string if not using username/password auth      |
| MQTT Password     | `mypassword`                          | Empty string if not using username/password auth      |
| MQTT CA Cert      | `-----BEGIN CERTIFICATE-----...`      | Required for `mqtts://` and `wss://`, empty otherwise |
| MQTT Client Cert  | (empty string)                        | Currently unavailable — send empty string             |
| MQTT Client Key   | (empty string)                        | Currently unavailable — send empty string             |



5. **Send the CONNECT_START command** — Write `CONNECT_START` to the Commands characteristic to initiate connection.
6. **Monitor BLE status characteristics:**
   - **Wi-Fi Connection Status**: `1` = connected, `0` = not connected
   - **MQTT Connection Status**: `1` = connected, `0` = not connected
   - Check the Wi-Fi Error and MQTT Error characteristics if connection fails.

For full provisioning details, see the [Provisioning Details](#provisioning-details) section.

### Step 7: Verify the Connection

Once the device is provisioned, it will follow this sequence on every wake cycle:

```mermaid
sequenceDiagram
    participant Device
    participant Broker
    participant Backend

    Device->>Broker: Connect (authenticate)
    Broker-->>Device: Connection ACK
    Device->>Broker: SUBSCRIBE /devices/{deviceId}/config
    Broker-->>Device: Retained config message
    Device->>Broker: PUBLISH /devices/{deviceId}/state
    Broker->>Backend: Forward state message
    Device->>Broker: PUBLISH /devices/{deviceId}/events
    Broker->>Backend: Forward telemetry message
    Note over Device: Disconnect and sleep (battery-powered devices only)
```

> [!NOTE]
> The diagram above shows the behavior for battery-powered devices (e.g., NODE) which disconnect and sleep after each transmission cycle. **RFX Gateway devices** maintain a persistent connection to the broker and do not disconnect between transmissions.

You should see messages appear on your `mosquitto_sub` terminals:

**Example state message received:**

```json
{
  "device": "signals",
  "type": "bbq",
  "label": "Kitchen Smoker",
  "wifi_strength": 85,
  "firmware": "v2.45",
  "displayUnits": "F",
  "battery": "C",
  "serial": "T10061CE92E24",
  "connectedSSID": "MyWiFiNetwork",
  "transmitIntervalInSeconds": 60,
  "recordingIntervalInSeconds": 60,
  "channels": [
    {
      "number": 1,
      "reading": {
        "value": 75.2,
        "type": "T",
        "ts": 1582574880770
      },
      "highAlarm": { "alarming": false },
      "lowAlarm": { "alarming": false }
    }
  ]
}
```

**Example telemetry message received:**

```json
{
  "channels": [
    {
      "number": "1",
      "ts": 1582574880770,
      "readings": [
        {
          "value": 75.2,
          "type": "T"
        }
      ]
    }
  ]
}
```

For the full state and telemetry schemas, see [State Object](#state-object) and [Telemetry](#telemetry).

### Step 8: Handle Incoming Messages in Your Backend

Your backend should subscribe to the wildcard topics to receive data from all devices:

```text
/devices/+/state     — Receive state from all devices
/devices/+/events    — Receive telemetry from all devices
/probes/+/events     — Receive telemetry from all RFX probes
```

The `+` wildcard matches a single level (the device or probe ID).

**Processing guidelines:**

1. **Parse the topic** to extract the `deviceId` or `probeId`:
   - Topic `/devices/T10061CE92E24/state` → deviceId = `T10061CE92E24`
   - Topic `/probes/M123456789012/events` → probeId = `M123456789012`

2. **Parse the JSON payload** according to the object definitions:
   - State messages: [State Object](#state-object)
   - Telemetry messages: [Telemetry](#telemetry)
   - RFX telemetry: [RFX Objects](#rfx-objects)

3. **Store and forward** the data to your application layer as needed.

4. **Monitor alarm states** — Check `highAlarm.alarming` and `lowAlarm.alarming` fields in state messages to detect alarm conditions and trigger notifications.

### Step 9: Update Device Configuration Remotely

To change device settings (e.g., alarm thresholds, labels, transmission intervals), publish an updated config JSON as a retained message:

```bash
mosquitto_pub -h your-broker-host -p 8883 \
  --cafile ca.crt \
  -u "mydeviceuser" -P "mypassword" \
  -t "/devices/T10061CE92E24/config" \
  -r \
  -m '{"label":"Updated Label","transmitIntervalInSeconds":120,"recordingIntervalInSeconds":60,"units":"F","displayUnits":"F","channels":[{"number":1,"label":"Meat Probe","enabled":true,"displayUnits":"F","alarmHigh":{"value":225,"units":"F","enabled":true,"muted":false},"alarmLow":{"value":50,"units":"F","enabled":true,"muted":false},"trim":{"value":0,"units":"F"}}]}'
```

The device will pick up the new configuration the next time it wakes and subscribes to its config topic.

> [!IMPORTANT]
> Always publish the **complete** config object. The device replaces its entire configuration with whatever is received — partial updates are not supported.

### Troubleshooting

| Symptom                                 | Likely Cause                                          | Resolution                                                                                                    |
| --------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Device shows `NEEDS SETUP`              | Device is unprovisioned                               | Follow [Step 6](#step-6-provision-the-device-via-ble) to provision via BLE                                    |
| Wi-Fi status stays `0`                  | Incorrect SSID or password                            | Re-provision with correct Wi-Fi credentials. Check [Wi-Fi error codes](#wifi-errors)                          |
| MQTT status stays `0`                   | Broker unreachable, wrong URL/port, or auth failure   | Verify broker is running, URL format is correct, and credentials match. Check [MQTT error codes](#mqtt-connection-errors) |
| Device connects but no telemetry        | No retained config on the config topic                | Publish a retained config per [Step 4](#step-4-prepare-and-publish-device-configuration)                       |
| TLS handshake fails                     | CA certificate mismatch or expired                    | Verify the CA cert matches your broker's server cert. Check [TLS error codes](#mqtt-tls-errors)               |
| Device sends data once then stops       | Normal for battery-powered devices — they sleep between transmit intervals | Wait for `transmitIntervalInSeconds` to elapse; the device will reconnect and send again. RFX Gateways do not sleep and will transmit continuously. |
| Alarm state not updating                | Config not publishing alarm settings                  | Ensure `alarmHigh` and `alarmLow` objects are included in the config with `enabled: true`                     |
| `ERR_MBEDTLS_X509_CRT_PARSE_FAILED`    | Malformed or incorrectly encoded certificate          | Ensure PEM-encoded cert is sent in full via BLE (certs > 1024 bytes can be sent in multiple writes)           |

  </details>

<details open>

<summary>Bluetooth Information</summary>

# BLE Service Details


> [!important] 
> BLE for sensors, i.e. NODE, is disabled unless in SETUP MODE to save battery life. To enter SETUP MODE please check the device documentation. 

> [!note]
> When using Bluetooth BLE, set the ATT MTU to 512 octets in size.

BLE Version: 4.2

### Device Information Service

- Service UUID: `180A`

| Characteristic UUID | Name                | Read | Write | Notify |
| ------------------- | ------------------- | :--: | :---: | :----: |
| `0x2A24`            | Model Number String |      |   X   |        |

Model number will be the device name for example

- NODE
- SIGNALS
- SMOKE

| Characteristic UUID | Name                 | Read | Write | Notify |
| ------------------- | -------------------- | :--: | :---: | :----: |
| `0x2A25`            | Serial Number String |  X   |       |        |

Serial Numbers for ThermoWorks Products will in the following format.

**TXXXXXXXXXXXX**

X's are hex chars.

| Characteristic UUID | Name                     | Read | Write | Notify |
| ------------------- | ------------------------ | :--: | :---: | :----: |
| `0x2A26`            | Firmware Revision String |  X   |       |        |

Device Firmware version currently running.

| Characteristic UUID | Name                     | Read | Write | Notify |
| ------------------- | ------------------------ | :--: | :---: | :----: |
| `0x2A27`            | Hardware Revision String |  X   |       |        |

Hardware Revision

| Characteristic UUID | Name                     | Read | Write | Notify |
| ------------------- | ------------------------ | :--: | :---: | :----: |
| `0x2A28`            | Software Revision String |  X   |       |        |

Software Revision for Chips

| Characteristic UUID | Name                     | Read | Write | Notify |
| ------------------- | ------------------------ | :--: | :---: | :----: |
| `0x2A29`            | Manufacturer Name String |  X   |       |        |

Will be ThermoWorks

### Battery Information Service

- Service UUID: `180F`

| Characteristic UUID | Name            | Read | Write | Notify |
| ------------------- | --------------- | ---- | ----- | ------ |
| 0x2A19              | Battery Level X |      |       |

Battery level will be returned as an integer. Range from 0 - 100

### Wifi/IoT Information Service

- Service UUID: `00010074-6865-726D-6F77-6F726B730D0A`

---

| Characteristic UUID                    | Name      | Length | Read | Write | Notify |
| -------------------------------------- | --------- | ------ | ---- | ----- | ------ |
| `00010174-6865-726D-6F77-6F726B730D0A` | Wifi SSID | 32     | x    | x     |        |

The SSID characteristics supports the standard set up by IEEE in 802.11

---

| Characteristic UUID                    | Name          | Length | Read | Write | Notify |
| -------------------------------------- | ------------- | ------ | ---- | ----- | ------ |
| `00010274-6865-726D-6F77-6F726B730D0A` | Wifi Password | 64     |      | x     |

The SSID Password characteristics supports the standard set up by IEEE in 802.11

---

| Characteristic UUID                    | Name        | Length | Read | Write | Notify |
| -------------------------------------- | ----------- | ------ | ---- | ----- | ------ |
| `00010374-6865-726D-6F77-6F726B730D0A` | Private Key | 1024   |      | x     |        |

Legacy Google IoT Core - Not in use as Google IoT Core has been shutdown

---

| Characteristic UUID                    | Name                   | Length | Read | Write | Notify |
| -------------------------------------- | ---------------------- | ------ | ---- | ----- | ------ |
| `00010474-6865-726D-6F77-6F726B730D0A` | Wifi Connection Status | 1      | x    |       | x      |

Returns the current state of the Wi-Fi Connection. a "1" means that the Wi-Fi is connected and has obtained an IP Address. "0" means that the Wi-Fi has not connected successfully.
The Wi-Fi icon on the display will only show if the connection state is a "1".

- 1 Connected
- 0 Not Connected

---

| Characteristic UUID                    | Name                  | Length | Read | Write | Notify |
| -------------------------------------- | --------------------- | ------ | ---- | ----- | ------ |
| `00010574-6865-726D-6F77-6F726B730D0A` | Wifi Connection Error | 10     | x    |       | x      |

If there is an error that occurs while attempting to connect to Wi-Fi it will be displayed here.

- 0 - No Error
- 12298 - SSID Invalid
- 12299 - Password Invalid
- 12300 - Timeout Error

  Any additional error codes would be unexpected, you can contact support for help and details.

---

| Characteristic UUID                    | Name                   | Length | Read | Write | Notify |
| -------------------------------------- | ---------------------- | ------ | ---- | ----- | ------ |
| `00010674-6865-726D-6F77-6F726B730D0A` | MQTT Connection Status | 1      | x    |       | x      |

Returns the current state of the MQTT Connection. a "1" means that the MQTT client has successfully connected to the broker. a "0" means that the connection has not been made.

- 1 Connected
- 0 Not Connected

---

| Characteristic UUID                    | Name                  | Length | Read | Write | Notify |
| -------------------------------------- | --------------------- | ------ | ---- | ----- | ------ |
| `00010774-6865-726D-6F77-6F726B730D0A` | MQTT Connection Error | 10     | x    |       | x      |

If there is an error that occurs while attempting to connect to the MQTT broker it will be displayed here.

- 0 - No Error
- 1 - TCP Transport Connection Error
- 2 - Connection Refused
- 3 - Subscription Requested Failed.

---

| Characteristic UUID                    | Name     | Length | Read | Write | Notify |
| -------------------------------------- | -------- | ------ | ---- | ----- | ------ |
| `00010874-6865-726D-6F77-6F726B730D0A` | Commands |        | x    | x     | x      |

This characteristic will accept a string as a trigger for a command.

**Commands**

- "FACTORY_RESET" this will clear the non-volatile storage of any settings. This will return the device to factory settings and set the device to unprovisioned.
- "SCAN" This will return a list of SSIDs that the device currently sees. Results will be returned as a Notify on this characteristic.
  - SCAN notify will be in the following CSV format "AUTHMODE,RSSI,SSID" You will get one notify per SSID found.
  - The scan will last for a few seconds after which it will return to its previous state.
- "LOG_LEVEL" this will set the log level on the firmware from warning to log. This is used internally for debugging issues in firmware. Data from the logs is available on the usb connection via UART.
- "CONNECT_START" This will force the device to attempt a Wi-Fi and IoT Connection when in SETUP MODE and is used as part of the provisioning process.

---

| Characteristic UUID                     | Name              | Length | Read | Write | Notify |
| --------------------------------------- | ----------------- | ------ | ---- | ----- | ------ |
| `00010974-6865-726D-6F77-6F726B730D0A ` | Google Project ID |        | x    | x     | x      |

Legacy Google IoT Core

---

| Characteristic UUID                    | Name          | Length | Read | Write | Notify |
| -------------------------------------- | ------------- | ------ | ---- | ----- | ------ |
| `00010A74-6865-726D-6F77-6F726B730D0A` | Google Region |        | x    | x     | x      |

Legacy Google IoT Core

---

| Characteristic UUID                    | Name                | Length | Read | Write | Notify |
| -------------------------------------- | ------------------- | ------ | ---- | ----- | ------ |
| `00010B74-6865-726D-6F77-6F726B730D0A` | Google Iot Registry |        | x    | x     | x      |

Legacy Google IoT Core

---

| Characteristic UUID                    | Name      | Length | Read | Write | Notify |
| -------------------------------------- | --------- | ------ | ---- | ----- | ------ |
| `00010C74-6865-726D-6F77-6F726B730D0A` | Device ID | 13     | x    |       |        |

Serial Numbers for ThermoWorks Products will in the following format.

**TXXXXXXXXXXXX**

X's are hex chars.

---

| Characteristic UUID                    | Name            | Length | Read | Write | Notify |
| -------------------------------------- | --------------- | ------ | ---- | ----- | ------ |
| `00010D74-6865-726D-6F77-6F726B730D0A` | MQTT Broker URL | 64     | x    | x     |        |

Broker uri is used in the following format **scheme://hostname**

**Examples:**

- MQTT over TCP
  - mqtt://mqtt.eclipseprojects.io
  - mqtts://mqtts.eclipseprojects.io
- MQTT over WebSocket
  - ws://mqtt.eclipseprojects.io/mqtt
  - wss://mqtt.elcipseprojects.io/mqtt

> [!IMPORTANT]
> By default ThermoWorks products will point to the ThermoWorks Brokers unless overwritten. This also includes all authentication parameters. Overwrite all params when setting device up to point to a 3rd party MQTT service.

---

| Characteristic UUID                    | Name             | Length | Read | Write | Notify |
| -------------------------------------- | ---------------- | ------ | ---- | ----- | ------ |
| `00010E74-6865-726D-6F77-6F726B730D0A` | MQTT Broker Port | 10     | x    | x     |        |

MQTT Port used by the broker. Standard Ports are 1883 for MQTT and 8883 for MQTTS.

Default port is 8883

---

| Characteristic UUID                    | Name          | Length | Read | Write | Notify |
| -------------------------------------- | ------------- | ------ | ---- | ----- | ------ |
| `00010F74-6865-726D-6F77-6F726B730D0A` | MQTT Username | 64     | x    | x     |        |

Username used for MQTT authentication. If not used send an empty string to remove.

---

| Characteristic UUID                    | Name          | Length | Read | Write | Notify |
| -------------------------------------- | ------------- | ------ | ---- | ----- | ------ |
| `00011074-6865-726D-6F77-6F726B730D0A` | MQTT Password | 64     |      | x     |        |

Password used for MQTT authentication. If not used send an empty string to remove.

---

| Characteristic UUID                    | Name         | Length | Read | Write | Notify |
| -------------------------------------- | ------------ | ------ | ---- | ----- | ------ |
| `00011174-6865-726D-6F77-6F726B730D0A` | MQTT CA Cert | 1024   |  x   | x     | x      |

CA Cert used for MQTTs and WSS connections. If not using secured connections send an empty string to remove.
If CA cert is longer then 1024 chars you can send it in pieces, i.e. the first 1024 and then the remaining. The system will merge them together.


[Certificate Update Details](#ble-mqtt-certificate-provisioning)

Read/Notify Validation Responses. 

- "VALID"
- "INVALID"
---

| Characteristic UUID                    | Name             | Length | Read | Write | Notify |
| -------------------------------------- | ---------------- | ------ | ---- | ----- | ------ |
| `00011274-6865-726D-6F77-6F726B730D0A` | MQTT Client Cert | 1024   |   x  | x     |    x   |

Client Cert used for MQTT authentication. If not used send an empty string to remove. See CA Cert for details on Certs longer then 1024

[Certificate Update Details](#ble-mqtt-certificate-provisioning)

Read/Notify Validation Responses. 

- "VALID"
- "INVALID"
---

| Characteristic UUID                    | Name            | Length | Read | Write | Notify |
| -------------------------------------- | --------------- | ------ | ---- | ----- | ------ |
| `00011374-6865-726D-6F77-6F726B730D0A` | MQTT Client Key | 1024   |      | x     | x       |

Client Key used for MQTT authentication. If not used send an empty string to remove. See CA Cert for details on keys longer then 1024

[Certificate Update Details](#ble-mqtt-certificate-provisioning)

Notify Validation Responses. 

- "VALID"
- "INVALID"
---

| Characteristic UUID                    | Name            | Length | Read | Write | Notify |
| -------------------------------------- | --------------- | ------ | ---- | ----- | ------ |
| `00011474-6865-726D-6F77-6F726B730D0A` | Wifi Enabled | 1024   |   x  | x     |        |

Wifi Enabled field is used to enable or disable the wifi temporarily. This field will be reset to true when the device reboots. This is used to put the device into a Bluetooth Only Mode, no Cloud or wifi connection. 


### BLE MQTT Certificate Provisioning

This device supports secure MQTT provisioning over BLE using dedicated GATT characteristics for certificate and key transfer.

### Update Process

1. **Write Operation:**  
   BLE clients write PEM-encoded certificate or key data to the corresponding characteristic.

2. **Format Validation:**  
   - CA and client certificates must start with `-----BEGIN CERTIFICATE-----`.
   - Client key must start with `-----BEGIN PRIVATE KEY-----`.
   - If the format is invalid or the data is empty, the update is rejected and the client is notified.

3. **Storage:**  
   Valid data is buffered and stored for use in MQTT TLS connections.

### Validation

- **Format Check:**  
  Only the PEM format is checked during BLE write. No deep cryptographic validation is performed at this stage.

- **Notification:**  
  The device uses BLE notifications to inform the client of the result (valid/invalid).

- **Further Validation:**  
  Cryptographic validation (certificate chain, key pair match) occurs later when establishing the MQTT connection.

### Error Handling

- If the data is not in the expected format, the device rejects the update and notifies the BLE client.
- Only correctly formatted PEM data is accepted.

### Integration Notes

- Credentials are stored securely on the device.
- For full security, ensure certificates and keys are generated and managed according to your organization's best practices.

## Device Detail Service

- Service UUID: `00A00074-6865-726D-6F77-6F726B730D0A`

All Characteristics are sent and received as strings.

---

#### Label

| Characteristic UUID                    | Name  | Read | Write | Notify | Available In |
| -------------------------------------- | ----- | ---- | ----- | ------ | ------------ |
| `00A00174-6865-726D-6F77-6F726B730D0A` | Label | x    | x     |        | > +40        |

---

#### Action Label

| Characteristic UUID                    | Name         | Read | Write | Notify | Available In |
| -------------------------------------- | ------------ | ---- | ----- | ------ | ------------ |
| `00A00274-6865-726D-6F77-6F726B730D0A` | Action Label | x    | x     |        | > +40        |

---

#### Number of channels

| Characteristic UUID                    | Name          | Read | Write | Notify | Available In |
| -------------------------------------- | ------------- | ---- | ----- | ------ | ------------ |
| `00A00374-6865-726D-6F77-6F726B730D0A` | Channel Count | x    |       |        | > +40        |

---

#### Provisioning Status

| Characteristic UUID                    | Name                | Read | Write | Notify | Available In |
| -------------------------------------- | ------------------- | ---- | ----- | ------ | ------------ |
| `00A00474-6865-726D-6F77-6F726B730D0A` | Provisioning Status | x    |       |        | > +40        |

- 0: PENDING
- 1: SUCCESS
- 2: CONFIG
- 3: UPDATE
- 4: FAILURE
- 5: USER STOPPED
- 6: OTA PENDING

---

#### Display Unit

Unit(C/F) to display on the display if applicable. Other units such as R/H will ignore this.

| Characteristic UUID                    | Name         | Read | Write | Notify | Available In |
| -------------------------------------- | ------------ | ---- | ----- | ------ | ------------ |
| `00A00574-6865-726D-6F77-6F726B730D0A` | Display Unit | x    | x     |        | > +40        |

- 0: C
- 1: F

---

#### Recording Rate in Seconds

Recording rate is how often the device takes and saves a reading.

| Characteristic UUID                    | Name                      | Read | Write | Notify | Available In |
| -------------------------------------- | ------------------------- | ---- | ----- | ------ | ------------ |
| `00A00674-6865-726D-6F77-6F726B730D0A` | Recording Rate in Seconds | x    | x     |        | > +40        |

---

#### Transmission Rate in Seconds

Transmission rate is how often the device will transmit via Wi-Fi.

| Characteristic UUID                    | Name                         | Read | Write | Notify | Available In |
| -------------------------------------- | ---------------------------- | ---- | ----- | ------ | ------------ |
| `00A00774-6865-726D-6F77-6F726B730D0A` | Transmission Rate in Seconds | x    | x     |        | > +40        |

## Channel 1 Service


> **⚠️ IMPORTANT:**  
> **Channel 1 Service has been deprecated has been superseded by the ThermoWorks [Data Service](#data-service). Please use the [Data Service](#data-service) for future devices if present.**

- Service UUID: `00A10074-6865-726D-6F77-6F726B730D0A`

All Characteristics are sent and received as strings.

---

#### Channel 1 Type

Sensor Type of the Channel 1

| Characteristic UUID                    | Name           | Read | Write | Notify | Available In |
| -------------------------------------- | -------------- | ---- | ----- | ------ | ------------ |
| `00A11074-6865-726D-6F77-6F726B730D0A` | Channel 1 Type | x    |       |        | > +40        |

- 0: Pro-Series (Limited) External Probes on NODE
- 1: Humidity
- 2: Internal Chip Sensor
- 3: Humidity (AHT)
- 4: Humidity Temperature (AHT)
- 5: Pro-Series External Full Range
- 6: Humidity (SHTC)
- 7: Humidity Temperature (SHTC)
- 8: Pro-Series Internal

---

#### Channel 1 Status

Status of Channel 1

| Characteristic UUID                    | Name             | Read | Write | Notify | Available In |
| -------------------------------------- | ---------------- | ---- | ----- | ------ | ------------ |
| `00A11174-6865-726D-6F77-6F726B730D0A` | Channel 1 Status | x    |       |        | > +40        |

- 0: Normal
- 1: LOW ERROR
- 2: HIGH ERROR
- 3: NO PROBE
- 4: DISABLED

---

#### Channel 1 Value

This is the Value of Channel 1. If the device is not provisioned it will output an empty string.

| Characteristic UUID                    | Name            | Read | Write | Notify | Available In |
| -------------------------------------- | --------------- | ---- | ----- | ------ | ------------ |
| `00A11274-6865-726D-6F77-6F726B730D0A` | Channel 1 Value | x    |       | x      | > +40        |

---

#### Channel 1 Unit

This is the unit in which the value was taken. It is set with the channel type.

| Characteristic UUID                    | Name           | Read | Write | Notify | Available In |
| -------------------------------------- | -------------- | ---- | ----- | ------ | ------------ |
| `00A11374-6865-726D-6F77-6F726B730D0A` | Channel 1 Unit | x    |       |        | > +40        |

- 0: C
- 1: F
- 2: RH

---

#### Channel 1 High Alarm Enabled

| Characteristic UUID                    | Name                         | Read | Write | Notify | Available In |
| -------------------------------------- | ---------------------------- | ---- | ----- | ------ | ------------ |
| `00A12174-6865-726D-6F77-6F726B730D0A` | Channel 1 High Alarm Enabled | x    | x     |        | > +40        |

- 0: Disabled
- 1: Enabled

---

#### Channel 1 High Alarm Value

| Characteristic UUID                    | Name                       | Read | Write | Notify | Available In |
| -------------------------------------- | -------------------------- | ---- | ----- | ------ | ------------ |
| `00A12274-6865-726D-6F77-6F726B730D0A` | Channel 1 High Alarm Value | x    | x     |        | > +40        |

Value between -50 and 572 F.

---

#### Channel 1 High Alarm Units

| Characteristic UUID                    | Name                       | Read | Write | Notify | Available In |
| -------------------------------------- | -------------------------- | ---- | ----- | ------ | ------------ |
| `00A12374-6865-726D-6F77-6F726B730D0A` | Channel 1 High Alarm Units | x    | x     |        | > +40        |

- 0: C
- 1: F
- 2: RH

---

#### Channel 1 High Alarm Muted

- available in firmware > +40

| Characteristic UUID                    | Name                       | Read | Write | Notify | Available In |
| -------------------------------------- | -------------------------- | ---- | ----- | ------ | ------------ |
| `00A12474-6865-726D-6F77-6F726B730D0A` | Channel 1 High Alarm Muted | x    | x     | x      | > +40        |

- 0: Not Muted
- 1: Muted

---

#### Channel 1 High Alarm Alarming

| Characteristic UUID                    | Name                          | Read | Write | Notify | Available In |
| -------------------------------------- | ----------------------------- | ---- | ----- | ------ | ------------ |
| `00A12574-6865-726D-6F77-6F726B730D0A` | Channel 1 High Alarm Alarming | x    |       | x      | > +40        |

- 0: Not Alarming
- 1: Alarming

---

#### Channel 1 Low Alarm Enabled

| Characteristic UUID                    | Name                        | Read | Write | Notify | Available In |
| -------------------------------------- | --------------------------- | ---- | ----- | ------ | ------------ |
| `00A13174-6865-726D-6F77-6F726B730D0A` | Channel 1 Low Alarm Enabled | x    | x     |        | > +40        |

- 0: Disabled
- 1: Enabled

---

#### Channel 1 Low Alarm Value

| Characteristic UUID                    | Name                      | Read | Write | Notify | Available In |
| -------------------------------------- | ------------------------- | ---- | ----- | ------ | ------------ |
| `00A13274-6865-726D-6F77-6F726B730D0A` | Channel 1 Low Alarm Value | x    | x     |        | > +40        |

Value between -50 and 572 F.

---

#### Channel 1 Low Alarm Units

| Characteristic UUID                    | Name                      | Read | Write | Notify | Available In |
| -------------------------------------- | ------------------------- | ---- | ----- | ------ | ------------ |
| `00A13374-6865-726D-6F77-6F726B730D0A` | Channel 1 Low Alarm Units | x    | x     |        | > +40        |

- 0: C
- 1: F
- 2: RH

---

#### Channel 1 Low Alarm Muted

| Characteristic UUID                    | Name                      | Read | Write | Notify | Available In |
| -------------------------------------- | ------------------------- | ---- | ----- | ------ | ------------ |
| `00A13474-6865-726D-6F77-6F726B730D0A` | Channel 1 Low Alarm Muted | x    | x     | x      | > +40        |

- 0: Not Muted
- 1: Muted

---

#### Channel 1 Low Alarm Alarming

| Characteristic UUID                    | Name                         | Read | Write | Notify | Available In |
| -------------------------------------- | ---------------------------- | ---- | ----- | ------ | ------------ |
| `00A13574-6865-726D-6F77-6F726B730D0A` | Channel 1 Low Alarm Alarming | x    |       | x      | > +40        |

- 0: Not Alarming
- 1: Alarming

---

#### Channel 1 User Trim Value

Trim values are valid between -4 and +4 in tenth of a degree. Values are stored as an int_8 in the system and need to have a times ten before being sent. For example:

```text
-3.2 would be sent as -32
2.1 would be sent as 21
```

| Characteristic UUID                    | Name                      | Read | Write | Notify | Available In |
| -------------------------------------- | ------------------------- | ---- | ----- | ------ | ------------ |
| `00A1E174-6865-726D-6F77-6F726B730D0A` | Channel 1 User Trim Value | x    | x     |        | > +40        |

---

#### Channel 1 User Trim Units

| Characteristic UUID                    | Name                      | Read | Write | Notify | Available In |
| -------------------------------------- | ------------------------- | ---- | ----- | ------ | ------------ |
| `00A1E274-6865-726D-6F77-6F726B730D0A` | Channel 1 User Trim Units | x    | x     |        | > +40        |

- 0: C
- 1: F

---

#### Channel 1 System Trim Value for (ThermoWorks Calibration Only)

| Characteristic UUID                    | Name                        | Read | Write | Notify | Available In |
| -------------------------------------- | --------------------------- | ---- | ----- | ------ | ------------ |
| `00A1F174-6865-726D-6F77-6F726B730D0A` | Channel 1 System Trim Value | x    | x     |        | > +40        |

---

#### Channel 1 System Trim Units (ThermoWorks Calibration Only)

| Characteristic UUID                    | Name                        | Read | Write | Notify | Available In |
| -------------------------------------- | --------------------------- | ---- | ----- | ------ | ------------ |
| `00A1F274-6865-726D-6F77-6F726B730D0A` | Channel 1 System Trim Units | x    | x     |        | > +40        |

- 0: C
- 1: F

---

## Billow Detail Service

This service is only available on devices will billows support enabled.

- Service UUID: `00B10074-6865-726D-6F77-6F726B730D0A`

## All Characteristics are sent and received as strings.

| Characteristic UUID                    | Name              | Read | Write | Notify |
| -------------------------------------- | ----------------- | ---- | ----- | ------ |
| `00B10174-6865-726D-6F77-6F726B730D0A` | Billows Connected | x    |       | x      |

- 0: Billows Detached
- 1: Billows Attached

---

| Characteristic UUID                    | Name             | Read | Write | Notify |
| -------------------------------------- | ---------------- | ---- | ----- | ------ |
| `00B10274-6865-726D-6F77-6F726B730D0A` | Billows Set Temp | x    | x     | x      |

This is always set in Degrees F.

- Default 225 F

---

| Characteristic UUID                    | Name          | Read | Write | Notify |
| -------------------------------------- | ------------- | ---- | ----- | ------ |
| `00B10374-6865-726D-6F77-6F726B730D0A` | Billows State | x    |       | x      |

- 0: Fan Off
- 1: Fan Full Speed
- 2: Fan Pulse Mode
- 4: Open Lid Detection

---

## RFX Service

This service allows communication with RFX Devices (Data / Config)

- Service UUID: `00C00074-6865-726D-6F77-6F726B730D0A`

## All Characteristics are sent and received as strings.

| Characteristic UUID                     | Name     | Read | Write | Notify |
| --------------------------------------- | -------- | ---- | ----- | ------ |
| `00C00174-6865-726D-6F77-6F726B730D0A` | RFX Data |      |       | x      |

> [!note]
> RFX Data service is only available in firmware version 1.2.3+47 and above.

[Data Objects](#rfx-objects)

---

| Characteristic UUID                     | Name       | Read | Write | Notify |
| --------------------------------------- | ---------- | ---- | ----- | ------ |
| `00C00274-6865-726D-6F77-6F726B730D0A`  | RFX Config |     |   x    |        |

[RFX Config Example](#rfxdeviceconfig-object)

Data can be sent over multiple packets. The final byte will need to be 0x01 to indicate to the device that all the config data has been sent. If this byte is not sent the firmware will just be waiting and not attempt to update the configs. 

## Over The Air Update Service

- Service UUID: `00FF0074-6865-726D-6F77-6F726B730D0A`

| Characteristic UUID                    | Name        | Read | Write | Notify |
| -------------------------------------- | ----------- | ---- | ----- | ------ |
| `00FF0174-6865-726D-6F77-6F726B730D0A` | OTA Control |      | x     |        |

---

| Characteristic UUID                    | Name     | Read | Write | Notify |
| -------------------------------------- | -------- | ---- | ----- | ------ |
| `00FF0274-6865-726D-6F77-6F726B730D0A` | OTA Data |      | x     |        |

---

| Characteristic UUID                    | Name       | Read | Write | Notify |
| -------------------------------------- | ---------- | ---- | ----- | ------ |
| `00FF0374-6865-726D-6F77-6F726B730D0A` | OTA Status |      |       | x      |

---

| Characteristic UUID                    | Name           | Read | Write | Notify | Available In |
| -------------------------------------- | -------------- | ---- | ----- | ------ | ------------ |
| `00FF0474-6865-726D-6F77-6F726B730D0A` | OTA Percentage |      |       | x      | > +40        |

---

🔐 OTA Control Protocol

The Control characteristic accepts the following command values:
| Value | Name | Direction | Notes |
| ----- | ---- | --------- | ----- |
0x01| REQUEST| Client → ESP| Ask device to start OTA
0x02|REQUEST_ACK|ESP → Client|Device accepted request
0x03|REQUEST_NAK|ESP → Client|Device rejected request
0x04|DONE|Client → ESP|Client finished sending firmware
0x05|DONE_ACK|ESP → Client|Device successfully applied firmware
0x06|DONE_NAK|ESP → Client|Update failed

🔧 OTA Workflow

	1.	Connect to the device and discover OTA service + characteristics.

	2.	Enable notifications on:
	  •	OTA Control (to receive ACK/NAK)
	  •	OTA Status (to monitor update state)
	  •	OTA Percent (optional, fw > v40)

	3.	Send packet size
	  •	First write to OTA Data must contain 2 bytes (little-endian) with the chunk size.
	  •	Example: 0xF0 0x00 = 240-byte chunks.

	4.	Send OTA Request
	  •	Write 0x01 (REQUEST) to OTA Control.
	  •	Wait for REQUEST_ACK (0x02) notification.

	5.	Stream firmware file
	  •	Send firmware in sequential chunks of the chosen size to OTA Data.
	  •	Use write-with-response or pacing if needed.
	  •	Track progress locally or via OTA Percent notifications.

	6.	Finish update
	  •	Write 0x04 (DONE) to OTA Control.
	  •	Wait for DONE_ACK (0x05) notification.

	7.	Reboot
	  •	Device reboots into new firmware.
	  •	BLE disconnects.
	  •	Client should reconnect and confirm firmware version.

⚠️ Implementation Notes

	•	MTU size matters: choose packet size = (MTU - 3). Typical max is 244 bytes.
	•	Flow control: on some platforms (iOS/Android), you must throttle write-without-response.
	•	Error handling: always check for NAKs. If update fails, device stays on old firmware.
	•	Timeouts: add timeouts when waiting for ACK/NAK or notifications.
	•	Verification: after reconnect, query device for its firmware version to confirm success.

```mermaid
sequenceDiagram
    participant Client
    participant ESP32

    Client->>ESP32: Connect & Discover OTA Service
    Client->>ESP32: Enable Notifications (Control, Status, Percent)

    Note over Client, ESP32: Start OTA process
    Client->>ESP32: Write Packet Size (OTA Data)
    Client->>ESP32: Write OTA Request (Control)
    ESP32-->>Client: REQUEST_ACK (Control)

    loop Send Firmware Chunks
        Client->>ESP32: Write Data Chunk (OTA Data)
        ESP32-->>Client: Optional Percent Notification
    end

    Client->>ESP32: Write OTA Done (Control)
    ESP32-->>Client: DONE_ACK (Control)

    Note over ESP32: Validate firmware and set new boot partition
    ESP32-->>ESP32: Reboot
    ESP32-->>Client: BLE Disconnect
```

✅ Summary
	•	OTA Control = start/stop commands and acknowledgments
	•	OTA Data = firmware file packets
	•	OTA Status = high-level state (running, success, fail)
	•	OTA Percent = progress reporting (fw > v40)


## Data Service

This service allows you to request and update data from the device. 

- Service UUID: `00D10074-6865-726D-6F77-6F726B730D0A`

## All Characteristics are sent and received as strings.

| Characteristic UUID                     | Name     | Read | Write | Notify |
| --------------------------------------- | -------- | ---- | ----- | ------ |
| `00D10174-6865-726D-6F77-6F726B730D0A` | Channel Configuration Data |      |   x   | x      |

---

### Requesting and Setting Data from a ThermoWorks Data Characteristic

#### Requesting Data

To request data from a characteristic, use the following format:

```
CCXX
```

- **CC**: The channel number, represented as a two-digit value with a leading zero if necessary (e.g., `01` for Channel 1, `02` for Channel 2).
- **XX**: The data type, represented as a two-digit hexadecimal value.

The requested value will be returned on the notify of this characteristic. The notify will include the same header (`CCXX`) to ensure you can parse the response properly.

##### Example of a Get Request

To request the current value of Channel 1:

```
0103
```

In this example:
- `01` represents Channel 1.
- `03` represents the data type for the current value.


The requested value will be returned on the notify of this characteristic. The notify will include the same header (`CCXX`) to ensure you can parse the response properly.

Response via notify
```
010375.2
```

can be broken down as follows:
- `01`: Channel 1.
- `03`: Data type for Channel Value.
- `75.2`: The current value of Channel 1, which could represent a temperature, humidity, or other measurement depending on the channel's configuration.

> **Note**: The response always includes the same header (`CCXX`) as the request to ensure proper parsing and association of the value with the correct channel and data type.

#### Setting Data

To set a value for a characteristic, append the desired value after the `CCXX` format. The value should be in the appropriate format for the characteristic being updated.

##### Example of a Set Request

To set a value of `10` for Channel 1's trim value (data type `0F`):

```
010F10
```

In this example:
- `01` represents Channel 1.
- `0F` represents the data type for the trim value.
- `10` 10 is the value being set.

### Data Service Types

The following table outlines the types (`XX` in `CCXX`) that can be used with the **Data Service** to get or set data for a specific channel:

| **Type (Hex)** | **Name**                     | **Description**                                                                                     | **Get** | **Set** | **Updates** | **Notes**                                                                                     |
|-----------------|------------------------------|-----------------------------------------------------------------------------------------------------|----------|-----------|------------|-----------------------------------------------------------------------------------------------|
| `01`           | Channel Type                 | The type of sensor used on the channel (e.g., `0: Pro-Series`, `1: Humidity`, etc.).               | Yes      | No        | No         | - 0: Pro-Series (Limited) External Probes<br>- 1: Humidity<br>- 2: Internal Chip Sensor, [more](#channel-types) |
| `02`           | Channel Status               | The current status of the channel (`0: Normal`, `1: LOW ERROR`, `2: HIGH ERROR`, etc.).            | Yes      | No        | Yes         | - 0: Normal<br>- 1: LOW ERROR<br>- 2: HIGH ERROR<br>- 3: NO PROBE<br>- 4: DISABLED            |
| `03`           | Channel Value                | The current value of the channel.                                                                  | Yes      | No        | Yes        | If the device is not provisioned, it will output an empty string.                             |
| `04`           | Channel Unit                 | The unit of measurement for the channel (e.g., `0: C`, `1: F`, `2: RH`).                           | Yes      | No        | No         | - 0: Celsius (C)<br>- 1: Fahrenheit (F)<br>- 2: Relative Humidity (RH)                        |
| `05`           | High Alarm Enabled           | Whether the high alarm is enabled (`0: Disabled`, `1: Enabled`).                                    | Yes      | Yes       | No         | - 0: Disabled<br>- 1: Enabled                                                                 |
| `06`           | High Alarm Value             | The value at which the high alarm triggers.                                                        | Yes      | Yes       | No         | Value range: -50 to 572°F                                                                      |
| `07`           | High Alarm Units             | The unit of measurement for the high alarm (`0: C`, `1: F`, `2: RH`).                              | Yes      | Yes       | No         | - 0: Celsius (C)<br>- 1: Fahrenheit (F)<br>- 2: Relative Humidity (RH)                        |
| `08`           | High Alarm Muted             | Whether the high alarm is muted (`0: Not Muted`, `1: Muted`).                                       | Yes      | Yes       | Yes        | - 0: Not Muted<br>- 1: Muted                                                                  |
| `09`           | High Alarm Alarming          | Whether the high alarm is currently alarming (`0: Not Alarming`, `1: Alarming`).                   | Yes      | No        | Yes        | - 0: Not Alarming<br>- 1: Alarming                                                            |
| `0A`           | Low Alarm Enabled            | Whether the low alarm is enabled (`0: Disabled`, `1: Enabled`).                                     | Yes      | Yes       | No         | - 0: Disabled<br>- 1: Enabled                                                                 |
| `0B`           | Low Alarm Value              | The value at which the low alarm triggers.                                                         | Yes      | Yes       | No         | Value range: -50 to 572°F                                                                      |
| `0C`           | Low Alarm Units              | The unit of measurement for the low alarm (`0: C`, `1: F`, `2: RH`).                               | Yes      | Yes       | No         | - 0: Celsius (C)<br>- 1: Fahrenheit (F)<br>- 2: Relative Humidity (RH)                        |
| `0D`           | Low Alarm Muted              | Whether the low alarm is muted (`0: Not Muted`, `1: Muted`).                                        | Yes      | Yes       | Yes        | - 0: Not Muted<br>- 1: Muted                                                                  |
| `0E`           | Low Alarm Alarming           | Whether the low alarm is currently alarming (`0: Not Alarming`, `1: Alarming`).                    | Yes      | No        | Yes        | - 0: Not Alarming<br>- 1: Alarming                                                            |
| `0F`           | User Trim Value              | The user-defined trim value for the channel.                                                       | Yes      | Yes       | No         | Valid range: -4 to +4 (in tenths of a degree, e.g., -3.2 is sent as -32).                      |
| `10`           | User Trim Units              | The unit of measurement for the user trim (`0: C`, `1: F`).                                        | Yes      | Yes       | No         | - 0: Celsius (C)<br>- 1: Fahrenheit (F)                                                      |
| `11`           | System Trim Value            | The system-defined trim value for calibration purposes.                                            | Yes      | Yes       | No         | Used for ThermoWorks calibration only.                                                        |
| `12`           | System Trim Units            | The unit of measurement for the system trim (`0: C`, `1: F`).                                      | Yes      | Yes       | No         | - 0: Celsius (C)<br>- 1: Fahrenheit (F)                                                      |

This table includes detailed notes for each characteristic, providing additional context for their usage.


## Data Service Error Codes

| **Error Code** | **Error Description**         |
|----------------|-------------------------------|
| `FF01`         | Invalid Channel               |
| `FF02`         | Invalid Unit Type             |
| `FF03`         | Invalid Data Type             |
| `FF04`         | Value Out of Range            |
| `FF05`         | Write Not Allowed             |
| `FF06`         | Read Not Allowed              |
| `FF07`         | Invalid Format                |
| `FF08`         | Missing Required Field        |
| `FF09`         | Unsupported Operation         |
| `FF0A`         | Invalid Alarm Configuration   |
| `FF0B`         | Trim Value Out of Range       |
| `FF0C`         | Calibration Error             |
| `FF0D`         | Invalid Command               |
| `FF0E`         | Command Execution Failed      |


## Channel Types 
- 0: Pro-Series (Limited) External Probes on NODE
- 1: Humidity
- 2: Internal Chip Sensor
- 3: Humidity (AHT)
- 4: Humidity Temperature (AHT)
- 5: Pro-Series External Full Range
- 6: Humidity (SHTC)
- 7: Humidity Temperature (SHTC)
- 8: Pro-Series Internal


</details>


<details open>

<summary>RFX Probe Information</summary>

# RFX Probe Information

The RFX Probe is a wireless sensor that communicates with ThermoWorks IoT gateways to transmit telemetry data efficiently while maintaining optimal battery life.

## Probe Telemetry

The probe sends telemetry data over the MQTT topic:

```
/probes/{probeId}/events
```

The telemetry data sent by the probe is identical to that provided by the BLE Service, ensuring consistency across communication methods. For detailed telemetry format and structure, see the [telemetry Sample](#telemetry-sample) section.

## Probe Configuration Requirements

**Critical:** You must attach a probe to the gateway via the configuration settings. Refer to the RFX config document for the required configuration parameters. For detailed configuration format, see the [Device Config Sample](#device-config-sample) section and [RFX Config Example](#rfxdeviceconfig-object).

For information about the RFX communication protocol, see the [RFX Service](#rfx-service) section.

### Battery Life Impact

- **Without proper configuration:** If a probe is not attached to a gateway via config, the probe will:
  - Resend transmissions 3 times
  - Go to sleep after failed attempts
  - This drastically affects battery life due to unnecessary transmissions

- **With proper configuration:** When the probe is properly attached via config:
  - Gateway acknowledges probe transmissions
  - Probe receives acknowledgment and goes to sleep immediately
  - Battery life is optimized by reducing unnecessary transmissions

## Probe Transmission Workflows

### Normal Operation Flow

```mermaid
sequenceDiagram
    participant Probe
    participant Gateway
    
    Note over Probe: Wake up for reading
    Probe->>Gateway: Transmit telemetry data
    Gateway->>Probe: Send ACK
    Note over Probe: Sleep until next reading
```

**Process:**
1. Probe transmits telemetry data →
2. Gateway receives transmission
3. Gateway sends ACK ←
4. Probe receives ACK and sleeps

### Configuration Change Flow

```mermaid
sequenceDiagram
    participant Probe
    participant Gateway
    
    Note over Probe: Wake up for reading
    Probe->>Gateway: Transmit telemetry data
    Gateway->>Probe: Send Config Value
    Note over Probe: Process config change
    Probe->>Gateway: Send ACK
    Gateway->>Probe: Send ACK
    Note over Probe: Sleep with new config
```

**Process:**
1. Probe transmits telemetry data →
2. Gateway receives transmission
3. Gateway sends Config Value ←
4. Probe receives and processes config
5. Probe sends ACK →
6. Gateway sends ACK ←
7. Probe sleeps with updated configuration

</details>

<details open>

<summary>Object Definitions</summary>


# ThermoWorks IoT Communication Definitions

ThermoWorks IoT devices connected to the MQTT backend config / state / telemetry definitions.

## Device Config Object

The `DeviceConfig` object is sent to the device to configure its settings.

| Attribute                      | Type                                        | Description                                                              |
| ------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------ |
| `audit`                        | `boolean`                                   | Enables audit mode for the device.                                       |
| `channels`                     | `array`                                     | An array of [ChannelConfig objects](#channel-config-object).             |
| `label`                        | `string`                                    | A user-defined label for the device.                                     |
| `actionLabel`                  | `string`                                    | A secondary label for actions or events.                                 |
| `firmware`                     | `string`                                    | The target firmware version for the device.                              |
| `units`                        | `string`                                    | The measurement units used by the device (`"F"`, `"C"`, or `"H"`).         |
| `displayUnits`                 | `string`                                    | The units to display on the device screen (`"F"` or `"C"`).                |
| `fan`                          | `object`                                    | The [DeviceFan object](#device-fan-object) for billows support.          |
| `transmitIntervalInSeconds`    | `number`                                    | The interval in seconds at which the device transmits data.              |
| `recordingIntervalInSeconds`   | `number`                                    | The interval in seconds at which the device records a reading.                 |
| `rfxDeviceConfigs`             | `array`                                     | An array of [rfxDeviceConfig objects](#rfxdeviceconfig-object).          |

### Device Config Sample

```json
{
    "label": "My Device",
    "actionLabel": "For use with devices that have a 2nd label for action / events",
    "firmware" : "v2.45",
    "units" : "F",
    "displayUnits": "F",
    "transmitIntervalInSeconds" : 60,
    "recordingIntervalInSeconds" : 60,
    "channels" : [
        {
            "number": 1,
            "label": "Channel 1",
            "enabled": true,
            "displayUnits": "F",
            "alarmHigh": {
                "value": 200,
                "units": "F",
                "enabled": true,
                "muted": false
            },
            "alarmLow": {
                "value": 50,
                "units": "F",
                "enabled": true,
                "muted": false
            },
            "trim": {
                "value": 0,
                "units": "F"
            }
        },
        {
            "number" : 2,
            ...
        },
        {
            "number" : 3,
            ...
        },
        {
            "number" : 4,
            ...
        }
    ],
    "rfxDeviceConfigs": [
      {
        "id": "M123456789012",
        "temperatureDeltaTrigger": 5,
        "readInterval": 60,
        "heartbeatInterval": 3600
      }
    ],
    "fan": {
        "setTemp": 225
    }
}
```

## State Object

The `State` object is sent from the device and represents its current status.

| Attribute                      | Type     | Description                                                              |
| ------------------------------ | -------- | ------------------------------------------------------------------------ |
| `label`                        | `string` | The current user-defined label for the device.                           |
| `actionLabel`                  | `string` | The current secondary label.                                             |
| `firmware`                     | `string` | The current firmware version of the device.                              |
| `units`                        | `string` | The current measurement units used by the device.                        |
| `displayUnits`                 | `string` | The current units displayed on the device screen.                        |
| `transmitIntervalInSeconds`    | `number` | The current data transmission interval.                                  |
| `recordingIntervalInSeconds`   | `number` | The current reading recording interval.                                  |
| `wifi_strength`                | `number` | The Wi-Fi signal strength in percent.                                    |
| `battery`                      | `string` | The battery status.                                                      |
| `serial`                       | `string` | The serial number of the device.                                         |
| `connectedSSID`                | `string` | The SSID of the connected Wi-Fi network.                                 |
| `channels`                     | `array`  | An array of channel state objects.                                       |

### State Sample

```json
{
  "device": "signals",
  "type": "bbq",
  "label": "My Signals Label",
  "wifi_strength": 100,
  "firmware": "v2.45",
  "displayUnits": "F",
  "battery": "C",
  "serial": "11:22:33:44:55:66",
  "connectedSSID": "Sample Wifi Name",
  "transmitIntervalInSeconds": 60,
  "recordingIntervalInSeconds": 60,
  "channels": [
    {
        "number": 1,
        "reading": {
            "value": 75.2,
            "type": "T",
            "ts": 1582574880770
        },
        "highAlarm": { "alarming": false },
        "lowAlarm": { "alarming": false }
    }
  ]
}
```

## Telemetry

Telemetry readings are sent from the device based on the `transmitIntervalInSeconds`.

### Telemetry Sample

```json
{
    "channels":[
        {
            "number":"1",
            "ts": 1582574880770,
            "readings": [
                {
                    "value": 75.2,
                    "type": "T"
                }
            ]
        }
    ]
}
```

### Example of Channel 1 high alarm enabled

```json
{
  "channels": [
    {
        "number":"1",
        "ts": 1582574880770,
        "readings": [
            {
                "value": 75.2,
                "type": "T"
            },
            {
                "value": 45.1,
                "type": "H"
            }
        ]
    }
  ]
}
```

## Channel Config Object

The `ChannelConfig` object represents the configuration for a single sensor channel on the device.

| Attribute      | Type     | Description                                                                 |
| -------------- | -------- | ----------------------------------------------------------------------------- |
| `enabled`      | `boolean` | Whether the channel is enabled.                                             |
| `alarmHigh`    | `object` | The [High Alarm object](#alarm-object).                                     |
| `label`        | `string` | A user-defined label for the channel.                                       |
| `alarmLow`     | `object` | The [Low Alarm object](#alarm-object).                                      |
| `number`       | `number` | The channel number.                                                         |
| `units`        | `string` | The measurement units for this channel (`"F"`, `"C"`, or `"H"`).            |
| `displayUnits` | `string` | The units to display for this channel (`"F"` or `"C"`).                       |
| `trim`         | `object` | The user [Trim object](#trim-object).                                       |
| `systemTrim`   | `object` | The system [Trim object](#trim-object).                                     |


## Alarm Object

The `Alarm` object defines the high or low alarm settings for a channel.

| Attribute | Type      | Description                                      |
| --------- | --------- | ------------------------------------------------ |
| `value`   | `number`  | The alarm trigger value.                         |
| `units`   | `string`  | The units for the alarm value (`"F"`, `"C"`, `"H"`). |
| `enabled` | `boolean` | Whether the alarm is enabled.                    |
| `muted`   | `boolean` | Whether the alarm is currently muted.            |


## Trim Object

The `Trim` object defines the calibration trim for a channel.

| Attribute | Type     | Description                                      |
| --------- | -------- | ------------------------------------------------ |
| `units`   | `string` | The units for the trim value (`"F"`, `"C"`).       |
| `value`   | `number` | The trim offset value.                           |

## rfxDeviceConfig Object

The `rfxDeviceConfig` object configures an individual RFX probe.

| Attribute                 | Type     | Description                                                        |
| ------------------------- | -------- | ------------------------------------------------------------------ |
| `id`                      | `string` | The unique identifier of the RFX probe.                            |
| `temperatureDeltaTrigger` | `number` | The temperature change that triggers an immediate transmission.    |
| `readInterval`            | `number` | The interval in seconds at which the probe takes a reading.        |
| `heartbeatInterval`       | `number` | The interval in seconds for the probe to send a heartbeat signal.  |

## Device Fan Object

The `DeviceFan` object configures the settings for a Billows fan controller.

| Attribute               | Type     | Description                                                        |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| `setTemp`               | `number` | The target temperature for the fan to maintain.                    |


## RFX Objects

### RFX Data

The `RFX Data` object is sent from an RFX probe and contains telemetry, battery, or firmware information.

#### Telemetry

```json
{
  "gatewayId": "T10061CE92E24",
  "channels": [
    {
      "number": "1",
      "ts": 1582574880770,
      "readings": [
        {
          "value": 75.2,
          "type": "T"
        }
      ]
    }
  ]
}
```

#### Battery

```json
{
  "gatewayId": "T10061CE92E24",
  "battery": 10
}
```

#### Firmware

```json
{
  "gatewayId": "T10061CE92E24",
  "firmware ": "1.1.10"
}
```

</details>

# Error

## MQTT Connection Errors

| Error                                     | Code | Description                                                        |
| ----------------------------------------- | ---- | ------------------------------------------------------------------ |
| MQTT_CONNECTION_ACCEPTED                  | 0    | /_!< Connection accepted _/                                        |
| MQTT_CONNECTION_REFUSE_PROTOCOL           | 1    | /_!< MQTT connection refused reason: Wrong protocol _/             |
| MQTT_CONNECTION_REFUSE_ID_REJECTED        | 2    | /_!< MQTT connection refused reason: ID rejected _/                |
| MQTT_CONNECTION_REFUSE_SERVER_UNAVAILABLE | 3    | /_!< MQTT connection refused reason: Server unavailable _/         |
| MQTT_CONNECTION_REFUSE_BAD_USERNAME       | 4    | /_!< MQTT connection refused reason: Wrong user _/                 |
| MQTT_CONNECTION_REFUSE_NOT_AUTHORIZED     | 5    | /_!< MQTT connection refused reason: Wrong username or password _/ |

## MQTT TLS Errors

TLS_BASE_ERROR: 0x8000

| Error                                      | Code (HEX)            | Description |
| ------------------------------------------ | --------------------- | ----------- |
| ERR_TLS_CANNOT_RESOLVE_HOSTNAME            | TLS_BASE_ERROR + 0x01 |             |
| ERR_TLS_CANNOT_CREATE_SOCKET               | TLS_BASE_ERROR + 0x02 |             |
| ERR_TLS_UNSUPPORTED_PROTOCOL_FAMILY        | TLS_BASE_ERROR + 0x03 |             |
| ERR_TLS_FAILED_CONNECT_TO_HOST             | TLS_BASE_ERROR + 0x04 |             |
| ERR_TLS_SOCKET_SETOPT_FAILED               | TLS_BASE_ERROR + 0x05 |             |
| ERR_TLS_CONNECTION_TIMEOUT                 | TLS_BASE_ERROR + 0x06 |             |
| ERR_TLS_SE_FAILED                          | TLS_BASE_ERROR + 0x07 |             |
| ERR_TLS_TCP_CLOSED_FIN                     | TLS_BASE_ERROR + 0x08 |             |
| ERR_MBEDTLS_CERT_PARTLY_OK                 | TLS_BASE_ERROR + 0x10 |             |
| ERR_MBEDTLS_CTR_DRBG_SEED_FAILED           | TLS_BASE_ERROR + 0x11 |             |
| ERR_MBEDTLS_SSL_SET_HOSTNAME_FAILED        | TLS_BASE_ERROR + 0x12 |             |
| ERR_MBEDTLS_SSL_CONFIG_DEFAULTS_FAILED     | TLS_BASE_ERROR + 0x13 |             |
| ERR_MBEDTLS_SSL_CONF_ALPN_PROTOCOLS_FAILED | TLS_BASE_ERROR + 0x14 |             |
| ERR_MBEDTLS_X509_CRT_PARSE_FAILED          | TLS_BASE_ERROR + 0x15 |             |
| ERR_MBEDTLS_SSL_CONF_OWN_CERT_FAILED       | TLS_BASE_ERROR + 0x16 |             |
| ERR_MBEDTLS_SSL_SETUP_FAILED               | TLS_BASE_ERROR + 0x17 |             |
| ERR_MBEDTLS_SSL_WRITE_FAILED               | TLS_BASE_ERROR + 0x18 |             |
| ERR_MBEDTLS_PK_PARSE_KEY_FAILED            | TLS_BASE_ERROR + 0x19 |             |
| ERR_MBEDTLS_SSL_HANDSHAKE_FAILED           | TLS_BASE_ERROR + 0x1a |             |
| ERR_MBEDTLS_SSL_CONF_PSK_FAILED            | TLS_BASE_ERROR + 0x1b |             |
| ERR_MBEDTLS_SSL_TICKET_SETUP_FAILED        | TLS_BASE_ERROR + 0x1c |             |

## Wifi Errors

| Error                              | Code | Description |
| ---------------------------------- | ---- | ----------- |
| UNSPECIFIED                        | 1    |             |
| AUTH_EXPIRE                        | 2    |             |
| AUTH_LEAVE                         | 3    |             |
| ASSOC_EXPIRE                       | 4    |             |
| ASSOC_TOOMANY                      | 5    |             |
| NOT_AUTHED                         | 6    |             |
| NOT_ASSOCED                        | 7    |             |
| ASSOC_LEAVE                        | 8    |             |
| ASSOC_NOT_AUTHED                   | 9    |             |
| DISASSOC_PWRCAP_BAD                | 10   |             |
| DISASSOC_SUPCHAN_BAD               | 11   |             |
| BSS_TRANSITION_DISASSOC            | 12   |             |
| IE_INVALID                         | 13   |             |
| MIC_FAILURE                        | 14   |             |
| ERR_4WAY_HANDSHAKE_TIMEOUT         | 15   |             |
| GROUP_KEY_UPDATE_TIMEOUT           | 16   |             |
| IE_IN_4WAY_DIFFERS                 | 17   |             |
| GROUP_CIPHER_INVALID               | 18   |             |
| PAIRWISE_CIPHER_INVALID            | 19   |             |
| AKMP_INVALID                       | 20   |             |
| UNSUPP_RSN_IE_VERSION              | 21   |             |
| INVALID_RSN_IE_CAP                 | 22   |             |
| ERR_802_1X_AUTH_FAILED             | 23   |             |
| CIPHER_SUITE_REJECTED              | 24   |             |
| TDLS_PEER_UNREACHABLE              | 25   |             |
| TDLS_UNSPECIFIED                   | 26   |             |
| SSP_REQUESTED_DISASSOC             | 27   |             |
| NO_SSP_ROAMING_AGREEMENT           | 28   |             |
| BAD_CIPHER_OR_AKM                  | 29   |             |
| NOT_AUTHORIZED_THIS_LOCATION       | 30   |             |
| SERVICE_CHANGE_PERCLUDES_TS        | 31   |             |
| UNSPECIFIED_QOS                    | 32   |             |
| NOT_ENOUGH_BANDWIDTH               | 33   |             |
| MISSING_ACKS                       | 34   |             |
| EXCEEDED_TXOP                      | 35   |             |
| STA_LEAVING                        | 36   |             |
| END_BA                             | 37   |             |
| UNKNOWN_BA                         | 38   |             |
| TIMEOUT                            | 39   |             |
| PEER_INITIATED                     | 46   |             |
| AP_INITIATED                       | 47   |             |
| INVALID_FT_ACTION_FRAME_COUNT      | 48   |             |
| INVALID_PMKID                      | 49   |             |
| INVALID_MDE                        | 50   |             |
| INVALID_FTE                        | 51   |             |
| UNDEFINED_ERROR                    | 63   |             |
| TRANSMISSION_LINK_ESTABLISH_FAILED | 67   |             |
| ALTERATIVE_CHANNEL_OCCUPIED        | 68   |             |
| BEACON_TIMEOUT                     | 200  |             |
| NO_AP_FOUND                        | 201  |             |
| AUTH_FAIL                          | 202  |             |
| ASSOC_FAIL                         | 203  |             |
| HANDSHAKE_TIMEOUT                  | 204  |             |
| CONNECTION_FAIL                    | 205  |             |
| AP_TSF_RESET                       | 206  |             |
| ROAMING                            | 207  |             |
| ASSOC_COMEBACK_TIME_TOO_LONG       | 208  |             |
| SA_QUERY_TIMEOUT                   | 209  |             |
