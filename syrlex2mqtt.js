#!/usr/bin/env node
"use strict";

const mqtt = require("async-mqtt");

// mqtt configuration
const brokerUrl = process.env.MQTT_SERVER;
const username = process.env.MQTT_USER;
const password = process.env.MQTT_PASSWORD;

function formatTimestamp(timestamp) {
  const date = new Date(timestamp*1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const offsetHours = String(Math.floor(offset / 60)).padStart(2, "0");
  const offsetMinutes = String(offset % 60).padStart(2, "0");
  const offsetStr = `${offset >= 0 ? "+" : "-"}${offsetHours}:${offsetMinutes}`;
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
}

function generateAvailability(identifier) {
  var availability_topic = 'syr/' + identifier + '/availability';
  var availability = [
    {topic: 'syr/bridge/state'},
    {topic: availability_topic}
  ];
  return availability;
}

function generateMQTTDevice(model, snr, sw_version, url) {
  var mqttDevice = {
    identifiers: [ snr ],
    manufacturer: "Syr",
    name: model,
    model: model,
    sw_version: sw_version,
    configuration_url: url,

    identifier() {
      return (this.model + this.identifiers[0]).toLowerCase();
    }
  };

  return mqttDevice;
}

async function sendMQTTSensorDiscoveryMessage(client, mqttDevice, sensorname, humanreadable_name, device_class, unit_of_measurement, icon = 'mdi:water') {
  var topic = 'homeassistant/sensor/syr_watersoftening/' + mqttDevice.identifier() + '_' + sensorname + '/config';
  var payload = {
        name: humanreadable_name,
        device_class: device_class,
        unit_of_measurement: unit_of_measurement,
        icon: icon,
        state_topic: 'syr/' + mqttDevice.identifier() + '/state',
        availability: generateAvailability(mqttDevice.identifier()),
        value_template: '{{ value_json.'+ sensorname +'}}',
        unique_id: mqttDevice.identifier() + "_" + sensorname,
        device: mqttDevice
      }
  await client.publish(topic, JSON.stringify(payload))
}

async function sendMQTTBinarySensorDiscoveryMessage(client, mqttDevice, sensorname, humanreadable_name, device_class) {
  var topic = 'homeassistant/binary_sensor/syr_watersoftening/' + mqttDevice.identifier() + '_' + sensorname + '/config';
  var payload = {
        name: humanreadable_name,
        device_class: device_class,
        state_topic: 'syr/' + mqttDevice.identifier() + '/state',
        availability: generateAvailability(mqttDevice.identifier()),
        value_template: '{{ value_json.'+ sensorname +'}}',
        unique_id: mqttDevice.identifier() + "_" + sensorname,
        device: mqttDevice
      }
  await client.publish(topic, JSON.stringify(payload))
}


async function sendMQTTNumberDiscoveryMessage(client, mqttDevice, numbername, humanreadable_name, device_class, unit_of_measurement, minimum, maximum, icon = 'mdi:water') {
  var topic = 'homeassistant/number/syr_watersoftening/' + mqttDevice.identifier() + '_' + numbername + '/config';
  var payload = {
        name: humanreadable_name,
        device_class: device_class,
        unit_of_measurement: unit_of_measurement,
        icon: icon,
        state_topic: 'syr/' + mqttDevice.identifier() + '/state',
        command_topic: 'syr/' + mqttDevice.identifier() + '/set_' + numbername,
        availability: generateAvailability(mqttDevice.identifier()),
        value_template: '{{ value_json.'+ numbername +'}}',
        unique_id: mqttDevice.identifier() + "_" + numbername,
        min: minimum,
        max: maximum,
        device: mqttDevice
      }
  await client.publish(topic, JSON.stringify(payload))
}


async function sendMQTTButtonDiscoveryMessage(client, mqttDevice, buttonname, humanreadable_name) {
  var topic = 'homeassistant/button/syr_watersoftening/' + mqttDevice.identifier() + '_' + buttonname + '/config';
  var payload = {
        name: humanreadable_name,
        command_topic: 'syr/' + mqttDevice.identifier() + '/set_' + buttonname,
        availability: generateAvailability(mqttDevice.identifier()),
        unique_id: mqttDevice.identifier() + "_" + buttonname,
        device: mqttDevice
      }
  await client.publish(topic, JSON.stringify(payload))
}


async function sendMQTTAvailabilityMessage(client, mqttDevice) {
  var availability_topic = 'syr/' + mqttDevice.identifier() + '/availability';

  await client.publish(availability_topic, 'online', {retain: true})
}

async function sendMQTTStateMessage(client, model, snr, payload) {
  var identifier = (model + snr).toLowerCase();
  var topic = 'syr/' + identifier + '/state'

  await client.publish(topic, JSON.stringify(payload))
}

const client = mqtt.connect(brokerUrl,
                            {
                              username: username,
                              password: password,
                              will: {
                                topic: 'syr/bridge/state',
                                payload: 'offline',
                                retain: true
                              }
                            });

const model = 'LEXplus10S';
const snr = '123456789';
const sw_version = '1.9';
const url = 'http://192.168.178.1/';

const handleConnect = async () => {
  console.log('Connecting');

  client.subscribe('syr/#')
  client.subscribe('homeassistant/status')

  var mqttDevice = generateMQTTDevice(model, snr, sw_version, url);

  await sendMQTTSensorDiscoveryMessage(client, mqttDevice, 'current_water_flow', 'Current Water Flow', null, 'l/min', 'mdi:water');
  await sendMQTTSensorDiscoveryMessage(client, mqttDevice, 'salt_remaining', 'Salt Remaining', null, 'weeks', 'mdi:cup');
  await sendMQTTSensorDiscoveryMessage(client, mqttDevice, 'remaining_resin_capacity', 'Remaining Resin Capacity', null, '%', 'mdi:water-percent');
  await sendMQTTSensorDiscoveryMessage(client, mqttDevice, 'remaining_water_capacity', 'Remaining Water Capacity', 'water', 'L', 'mdi:water');
  await sendMQTTSensorDiscoveryMessage(client, mqttDevice, 'total_water_consumption', 'Total Water Consumption', 'water', 'L', 'mdi:water');
  await sendMQTTSensorDiscoveryMessage(client, mqttDevice, 'number_of_regenerations', 'Number of Regenerations', null, null, 'mdi:counter');
  await sendMQTTSensorDiscoveryMessage(client, mqttDevice, 'last_regeneration', 'Last Regeneration', 'timestamp', null, 'mdi:clock-time-four-outline');
  await sendMQTTSensorDiscoveryMessage(client, mqttDevice, 'status_message', 'Status Message', null, null, 'mdi:message-text');
  await sendMQTTBinarySensorDiscoveryMessage(client, mqttDevice, 'regeneration_running', 'Regeneration Running', 'running');

  await sendMQTTButtonDiscoveryMessage(client, mqttDevice, 'start_regeneration', 'Start Regeneration');
  
  await sendMQTTNumberDiscoveryMessage(client, mqttDevice, 'salt_in_stock', 'Salt in Stock', 'weight', 'kg', 0, 25, 'mdi:cup');
  await sendMQTTNumberDiscoveryMessage(client, mqttDevice, 'regeneration_interval', 'Regeneration Interval', null, 'days', 1, 10, 'mdi:calendar-clock');

  await sendMQTTAvailabilityMessage(client, mqttDevice);
  console.log('Connected');
}

const updateState = async () => {
  
  console.log('Publishing state message');
  var payload = {
    current_water_flow: 3,
    salt_remaining: 3,
    remaining_resin_capacity: 35,
    remaining_water_capacity: 1108,
    total_water_consumption: 578350,
    number_of_regenerations: 427,
    last_regeneration: formatTimestamp(1694501839),
    status_message: 'Bitte Salz nachfüllen',
    salt_in_stock: 11,
    regeneration_interval: 6,
    regeneration_running: 'OFF'
  }
  sendMQTTStateMessage(client, model, snr, payload);
  console.log('Published');
}

const messageReceived = async (topic, message) => {
  
  console.log('Received message for topic ' + topic + ':\n' + message);

  const regex = /^syr\/([\w-]*)\/set_([\w-]*)$/;
  const match = topic.match(regex);

  if(match == null || match.length != 3)
  {
    return;
  }

  var device_identifier = match[1];
  var entity_name = match[2];

  if(entity_name == 'salt_in_stock') {
    console.log('Setting salt_in_stock = ' + message + ' for device ' + device_identifier);
  } else if(entity_name == 'regeneration_interval') {
    console.log('Setting regeneration_interval = ' + message + ' for device ' + device_identifier);
  } else if(entity_name == 'start_regeneration') {
    console.log('Starting regeneration = ' + message + ' for device ' + device_identifier);
  }
  
}

client.on('connect', handleConnect);

client.on('message', messageReceived);

// Simulation of letter box being opened
setTimeout(async () => await updateState(), 10_000);



