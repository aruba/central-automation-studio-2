/*
Central Automation monitoring floorplan wrapper.
Owns page-specific selectors, notifications, client rendering, and event wiring.
Shared floor/image/AP/link rendering lives in floorplan.js.
*/

/*
MONITORING FLOORPLAN WRAPPER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: Fetch monitoring floor data, wire selectors/events, and delegate shared
		 AP/client/pathloss rendering to floorplan.js

VISUALIZATION MODES (9 total):
  • HEALTH: Color-coded by AP health status
  • CHANNELS: Color-coded by assigned channel + utilization sparkline
  • PATHLOSS: Draw links between APs with pathloss values
  • BANDWIDTH: Size nodes by throughput, color by usage
  • UTILIZATION: Color by client capacity utilization
  • CLIENTS: Draw associated clients at locations
  • COUNT: Size nodes by client count
  • NOISE: Color by noise floor levels
  • RADAR: Hit counter for radar detections in timeframe

GLOBAL STATE ARCHITECTURE:
  • vrfAPLocations: [{serial, x, y, ...}] - indexed AP positions for rendering
  • vrfRadiosBySerial: {serial -> [radios]} - O(1) radio lookup by AP serial
  • vrfRadiosByMac: {macAddress -> radio} - O(1) radio lookup by MAC address
  • vrfSelectedAPs: {serial -> true} - Selected APs for multi-select operations
  • vrfClientLocations: [{mac, x, y, ...}] - client positions for rendering
  • neighbourCache: {radioMac -> rfNeighbours} - cached RF neighbor data

CANVAS PARAMETRIZATION:
	• Shared drawing helpers accept optional canvases parameter
	• Fallback to getElementById('ap-*Canvas') if not provided
	• Enables independent canvas management for monitoring and AirMatch
	• Pattern: function drawX(params, canvases) { if (!canvases) { canvases = {...} } }

ARCHITECTURE DECISIONS:
	• Shared floorplan.js owns AP/client/pathloss drawing primitives and image sizing
	• Monitoring wrapper owns page-specific selectors, notifications, and callbacks
	• Only apColors[0-25] used for all colors (no hardcoded hex)
	• transformFloorplanWorldToCanvas handles world->canvas coordinate mapping
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

var allClients;
var osType = [];

var vrfBuildings = [];
var vrfFloors = [];
var vrfRogues = [];
var vrfRogueLocations = [];
var vrfAPs = [];
var vrfAPLocations = [];
var vrfRadios = [];
var vrfRadiosBySerial = {};  // INDEX: serial -> [radios]
var vrfRadiosByMac = {};     // INDEX: macAddress -> radio (1:1)
var vrfSelectedAPs = {};
var vrfPathloss = {};
var vrfFloorplan;
var vrfFloorDetails;
var vrfFloorId;
var vrfBuildingId;
var vrfSiteId;
var vrfChannels = {};
var vrfClients;
var vrfClientLocations = [];
var vrfOptimization = [];
var needChannelList = false;
var currentAP = null;
var currentClient = null;
var currentFloor;
var storedAP;
var found;

var rfNeighbours = {};
var noiseEventsRequestToken = 0;
var noiseEvents = [];
var radarNotification;

var neighbourMode = 1; // 0 = All, 1 = Per Radio

var apImage;
var apFrameImage;
var clientImage;
var noiseDataBuild = [];

var visualRFNotification;
var apNotification;
var clientNotification;

var visualizationSelector;
var bandSelector;
var channelSelector;
var secondarySelector;
var timeSelector;

var floorplanPromise; var floorplanResolve; var floorplanReject;
var neighbourPromise; var neighbourResolve;

function populateChoices() {
	var vElement = document.getElementById('visualizationselector');
	if (vElement) {
			visualizationSelector = new Choices(vElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var vChoices = [];
		vChoices.push({ value: 'HEALTH', label: 'AP Health' });
		vChoices.push({ value: 'CHANNELS', label: 'Channel' });
		vChoices.push({ value: 'BANDWIDTH', label: 'Channel Bandwidth' });
		vChoices.push({ value: 'UTILIZATION', label: 'Channel Utilization' });
		vChoices.push({ value: 'CLIENTS', label: 'Clients' });
		vChoices.push({ value: 'COUNT', label: 'Client Count' });
		vChoices.push({ value: 'NOISE', label: 'Noise Floor' });
		vChoices.push({ value: 'PATHLOSS', label: 'Pathloss Between APs' });
		vChoices.push({ value: 'RADAR', label: 'Radar Events' });
		visualizationSelector.clearChoices();
		visualizationSelector.setChoices(vChoices);
		visualizationSelector.setChoiceByValue('HEALTH');
		
		vElement.addEventListener('change', function() {
			changeFloorplanData(this.value);
		});
	}
	
	var bandElement = document.getElementById('bandselector');
	if (bandElement) {
			bandSelector = new Choices(bandElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var bandChoices = [];
		bandChoices.push({ value: '2', label: '2.4GHz' });
		bandChoices.push({ value: '5', label: '5GHz' });
		bandChoices.push({ value: '6', label: '6GHz' });
		bandSelector.clearChoices();
		bandSelector.setChoices(bandChoices);
		bandSelector.setChoiceByValue('5');
		
		bandElement.addEventListener('change', function() {
			changeBand(this.value);
		});
	}
	
	var channelElement = document.getElementById('channelselector');
	if (channelElement) {
			channelSelector = new Choices(channelElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var channelChoices = [];
		channelChoices.push({ value: 'ALL', label: 'All' });
		channelSelector.clearChoices();
		channelSelector.setChoices(channelChoices);
		channelSelector.setChoiceByValue('ALL');
		
		channelElement.addEventListener('change', function() {
			changeChannel(this.value);
		});
	}
	
	var secondaryElement = document.getElementById('secondaryselector');
	if (secondaryElement) {
			secondarySelector = new Choices(secondaryElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var secondaryChoices = [];
		secondaryChoices.push({ value: 'ALL', label: 'All' });
		secondaryChoices.push({ value: '', label: '─────────────────', disabled: true });
		secondaryChoices.push({ value: '80211', label: 'Wi-Fi Standard' });
		secondaryChoices.push({ value: '', label: '─────────────────', disabled: true });
		secondaryChoices.push({ value: '', text: 'Client OS', disabled: true });
		secondarySelector.clearChoices();
		secondarySelector.setChoices(secondaryChoices);
		
		secondaryElement.addEventListener('change', function() {
			changeSecondaryFilter();
		})
	}
	
	var timeElement = document.getElementById('timescalePicker');
	if (timeElement) {
			timeSelector = new Choices(timeElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: ""
		});
		var timeChoices = [];
		timeChoices.push({ value: "1440", label: '1 Day' });
		timeChoices.push({ value: "4320", label: '3 Days' });
		timeChoices.push({ value: "10080", label: '7 Days' });
		timeChoices.push({ value: "20160", label: '14 Days' });
		timeChoices.push({ value: "43200", label: '30 Days' });
		timeChoices.push({ value: "262800", label: '6 Months' });
		timeChoices.push({ value: "525600", label: '1 Year' });
		timeSelector.clearChoices();
		timeSelector.setChoices(timeChoices);
		timeSelector.setChoiceByValue('10080');

		timeElement.addEventListener('change', function() {
			if (visualizationSelector && visualizationSelector.getValue(true) === 'RADAR') {
				getNoiseEvents(0);
			}
		});
	}
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Callback functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadCurrentPageAP() {
	apImage = new Image();
	apImage.onload = function() {
		if (vrfAPs && vrfAPs.length > 0) {
			drawAPsOnFloorplanForMonitoring();
		}
	};
	apImage.src = '../assets/img/ap-icon.svg';
	
	apFrameImage = new Image();
	apFrameImage.src = '../assets/img/ap-frame.svg';

	clientImage = new Image();
	clientImage.onload = function() {
		if (visualizationSelector && visualizationSelector.getValue(true) === 'CLIENTS' && vrfClients && vrfClients.length > 0) {
			drawClientsOnFloorplan();
		}
	};
	clientImage.src = '../assets/img/client-icon.svg';
	
	loadDataFromDB('monitoring_radios');
	
	updateBandSelector();
	updateChannelSelector();
	
	getNoiseEvents();
	
}

function loadCurrentPageClient() {
	
	allClients = getWirelessClients();
	osType = [];
	allClients.forEach(function(client) {
		if (client.clientOperatingSystem && !osType.includes(client.clientOperatingSystem) && !client.clientOperatingSystem.includes('-')) osType.push(client.clientOperatingSystem);
	});
	
	osType.sort((a, b) => {
		const clientA = a.toUpperCase(); // ignore upper and lowercase
		const clientB = b.toUpperCase(); // ignore upper and lowercase
		// Sort on Site Name
		if (clientA < clientB) {
			return -1;
		}
		if (clientA > clientB) {
			return 1;
		}
		return 0;
	});
	

	if (visualizationSelector.getValue(true) === 'CHANNELS') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
	} else if (visualizationSelector.getValue(true) === 'HEALTH') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
	} else if (visualizationSelector.getValue(true) === 'UTILIZATION') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
	} else if (visualizationSelector.getValue(true) === 'COUNT') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
	} else if (visualizationSelector.getValue(true) === 'BANDWIDTH') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
	} else if (visualizationSelector.getValue(true) === 'NOISE') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
	} else if (visualizationSelector.getValue(true) === 'PATHLOSS') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
	} else if (visualizationSelector.getValue(true) === 'RADAR') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'block';
	} else if (visualizationSelector.getValue(true) === 'CLIENTS') {
		document.getElementById('secondaryFilter').style.display = 'block';
		
		var secondaryElement = document.getElementById('secondaryselector');
		if (secondaryElement) {
			var secondaryChoices = [];
			secondaryChoices.push({ value: 'ALL', label: 'All' });
			secondaryChoices.push({ value: '', label: '─────────────────', disabled: true });
			secondaryChoices.push({ value: '80211', label: 'Wi-Fi Standard' });
			secondaryChoices.push({ value: '', label: '─────────────────', disabled: true });
			secondaryChoices.push({ value: '', text: 'Client OS', disabled: true });
			osType.forEach(function(os) {
				secondaryChoices.push({ value: os, text: os });
			});
			secondarySelector.clearChoices();
			secondarySelector.setChoices(secondaryChoices);
			secondarySelector.setChoiceByValue('ALL');
		}
		
		document.getElementById('timeFilter').style.display = 'none';
	}
}

function loadSavedData(indexKey, data) {
	if (indexKey === 'monitoring_radios') {
		vrfRadios = JSON.parse(data);
		buildFloorplanRadioIndexes();
		if (vrfRadios && localStorage.getItem('monitoring_radios_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_radios_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getRadios(1).then(function() {
						vrfRadios = getRadioList();
				buildFloorplanRadioIndexes();
					});
				});
			}
		} else {
			authenticateWithCentral().then(function() {
				getRadios(1).then(function() {
					vrfRadios = getRadioList();
				buildFloorplanRadioIndexes();
				});
			});
		}
	}
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		Utility functions
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function getRadiosForAP(serial) {
	let apRadios = [];
	vrfRadios.forEach(function(radio) {
		if (radio.serialNumber === serial) apRadios.push(radio);
	});
	return apRadios;
}

function findAPForRadio(radiomac) {
	// Use radio index to find AP by MAC
	var radio = vrfRadiosByMac[radiomac];
	if (!radio) return null;
	
	// Find the monitoring AP that owns this radio
	var aps = getAPs();
	var foundAP = null;
	aps.some(function(ap) {
		if (ap.serialNumber === radio.serialNumber) {
			foundAP = ap;
			return true;
		}
	});
	return foundAP;
}

function buildFloorplanRadioIndexes() {
	vrfRadiosBySerial = {};
	vrfRadiosByMac = {};
	vrfRadios.forEach(function(radio) {
		var serial = radio.serialNumber;
		var mac = radio.macAddress;
		if (!vrfRadiosBySerial[serial]) vrfRadiosBySerial[serial] = [];
		vrfRadiosBySerial[serial].push(radio);
		vrfRadiosByMac[mac] = radio;
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	VisualAP functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function getFloorData() {
	vrfFloorId = getFloorSelector().getValue(true)
	vrfSiteId = getSiteSelector().getValue(true)
	getFloorplanData().then(function (){
		getFloorDataForId();
	});
}

function getFloorplanData() {
	if (visualRFNotification) visualRFNotification.update({ message: 'Attempting to obtain floorplan...', type: 'warning' });
	else visualRFNotification = showNotification('ca-floors', 'Getting Floor information...', 'bottom', 'center', 'info');

	return getSharedFloorplanDetails(vrfSiteId, vrfFloorId, {
		retryDelay: apiWaitDelay
	}).then(function(response) {
		vrfFloorDetails = response;
		return response;
	}).catch(function(error) {
		if (visualRFNotification) {
			visualRFNotification.update({ type: 'danger', message: 'Failed to retrieve Floorplan' });
			setTimeout(visualRFNotification.close, 2000);
		}
		return Promise.reject(error);
	});
}

function getFloorDataForId() {
	return getSharedFloorplanImage(vrfSiteId, vrfFloorId, {
		retryDelay: apiWaitDelay
	}).then(function(imageBase64) {
		vrfFloorplan = imageBase64;

		if (!vrfFloorplan || vrfFloorplan === '') {
			if (visualRFNotification) {
				visualRFNotification.update({ message: 'Attempting to obtain floorplan...', type: 'warning' });
				setTimeout(visualRFNotification.close, 2000);
			}
			return null;
		}

		if (visualRFNotification) {
			visualRFNotification.update({ message: 'Retrieved Floorplan', type: 'success' });
			setTimeout(visualRFNotification.close, 1000);
		}
		drawFloorplan();
		return vrfFloorplan;
	}).catch(function(error) {
		if (visualRFNotification) {
			visualRFNotification.update({ type: 'danger', message: 'Failed to retrieve Floorplan' });
			setTimeout(visualRFNotification.close, 2000);
		}
		return Promise.reject(error);
	});
}

function drawFloorplan() {
	// Draw floorplan
	resetCanvases();
	drawFloorplanImage(false);

	needChannelList = true;

	loadAPsForFloor(1);
}

function drawFloorplanImage(swap) {
	var colourEnabled = !!(document.getElementById('colourFloorplan') && document.getElementById('colourFloorplan').checked);
	drawSharedFloorplanImage(vrfFloorplan, {
		swap: swap,
		canvasIds: {
			floorplan: 'ap-floorplanCanvas',
			ap: 'ap-apCanvas',
			link: 'ap-linkCanvas',
			info: 'ap-infoCanvas',
			container: 'ap-visualPlan'
		},
		canvasStackId: 'canvasStack',
		renderRatio: window.devicePixelRatio || ratio || 1,
		useColour: colourEnabled,
		superViewPadding: 40
	});
}


function loadAPsForFloor(offset) {
	if (!offset) offset = 1;

	return loadSharedFloorplanAPs(vrfSiteId, vrfFloorId, {
		initialOffset: offset,
		pageLimit: 100,
		retryDelay: apiWaitDelay,
		onStart: function() {
			if (offset != 1) return;
			apNotification = showProgressNotification('ca-location-ap', 'Getting AP Locations...', 'bottom', 'center', 'info');
			vrfAPs = [];
			vrfChannels = { 2: [], 5: [], 6: [] };
			clearAPCanvas();
			clearLinkCanvas();
			clearInfoCanvas();
		},
		onProgress: function(allItems, response) {
			vrfAPs = allItems;
			if (apNotification && response && response.total) {
				var apProgress = (vrfAPs.length / response.total) * 100;
				apNotification.update({ progress: apProgress });
			}
		},
		onError: function() {
			if (apNotification) {
				apNotification.update({ type: 'danger', message: 'Failed to retrieve devices on floorplan' });
				setTimeout(apNotification.close, 2000);
			}
		},
		onComplete: function(allItems) {
			vrfAPs = allItems;
			if (apNotification) {
				apNotification.update({ message: 'Retrieved AP Locations', type: 'success' });
				setTimeout(apNotification.close, 1000);
			}
			changeFloorplanData();
		}
	});
}

/*─────────────────────────────────────────────────────────────────────────────
 RESOLVEAPSTYLE: Mode-Specific AP Styling (Refactored 2025)
 ────────────────────────────────────────────────────────────────────────────
 Previous: 280-line monolithic function with 3x band duplication
 Current: 3-line dispatcher + 6 mode-specific handlers
 ────────────────────────────────────────────────────────────────────────────*/
/*─────────────────────────────────────────────────────────────────────────────
 MODE-SPECIFIC AP STYLE HANDLERS
 Extracted from 280-line monolith, each handles one visualization mode
 ────────────────────────────────────────────────────────────────────────────*/




// New dispatcher for resolveAPStyle - replaces the old massive function

function drawFloorplanClientNode(ctx, x, y) {
	x = Math.round(x);
	y = Math.round(y);
	ctx.beginPath();
	ctx.shadowColor = 'white';
	ctx.shadowBlur = 14;
	ctx.arc(x, y, 7, 0, 2 * Math.PI, false);
	ctx.fill();
	ctx.drawImage(clientImage, x - 8, y - 8, 16, 16);
}


function loadClientsForFloor(offset) {
	if (offset == 0) {
		vrfClients = [];
		clearInfoCanvas();
		clientNotification = showProgressNotification('ca-pins', 'Getting client location information...', 'bottom', 'center', 'info');
	}
	let now = DateTime.now();
	let startAt = now.minus({ hours: 3 });
	
	//localStorage.getItem('base_url') + '/network-services/v1/wifi-clients-locations?filter=siteId%20eq%20%27'+vrfSiteId+'%27%20and%20floorId%20eq%20%27'+vrfFloorId+'%27%20and%20connected%20eq%20true&limit='+apiClientLocationLimit+'&offset='+offset+'&latest-location-per-client=1&start-at='+ encodeURIComponent(startAt.toUTC().toISO())
	
	//localStorage.getItem('base_url') + '/network-services/v1/wifi-clients-locations?filter=siteId%20eq%20%27'+vrfSiteId+'%27%20and%20floorId%20eq%20%27'+vrfFloorId+'%27&limit='+apiClientLocationLimit+'&offset='+offset+'&latest-location-per-client=1&start-at='+ encodeURIComponent(startAt.toUTC().toISO())
	
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-services/v1/wifi-clients-locations?filter=siteId%20eq%20%27'+vrfSiteId+'%27%20and%20floorId%20eq%20%27'+vrfFloorId+'%27%20and%20connected%20eq%20true&limit='+apiClientLocationLimit+'&offset='+offset+'&latest-location-per-client=1'/*&start-at='+ encodeURIComponent(startAt.toUTC().toISO())*/,
			access_token: localStorage.getItem('access_token'),
		}),
	};
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit or backend busy. Wait apiWaitDelay value and try again.
			setTimeout(loadClientsForFloor, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (clientNotification) {
				clientNotification.update({ type: 'danger', message: 'Failed to retrieve client locations on floorplan' });
				setTimeout(clientNotification.close, 2000);
			}
		} else {
			
			let response = safeParseCommandResponseBody(commandResults, 'client locations for floor ' + vrfFloorId);
			if (!response) {
				if (clientNotification) {
					clientNotification.update({ type: 'danger', message: 'Failed to parse client locations on floorplan' });
					setTimeout(clientNotification.close, 2000);
				}
				return;
			}
			vrfClients = vrfClients.concat(response['items']);
			
			offset += response.count;
			
			var clientProgress = (offset / response.total) * 100;
			clientNotification.update({ progress: clientProgress });
			
			if (offset < response.total) {
				if (visualizationSelector.getValue(true) === 'CLIENTS') loadClientsForFloor(offset);
				else setTimeout(clientNotification.close, 500);
			} else {
				//console.log(vrfClients.length)
				if (visualizationSelector.getValue(true) === 'CLIENTS') drawClientsOnFloorplan();
				if (clientNotification) {
					clientNotification.update({ message: 'Retrieved Client Locations', type: 'success' });
					setTimeout(clientNotification.close, 1000);
				}
			}
			
		}
	});
}

function renderFloorplanClient(vrfClient, canvas, ctx, renderOptions) {
	var thisClient = vrfClient.macAddress;
	// Only show if required (including unassociated or not)
	if (!(renderOptions.includeUnassociated || vrfClient.associated)) {
		return;
	}

	var foundClient = null;
	allClients.forEach(function(ac) {
		if (ac.macAddress === thisClient) {
			foundClient = ac;
		}
	});

	var showClient = true;
	var clientOS = false;
	var clientBand = false;
	var clientChannel = false;

	// Match criteria if device found in Central - otherwise only show if "All"
	if (renderOptions.visualization === 'CLIENTS') {
		if ((foundClient && foundClient.clientOperatingSystem == renderOptions.secondaryFilter) || renderOptions.secondaryFilter === 'ALL' || renderOptions.secondaryFilter === '80211') clientOS = true;
		if ((foundClient && foundClient.wirelessBand.includes(renderOptions.selectedBand)) || renderOptions.selectedBand === 'ALL') clientBand = true;
		if ((foundClient && foundClient.wirelessChannel && parseInt(foundClient.wirelessChannel.match(/\d+/)[0]) === renderOptions.selectedChannel) || renderOptions.selectedChannel === 'ALL') clientChannel = true;

		if (clientOS && clientBand && clientChannel) showClient = true;
		else showClient = false;
	}

	if (!showClient) {
		return;
	}

	var label1 = thisClient;
	var label2 = null;

	const clientCanvasPosition = transformFloorplanWorldToCanvas(
		parseFloat(vrfClient['cartesianCoordinates']['xInMetre']),
		parseFloat(vrfClient['cartesianCoordinates']['yInMetre']),
		canvas
	);
	if (!clientCanvasPosition) {
		return;
	}
	const clientX = Math.round(clientCanvasPosition.x);
	const clientY = Math.round(clientCanvasPosition.y);
	if (vrfClient.associated) ctx.fillStyle = apColors[4];
	else ctx.fillStyle = apColors[19];

	if (renderOptions.secondaryFilter === '80211') ctx.fillStyle = apColors[19];

	if (foundClient) {
		// its a client we have data for in monitoring
		label1 = foundClient['clientName'];
		if (foundClient['health'] <= 30) ctx.fillStyle = apColors[1];
		else if (foundClient['health'] <= 70) ctx.fillStyle = apColors[2];
		else if (foundClient['health'] <= 100) ctx.fillStyle = apColors[4];

		if (renderOptions.secondaryFilter === '80211') {
			if (foundClient.clientCapabilities.includes('802.11be')) ctx.fillStyle = colorArray[0];
			else if (foundClient.clientCapabilities.includes('802.11ax')) ctx.fillStyle = colorArray[1];
			else if (foundClient.clientCapabilities.includes('802.11ac')) ctx.fillStyle = colorArray[2];
			else if (foundClient.clientCapabilities.includes('802.11gn')) ctx.fillStyle = colorArray[3];
			else if (foundClient.clientCapabilities.includes('802.11an')) ctx.fillStyle = colorArray[4];
			else  ctx.fillStyle = colorArray[5];
		} else {
			if (foundClient.wirelessBand.includes('2.4')) ctx.fillStyle = colorArray[0];
			else if (foundClient.wirelessBand.includes('5')) ctx.fillStyle = colorArray[1];
			else if (foundClient.wirelessBand.includes('6')) ctx.fillStyle = colorArray[2];
		}
	}

	if (foundClient || !vrfClient.associated) {
		let drawX = clientX;
		let drawY = clientY;
		// check for overlap with AP location - move it a bit to be more visible
		vrfAPLocations.forEach(function(aploc) {
			if (Math.floor(aploc.x) == Math.floor(drawX) && Math.floor(aploc.y) == Math.floor(drawY)) {
				// exact same location as the AP - pick a random spot around the AP (but nice and close)
				var xAmount = Math.floor(Math.random() * 60) + 15;
				var xSymbol = Math.random() > 0.5 ? 1 : -1;
				var xChange = xAmount * xSymbol;
				drawX = drawX + xChange;

				var yAmount = Math.floor(Math.random() * 60) + 15;
				var ySymbol = Math.random() > 0.5 ? 1 : -1;
				var yChange = yAmount * ySymbol;
				drawY = drawY + yChange;
			}
		});
		vrfClientLocations.push({ x: drawX, y: drawY, mac: thisClient });

		// Draw client
		drawFloorplanClientNode(ctx, drawX, drawY);

		if (renderOptions.showLabels) {
			// Create Labels
			drawFloorplanEntityLabel(ctx, label1, label2, drawX, drawY);
		}
	}
}

function drawClientsOnFloorplan(canvases) {
	// Allow canvases to be passed in; fall back to getElementById if not provided
	if (!canvases) {
		canvases = {
			link: document.getElementById('ap-linkCanvas'),
			info: document.getElementById('ap-infoCanvas'),
			ap: document.getElementById('ap-apCanvas'),
			floorplan: document.getElementById('ap-floorplanCanvas')
		};
	}
	clearLinkCanvas();
	clearInfoCanvas();

	vrfClientLocations = [];
	// Draw Clients on floorplan
	var floorplanCanvas = canvases.floorplan;
	var canvas = canvases.info;
	var ctx = canvas.getContext('2d');
	var selectedBand = bandSelector.getValue(true);
	if (selectedBand == 2) selectedBand = 2.4;
	var selectedChannel = channelSelector.getValue(true);
	var secondaryFilter = secondarySelector.getValue(true);
	const renderOptions = {
		visualization: visualizationSelector.getValue(true),
		selectedBand: selectedBand,
		selectedChannel: selectedChannel,
		secondaryFilter: secondaryFilter,
		includeUnassociated: document.getElementById('unassociatedCheckbox').checked,
		showLabels: document.getElementById('clientLabelCheckbox').checked
	};

	vrfClients.forEach(function(vrfClient) {
		renderFloorplanClient(vrfClient, canvas, ctx, renderOptions);
	});
}

function drawApLinks(fromAP, canvases) {
	var band = bandSelector.getValue(true);
	if (band == 2) band = 2.4;
	if (visualizationSelector.getValue(true) === 'PATHLOSS') {
		drawPathLinks(fromAP['serial'], canvases, {
			selectedBand: band,
			findDeviceBySerial: findDeviceInMonitoring,
			drawPathlossLink: draw_PL
		});
	} else {
		var allClients = getWirelessClients();
		vrfClientLocations.forEach(function(currentClient) {
			var storedClient = null;
			allClients.forEach(function(ac) {
				if (ac['macAddress'] === currentClient.mac) storedClient = ac;
			});
			if (storedClient && storedClient.wirelessBand == band+ ' GHz') {
				if (storedClient['connectedDeviceSerial'] === fromAP['serial']) {
					drawClientRSSI(fromAP, currentClient, storedClient['snr'], false, canvases);
				}
			}
		});
	}
}

function drawClientLink(currentClient, canvases) {
	var band = bandSelector.getValue(true);
	if (band == 2) band = 2.4;
	var allClients = getWirelessClients();

	var storedClient = null;
	allClients.forEach(function(ac) {
		if (ac['macAddress'] === currentClient.mac) storedClient = ac;
	});
	var foundAP = null;
	vrfAPLocations.forEach(function(loc) {
		if (storedClient && loc['serial'] === storedClient['connectedDeviceSerial']) {
			drawClientRSSI(loc, currentClient, storedClient['snr'] ? storedClient['snr'] : 0, true, canvases);
		}
	});
}

function drawClientRSSI(fromAP, toClient, rssi, fromClient, canvases) {
	// Allow canvases to be passed in; fall back to getElementById if not provided
	if (!canvases) {
		canvases = {
			link: document.getElementById('ap-linkCanvas'),
			info: document.getElementById('ap-infoCanvas'),
			ap: document.getElementById('ap-apCanvas'),
			floorplan: document.getElementById('ap-floorplanCanvas')
		};
	}
	if (!canvases.link) return;
	var ctx = canvases.link.getContext('2d');
	// Figure out position of APs
	const x1 = fromAP.x;
	const y1 = fromAP.y;
	const x2 = toClient.x;
	const y2 = toClient.y;

	// choose pathloss colour
	var strokeColour = 'black';
	if (rssi > -65) strokeColour = apColors[4];
	else if (rssi > -72) strokeColour = apColors[2];
	else if (rssi < -80) strokeColour = apColors[1];

	if (rssi == 0) strokeColour = 'black';
	// Draw Line
	drawFloorplanLinkLine(ctx, x1, y1, x2, y2, strokeColour, 2);

	if (rssi != 0) {
		var label = rssi + ' dB';
		drawFloorplanMidpointLabel(ctx, label, x1, y1, x2, y2);
	}
}

function getMonitoringFloorplanDrawOptions(canvases) {
	return {
		onApSelected: function(selectedAP) {
			clearLinkCanvas();
			drawApLinks(selectedAP, canvases);
		},
		onClientSelected: function(selectedClient) {
			clearLinkCanvas();
			drawClientLink(selectedClient, canvases);
		},
		onClearSelection: function() {
			clearLinkCanvas();
			currentClient = null;
		},
		getRenderOptions: function() {
			return {
				needChannelList: needChannelList,
				visualization: visualizationSelector.getValue(true),
				selectedBand: bandSelector.getValue(true),
				selectedChannel: channelSelector.getValue(true)
			};
		},
		setNeedChannelList: function(value) {
			needChannelList = value;
		},
		radarEvents: noiseEvents,
		radarTimescaleMinutes: timeSelector ? parseInt(timeSelector.getValue(true), 10) : 10080,
		findAPByRadio: findAPForRadio,
		onChannelListUpdated: updateChannelSelector,
		apImage: apImage,
		apFrameImage: apFrameImage,
		findDeviceBySerial: findDeviceInMonitoring,
		getClientLocations: function() {
			return vrfClientLocations;
		},
		getCurrentAP: function() {
			return currentAP;
		},
		setCurrentAP: function(value) {
			currentAP = value;
		},
		getCurrentClient: function() {
			return currentClient;
		},
		setCurrentClient: function(value) {
			currentClient = value;
		}
	};
}

function drawAPsOnFloorplanForMonitoring(visualizationMode, canvases) {
	drawAPsOnFloorplan(visualizationMode, canvases, getMonitoringFloorplanDrawOptions(canvases));
}



/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Canvas Clearing functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function clearLinkCanvas() {
	var linkCanvas = document.getElementById('ap-linkCanvas');
	var pathlossCtx = linkCanvas.getContext('2d');
	pathlossCtx.clearRect(0, 0, linkCanvas.width, linkCanvas.height);
}

function clearAPCanvas() {
	var apCanvas = document.getElementById('ap-apCanvas');
	var apCtx = apCanvas.getContext('2d');
	apCtx.clearRect(0, 0, apCanvas.width, apCanvas.height);
}

function clearInfoCanvas() {
	var infoCanvas = document.getElementById('ap-infoCanvas');
	var infoCtx = infoCanvas.getContext('2d');
	infoCtx.clearRect(0, 0, infoCanvas.width, infoCanvas.height);
}

function clearFloorplanCanvas() {
	var floorplanCanvas = document.getElementById('ap-floorplanCanvas');
	var floorplanCtx = floorplanCanvas.getContext('2d');
	floorplanCtx.clearRect(0, 0, floorplanCanvas.width, floorplanCanvas.height);
}

function resetCanvases() {
	clearLinkCanvas();
	clearAPCanvas();
	clearInfoCanvas();
	clearFloorplanCanvas();
	var rfVisualPlanHeight = 0;
	document.getElementById('ap-visualPlan').setAttribute('style', 'height:' + rfVisualPlanHeight + 'px');
	document.getElementById('ap-visualPlan').style.height = rfVisualPlanHeight + 'px';
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	VRF UI functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function changeFloorplanData() {
	clearAPCanvas();
	clearLinkCanvas();
	clearInfoCanvas();

	updateBandSelector();
	updateChannelSelector();
	changeFooter();
	if (visualizationSelector.getValue(true) === 'CHANNELS') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('clientRefreshBtn').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
		drawAPsOnFloorplanForMonitoring();
	} else if (visualizationSelector.getValue(true) === 'HEALTH') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('clientRefreshBtn').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
		drawAPsOnFloorplanForMonitoring();
	} else if (visualizationSelector.getValue(true) === 'UTILIZATION') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('clientRefreshBtn').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
		drawAPsOnFloorplanForMonitoring();
	} else if (visualizationSelector.getValue(true) === 'COUNT') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('clientRefreshBtn').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
		drawAPsOnFloorplanForMonitoring();
	} else if (visualizationSelector.getValue(true) === 'BANDWIDTH') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('clientRefreshBtn').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
		drawAPsOnFloorplanForMonitoring();
	} else if (visualizationSelector.getValue(true) === 'PATHLOSS') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('clientRefreshBtn').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
		drawAPsOnFloorplanForMonitoring();
	} else if (visualizationSelector.getValue(true) === 'NOISE') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('clientRefreshBtn').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'none';
		drawAPsOnFloorplanForMonitoring();
	} else if (visualizationSelector.getValue(true) === 'RADAR') {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('clientRefreshBtn').style.display = 'none';
		document.getElementById('timeFilter').style.display = 'block';
		getNoiseEvents(0);
	} else if (visualizationSelector.getValue(true) === 'CLIENTS') {
		document.getElementById('secondaryFilter').style.display = 'block';
		document.getElementById('clientRefreshBtn').style.display = 'block';
		document.getElementById('timeFilter').style.display = 'none';
		
		var secondaryElement = document.getElementById('secondaryselector');
		if (secondaryElement) {
			var secondaryChoices = [];
			secondaryChoices.push({ value: 'ALL', label: 'All' });
			secondaryChoices.push({ value: '', label: '─────────────────', disabled: true });
			secondaryChoices.push({ value: '80211', label: 'Wi-Fi Standard' });
			secondaryChoices.push({ value: '', label: '─────────────────', disabled: true });
			secondaryChoices.push({ value: '', text: 'Client OS', disabled: true });
			osType.forEach(function(os) {
				secondaryChoices.push({ value: os, text: os });
			});
			secondarySelector.clearChoices();
			secondarySelector.setChoices(secondaryChoices);
			secondarySelector.setChoiceByValue('ALL');
		}

		drawAPsOnFloorplanForMonitoring();
		loadClientsForFloor(0);
	}
}

function changeSecondaryFilter() {
	clearAPCanvas();
	clearLinkCanvas();
	clearInfoCanvas();
	drawAPsOnFloorplanForMonitoring();
	if (visualizationSelector.getValue(true).includes('CLIENTS')) {
		document.getElementById('secondaryFilter').style.display = 'block';
		document.getElementById('clientRefreshBtn').style.display = 'block';
		changeFooter();
		updateBandSelector();
		drawClientsOnFloorplan();
	} else {
		document.getElementById('secondaryFilter').style.display = 'none';
		document.getElementById('clientRefreshBtn').style.display = 'none';
	}
}

function changeFooter() {
	if (visualizationSelector.getValue(true) === 'CHANNELS') {
		document.getElementById('floorplanFooter').innerHTML = '';
	} else if (visualizationSelector.getValue(true) === 'HEALTH') {
		document.getElementById('floorplanFooter').innerHTML = '';
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-danger"></i> Down\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-warning"></i> Poor\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-success"></i> Good ');
	} else if (visualizationSelector.getValue(true) === 'UTILIZATION') {
		document.getElementById('floorplanFooter').innerHTML = '';
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', 'Utilization:\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-success"></i> < 10%\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-info"></i> < 20%\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-primary"></i> < 30%\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-purple"></i> < 50%\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-warning"></i> < 80%\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-danger"></i> 80+%');
	} else if (visualizationSelector.getValue(true) === 'RADAR') {
		document.getElementById('floorplanFooter').innerHTML = '';
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', 'Number of Radar hits:\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-info"></i> 1\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-danger"></i> 2\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-warning"></i> 3\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-purple"></i> 4\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-success"></i> 5\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-primary"></i> 6+');
	} else if (visualizationSelector.getValue(true) === 'COUNT') {
		document.getElementById('floorplanFooter').innerHTML = '';
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-success"></i> <= 25\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-warning"></i> > 25\t');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-danger"></i> > 50 ');
	} else if (visualizationSelector.getValue(true) === 'CLIENTS') {
		if (secondarySelector.getValue(true) === '80211') {
			document.getElementById('floorplanFooter').innerHTML = '';
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[0]+'"></i> 11be\t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[1]+'"></i> 11ax\t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[2]+'"></i> 11ac\t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[3]+'"></i> 11gn\t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[4]+'"></i> 11an\t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[5]+'"></i> Unknown\t');
		} else {
			document.getElementById('floorplanFooter').innerHTML = '';
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[0]+'"></i> 2.4GHz \t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[1]+'"></i> 5GHz \t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[2]+'"></i> 6GHz ');
		}/* if (bandSelector.getValue(true) === 'ALL') {
			document.getElementById('floorplanFooter').innerHTML = '';
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[0]+'"></i> 2.4GHz \t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[1]+'"></i> 5GHz \t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle '+textColorArray[2]+'"></i> 6GHz ');
		} else {
			document.getElementById('floorplanFooter').innerHTML = '';
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-danger"></i> Poor\t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-warning"></i> Fair\t');
			document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-success"></i> Good ');
			//document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-muted"></i> Unassociated Client');
		}*/
	} else if (visualizationSelector.getValue(true) === 'BANDWIDTH') {
		document.getElementById('floorplanFooter').innerHTML = '';
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-info"></i> 20Mhz  ');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-danger"></i> 40Mhz  ');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-warning"></i> 80MHz  ');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-success"></i> 160MHz  ');
	} else if (visualizationSelector.getValue(true) === 'NOISE') {
		document.getElementById('floorplanFooter').innerHTML = '';
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-danger"></i> -70dB  ');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-warning"></i> -80dB  ');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-info"></i> -90dB  ');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-success"></i> -100dB or less');
	} else if (visualizationSelector.getValue(true) === 'PATHLOSS') {
		document.getElementById('floorplanFooter').innerHTML = '';
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-success"></i> < 70dB  ');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-warning"></i> < 90dB  ');
		document.getElementById('floorplanFooter').insertAdjacentHTML('beforeend', '<i class="fa-solid fa-circle text-danger"></i> < 110dB  ');
	}
}

function changeBand() {
	clearAPCanvas();
	clearLinkCanvas();
	clearInfoCanvas();
	currentAP = null;
	updateChannelSelector();
	drawAPsOnFloorplanForMonitoring();
	if (visualizationSelector.getValue(true).includes('CLIENT')) {
		drawClientsOnFloorplan();
	}
}

function changeChannel() {
	clearAPCanvas();
	clearLinkCanvas();
	clearInfoCanvas();

	currentAP = null;
	drawAPsOnFloorplanForMonitoring();
	if (visualizationSelector.getValue(true).includes('CLIENT')) {
		drawClientsOnFloorplan();
	}
}

function updateBandSelector() {
	var visualization = visualizationSelector.getValue(true);
	var bandChoices = [];
	
	if (visualization === 'HEALTH') {
		bandChoices.push({ value: 'ALL', label: 'All' });
	} else if (visualization === 'COUNT' || visualization === 'CLIENTS' || visualization === 'CHANNELS') {
		bandChoices.push({ value: 'ALL', label: 'All' });
		bandChoices.push({ value: '2', label: '2.4GHz' });
		bandChoices.push({ value: '5', label: '5GHz' });
		bandChoices.push({ value: '6', label: '6GHz' });
	} else {
		bandChoices.push({ value: '2', label: '2.4GHz' });
		bandChoices.push({ value: '5', label: '5GHz' });
		bandChoices.push({ value: '6', label: '6GHz' });
	}
	bandSelector.clearChoices();
	bandSelector.setChoices(bandChoices);
	if (visualization === 'HEALTH' || visualization === 'COUNT' || visualization === 'CLIENTS' || visualization === 'CHANNELS') {
		bandSelector.setChoiceByValue('ALL');
	} else {
		bandSelector.setChoiceByValue('5');
	}
}

function updateChannelSelector() {
	var band = bandSelector.getValue(true);
	var channels = vrfChannels[band];
	
	if (band === 'ALL') {
		channels = [];
		if (vrfChannels[2]) channels = channels.concat(vrfChannels[2]);
		if (vrfChannels[5]) channels = channels.concat(vrfChannels[5]);
		if (vrfChannels[6]) channels = channels.concat(vrfChannels[6]);
	}
	
	var channelChoices = [];
	channelChoices.push({ value: 'ALL', label: 'All' });
	channels.forEach(function(ch) {
		if (ch !== '') channelChoices.push({ value: parseInt(ch), label: ch });
	});
	channelSelector.clearChoices();
	channelSelector.setChoices(channelChoices);
	channelSelector.setChoiceByValue('ALL');
}

function updateSizes(width, height) {
	updateFloorplanCanvasSizes(width, height, initializeCanvases(), {
		canvasStackId: 'canvasStack',
		renderRatio: window.devicePixelRatio || ratio || 1
	});
}

function setCanvasStackSize(width, height) {
	setFloorplanCanvasStackSize(width, height, 'canvasStack');
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Noise Events functions
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function getNoiseEvents(offset, startAtISO, requestToken) {
	// Initialize on first call
	if (offset === undefined) {
		offset = 0;
	}

	if (requestToken === undefined) {
		requestToken = offset === 0 ? ++noiseEventsRequestToken : noiseEventsRequestToken;
	}
	if (requestToken !== noiseEventsRequestToken) return;

	if (startAtISO === undefined) {
		var minutesBack = 10080;
		if (timeSelector && timeSelector.getValue(true)) {
			minutesBack = parseInt(timeSelector.getValue(true), 10);
		}
		if (!Number.isFinite(minutesBack) || minutesBack <= 0) minutesBack = 10080;
		startAtISO = DateTime.now().minus({ minutes: minutesBack }).toUTC().toISO();
	}

	if (offset === 0) {
		noiseNotification = showPermanentNotification('ca-radar', 'Getting Radar & Noise Events...', 'bottom', 'center', 'info');
			
		noiseEvents = [];
		noiseDataBuild = [];
	}
	
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-services/v1/airmatch-priority-rf-events?start-at='+ encodeURIComponent(startAtISO) +'&limit='+airMatchLimit+'&offset='+offset,
		access_token: localStorage.getItem('access_token'),
	})
	.then(function(commandResults) {
		if (requestToken !== noiseEventsRequestToken) return;
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		//console.log(commandResults)
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(function() { getNoiseEvents(offset, startAtISO, requestToken); }, apiWaitDelay);
		} else if (result !== 200) {
			if (requestToken === noiseEventsRequestToken && noiseNotification) {
				noiseNotification.update({ type: 'danger', message: 'Failed retrieve AirMatch RF Events' });
				setTimeout(noiseNotification.close, 2000);
			}
		} else {
			let response = safeParseCommandResponseBody(commandResults, 'airmatch RF events');
			if (!response) {
				if (requestToken === noiseEventsRequestToken && noiseNotification) {
					noiseNotification.update({ type: 'danger', message: 'Failed to parse AirMatch RF Events' });
					setTimeout(noiseNotification.close, 2000);
				}
				return;
			}
			
			if (response) noiseEvents = noiseEvents.concat(response);
			if (response.length == airMatchLimit) {
				//var getProgress = ((optimizationRadios.length) / response.count) * 100;
				//noiseNotification.update({ progress: getProgress });
				getNoiseEvents(offset + airMatchLimit, startAtISO, requestToken);
			} else {				
				if (requestToken === noiseEventsRequestToken && noiseNotification) {
					noiseNotification.update({ message: 'Retrieved AirMatch RF Events', type: 'success' });
					setTimeout(noiseNotification.close, 500);
				}
				if (requestToken === noiseEventsRequestToken && visualizationSelector && visualizationSelector.getValue(true) === 'RADAR') {
					drawAPsOnFloorplanForMonitoring('RADAR');
				}
			}
		}
	});
}

