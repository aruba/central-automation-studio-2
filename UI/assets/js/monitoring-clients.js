  	/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var countRandomMAC = 0;
var randomMACClients = [];
var actualMACClients = [];
var count11k = 0;
var kClients = [];
var noKClients = [];
var count11v = 0;
var vClients = [];
var noVClients = [];
var count11r = 0;
var rClients = [];
var noRClients = [];
var count11be = 0;
var beClients = [];
var count6E = 0;
var sixEClients = [];
var count11ax = 0;
var axClients = [];
var count11ac = 0;
var acClients = [];
var count11gn = 0;
var gnClients = [];
var count11an = 0;
var anClients = [];
var count2Ghz = 0;
var count5Ghz = 0;
var count6Ghz = 0;
var clients2 = [];
var clients5 = [];
var clients6 = [];
var macClients5 = [];
var dot1XClients5 = [];
var noAuthClients5 = [];
var macClients2 = [];
var dot1XClients2 = [];
var noAuthClients2 = [];
var macClients6 = [];
var dot1XClients6 = [];
var noAuthClients6 = [];
var macClientsW = [];
var dot1XClientsW = [];
var noAuthClientsW = [];
var osType = {};
var maxOSLimit = 7;
var wirelessClients;
var wiredClients;
var wpa3Clients = [];
var wpa3XClients = [];
var wpa2Clients = [];
var wpa2XClients = [];
var oweClients = [];
var openClients = [];
var otherClients = [];
var ccm128 = [];
var gcm256 = [];
var openSec = [];
var rc4 = [];
var tkip = [];

var mloMode = {};

var overlayClients = {};

var clientState = {};

const maxVLANLimit = 20;
var clientVLAN = {};

var snr0 = [];
var snr5 = [];
var snr10 = [];
var snr15 = [];
var snr20 = [];
var snr25 = [];
var snr30 = [];
var snr35 = [];
var snr40 = [];
var snr45 = [];
var snr50 = [];
var snr55 = [];
var snr60 = [];
var snrArray = [];

var selectedWLAN;
var selectedSite;
var selectedChannelBand = '5 GHz';
var selectedModelGroup = 'clientOperatingSystem';

var modelGroupCounts = {
	clientOperatingSystem: {},
	clientManufacturer: {},
	clientCategory: {},
	clientVendor: {},
	clientFunction: {},
	clientTags: {}
};

var modelGroupLabels = {
	clientOperatingSystem: 'Client Operating System',
	clientManufacturer: 'Client Manufacturer',
	clientCategory: 'Client Category',
	clientVendor: 'Client Vendor',
	clientFunction: 'Client Function',
	clientTags: 'Client Tags'
};

var channelCountsByBand = {
	'2.4 GHz': {},
	'5 GHz': {},
	'6 GHz': {}
};

var channelClientsByBand = {
	'2.4 GHz': {},
	'5 GHz': {},
	'6 GHz': {}
};

var timescale;

const maxModelLimit = 10;
var modelChart;
var snrChart;
var channelChart;
var protocolChart;
var securityChart;
var cipherChart;
var bandChart;
var tunnelChart;
var kChart;
var vChart;
var rChart;
var randomChart;
var mloChart;
var authChart;
var vlanChart;

var clientNotification;

var inProgress = false;


function loadCurrentPageClient() {
	if (!inProgress) {
		inProgress = true;
		console.log('Processing Client statistics')
		clientNotification = showNotification('ca-laptop-1', 'Processing Client statistics...', 'bottom', 'center', 'info');
	}
	loadDataFromDB('monitoring_wlan_details');
	processStats();
}

function loadSavedData(indexKey, data) {
	if (indexKey === 'monitoring_wlan_details') {
		wlanDetails = JSON.parse(data);
		apList = getAPs();
		updateWLANSelectorChoices();
		if (wlanDetails && localStorage.getItem('monitoring_wlan_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_wlan_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getWLANs(1);
				});
			} else {
				processStats();
			}
		} else {
			authenticateWithCentral().then(function() {
				getWLANs(1);
			});
		}
	}
}

function wlanChange() {
	processStats();
}

function channelBandChanged() {
	let bandSelector = document.getElementById('channel-band-selector');
	if (bandSelector && bandSelector.value) selectedChannelBand = bandSelector.value;
	loadChannelChart();
}

function modelGroupChanged() {
	let groupSelector = document.getElementById('model-group-selector');
	if (groupSelector && groupSelector.value) selectedModelGroup = groupSelector.value;
	loadModelChart();
}

function getClientModelValues(client, fieldName) {
	if (!client) return [];

	let rawValue = client[fieldName];
	if (rawValue === null || rawValue === undefined) return [];

	let values = [];
	if (Array.isArray(rawValue)) {
		rawValue.forEach(function(value) {
			if (value === null || value === undefined) return;
			if (typeof value === 'object') {
				if (value.name) values.push(value.name);
				else if (value.tag) values.push(value.tag);
				else values.push(JSON.stringify(value));
			} else {
				values.push(value);
			}
		});
	} else if (fieldName === 'clientTags' && typeof rawValue === 'string' && rawValue.indexOf(',') !== -1) {
		values = rawValue.split(',');
	} else {
		values = [rawValue];
	}

	return values
		.map(function(value) {
			return String(value).trim();
		})
		.filter(function(value) {
			return value !== '' && value !== '-' && value !== 'null' && value !== 'undefined';
		});
}

function addClientToModelGroups(client) {
	Object.keys(modelGroupCounts).forEach(function(fieldName) {
		let values = getClientModelValues(client, fieldName);
		values.forEach(function(value) {
			if (!modelGroupCounts[fieldName][value]) modelGroupCounts[fieldName][value] = [];
			modelGroupCounts[fieldName][value].push(client);
		});
	});

	// Preserve osType mapping for existing references.
	if (modelGroupCounts.clientOperatingSystem) osType = modelGroupCounts.clientOperatingSystem;
}


function processStats() {
	
	var updateDate = new Date(parseInt(localStorage.getItem('monitoring_client_update')));
	if (document.getElementById('lastUpdateDate')) document.getElementById('lastUpdateDate').innerHTML = moment(updateDate).format("Do MMMM YYYY, h:mm:ss a");
	
	let wlanChoices = getWLANSelector();
	let selectedWLAN = wlanChoices.getValue(true);
	
	let siteChoices = getSiteSelector();
	let selectedSite = siteChoices.getValue(true);
	
	countRandomMAC = 0;
	randomMACClients = [];
	actualMACClients = [];
	count11k = 0;
	kClients = [];
	noKClients = [];
	count11v = 0;
	vClients = [];
	noVClients = [];
	count11r = 0;
	rClients = [];
	noRClients = [];
	count11be = 0;
	beClients = [];
	count6E = 0;
	sixEClients = [];
	count11ax = 0;
	axClients = [];
	count11ac = 0;
	acClients = [];
	count11gn = 0;
	gnClients = [];
	count11an = 0;
	anClients = [];
	count2Ghz = 0;
	count5Ghz = 0;
	count6Ghz = 0;
	clients2 = [];
	clients5 = [];
	clients6 = [];
	macClients5 = [];
	dot1XClients5 = [];
	noAuthClients5 = [];
	macClients2 = [];
	dot1XClients2 = [];
	noAuthClients2 = [];
	macClients6 = [];
	dot1XClients6 = [];
	noAuthClients6 = [];
	macClientsW = [];
	dot1XClientsW = [];
	noAuthClientsW = [];
	wpa3Clients = [];
	wpa3XClients = [];
	wpa2Clients = [];
	wpa2XClients = [];
	oweClients = [];
	openClients = [];
	otherClients = [];
	snr0 = [];
	snr5 = [];
	snr10 = [];
	snr15 = [];
	snr20 = [];
	snr25 = [];
	snr30 = [];
	snr35 = [];
	snr40 = [];
	snr45 = [];
	snr50 = [];
	snr55 = [];
	snr60 = [];
	
	clientVLAN = {};
	
	ccm128 = [];
	gcm256 = [];
	openSec = [];
	rc4 = [];
	tkip = [];
	
	mloMode = {};
	overlayClients = {};
	channelCountsByBand = {
		'2.4 GHz': {},
		'5 GHz': {},
		'6 GHz': {}
	};
	channelClientsByBand = {
		'2.4 GHz': {},
		'5 GHz': {},
		'6 GHz': {}
	};
	
	if (document.getElementById('up_count')) document.getElementById('up_count').innerHTML = '-';
	if (document.getElementById('down_count')) document.getElementById('down_count').innerHTML = '-';
	
	clientState = {};
	
	osType = {};
	modelGroupCounts = {
		clientOperatingSystem: {},
		clientManufacturer: {},
		clientCategory: {},
		clientVendor: {},
		clientFunction: {},
		clientTags: {}
	};
	wirelessClients = getWirelessClients();
	wiredClients = getWiredClients();
	let allClients = getClients();
	
	allClients.forEach(function(client) {
		//console.log(client)
		if (client.clientConnectionType === 'Wireless' && (client.wlanName === selectedWLAN || selectedWLAN === '_all' || selectedWLAN === '_wlan') && (client.siteId === selectedSite || selectedSite === '_all'))  {
			//console.log(client)
			if (client['macAddress'].charAt(1) === '2' || client['macAddress'].charAt(1) === '6' || client['macAddress'].charAt(1) === 'a' || client['macAddress'].charAt(1) === 'e') {
				countRandomMAC++;
				randomMACClients.push(client);
			} else {
				actualMACClients.push(client);
			}
			
			if (client.wirelessBand) {
				if (client.wirelessBand.includes('6')) {
					clients6.push(client);
					if (client.authenticationType.includes('MAC')) macClients6.push(client);
					else if (client.authenticationType.includes('dot1x')) dot1XClients6.push(client);
					else if (client.authenticationType.includes('')) noAuthClients6.push(client);
				} else if (client.wirelessBand.includes('5')) {
					clients5.push(client);
					if (client.authenticationType.includes('MAC')) macClients5.push(client);
					if (client.authenticationType.includes('dot1x')) dot1XClients5.push(client);
					if (client.authenticationType.includes('')) noAuthClients5.push(client);
				} else if (client.wirelessBand.includes('2.4')) {
					clients2.push(client);
					if (client.authenticationType.includes('MAC')) macClients2.push(client);
					if (client.authenticationType.includes('dot1x')) dot1XClients2.push(client);
					if (client.authenticationType.includes('')) noAuthClients2.push(client);
				}
			}

			if (client.wirelessBand && client.wirelessChannel !== null && client.wirelessChannel !== undefined) {
				let bandLabel = client.wirelessBand;
				let channelNumber = parseInt(client.wirelessChannel, 10);
				if (channelCountsByBand[bandLabel] && !Number.isNaN(channelNumber)) {
					if (!channelCountsByBand[bandLabel][channelNumber]) channelCountsByBand[bandLabel][channelNumber] = 0;
					channelCountsByBand[bandLabel][channelNumber]++;

					if (!channelClientsByBand[bandLabel][channelNumber]) channelClientsByBand[bandLabel][channelNumber] = [];
					channelClientsByBand[bandLabel][channelNumber].push(client);
				}
			}
			
			// 11k/v/r
			if (client.clientCapabilities && client.clientCapabilities.includes('802.11k')) {
				count11k++;
				kClients.push(client);
			} else {
				noKClients.push(client);
			}
			if (client.clientCapabilities && client.clientCapabilities.includes('802.11v')) {
				count11v++;
				vClients.push(client);
			} else {
				noVClients.push(client);
			}
			if (client.clientCapabilities && client.clientCapabilities.includes('802.11r')) {
				count11r++;
				rClients.push(client);
			} else {
				noRClients.push(client);
			}
			
			// Standard Split
			if (client.clientCapabilities && client.clientCapabilities.includes('802.11be')) {
				count11be++;
				beClients.push(client);
			}
			if (client.clientCapabilities && client.clientCapabilities.includes('802.11ax') && client.band == 6) {
				count6E++;
				sixEClients.push(client);
			}
			if (client.clientCapabilities && client.clientCapabilities.includes('802.11ax') && client.band != 6) {
				count11ax++;
				axClients.push(client);
			}
			if (client.clientCapabilities && client.clientCapabilities.includes('802.11ac')) {
				count11ac++;
				acClients.push(client);
			}
			if (client.clientCapabilities && client.clientCapabilities.includes('802.11gn')) {
				count11gn++;
				gnClients.push(client);
			}
			if (client.clientCapabilities && client.clientCapabilities.includes('802.11an')) {
				count11an++;
				anClients.push(client);
			}
			
			if (client.status === 'Connected') {
				if (client.keyManagement) {
					if (client.keyManagement.includes('WPA3-SAE') || client.keyManagement.includes('WPA3_SAE')) wpa3Clients.push(client);
					else if (client.keyManagement.includes('WPA3-ENTERPRISE') || client.keyManagement.includes('WPA3_ENTERPRISE')) wpa3XClients.push(client);
					else if (client.keyManagement.includes('WPA2-ENTERPRISE') || client.keyManagement.includes('WPA2_ENTERPRISE')) wpa2XClients.push(client);
					else if (client.keyManagement.includes('WPA2-PSK') || client.keyManagement.includes('WPA2_PSK')) wpa2Clients.push(client);
					else if (client.keyManagement.includes('OWE')) oweClients.push(client);
					else if (client.keyManagement.includes('OPEN')) openClients.push(client);
					else otherClients.push(client);
				}
				
				if (client.wirelessSecurity) {
					if (client.wirelessSecurity.includes('CCM-128') || client.wirelessSecurity.includes('AES')) ccm128.push(client);
					else if (client.wirelessSecurity.includes('GCM-256')) gcm256.push(client);
					else if (client.wirelessSecurity.includes('Open')) openSec.push(client);
					else if (client.wirelessSecurity.includes('RC4')) rc4.push(client);
					else if (client.wirelessSecurity.includes('TKIP')) tkip.push(client);
				}
				
				// SNR
				if (client.snr >= 0 && client.snr < 4) snr0.push(client);
				else if (client.snr >= 5 && client.snr < 9) snr5.push(client);
				else if (client.snr >= 10 && client.snr < 14) snr10.push(client);
				else if (client.snr >= 15 && client.snr < 19) snr15.push(client);
				else if (client.snr >= 20 && client.snr < 24) snr20.push(client);
				else if (client.snr >= 25 && client.snr < 29) snr25.push(client);
				else if (client.snr >= 30 && client.snr < 34) snr30.push(client);
				else if (client.snr >= 35 && client.snr < 39) snr35.push(client);
				else if (client.snr >= 40 && client.snr < 44) snr40.push(client);
				else if (client.snr >= 45 && client.snr < 49) snr45.push(client);
				else if (client.snr >= 50 && client.snr < 54) snr50.push(client);
				else if (client.snr >= 55 && client.snr < 59) snr55.push(client);
				else if (client.snr >= 60) snr60.push(client);
			}
			
			addClientToModelGroups(client);
			
			if (clientState[client.status]) {
				var clientArray = clientState[client.status];
				clientArray.push(client);
				clientState[client.status] = clientArray;
			} else {
				var clientArray = [];
				clientArray.push(client);
				clientState[client.status] = clientArray;
			}
			
			// Client VLAN
			if (clientVLAN[client.vlanId]) {
				var clientArray = clientVLAN[client.vlanId];
				clientArray.push(client);
				clientVLAN[client.vlanId] = clientArray;
			} else {
				var clientArray = [];
				clientArray.push(client);
				clientVLAN[client.vlanId] = clientArray;
			}
			
			// Tunnel
			//if (client.tunnelType !== 'None') {
				if (overlayClients[client.tunnelType]) {
					var clientArray = overlayClients[client.tunnelType];
					clientArray.push(client);
					overlayClients[client.tunnelType] = clientArray;
				} else {
					var clientArray = [];
					clientArray.push(client);
					overlayClients[client.tunnelType] = clientArray;
				}
			//}
			
			// MLO Mode
			let mloOpMode = client.mloOperMode;
			if (!mloOpMode) mloOpMode = 'Not Supported'
			if (mloOpMode === 'MLO Disabled') mloOpMode = 'Non-MLO SSID'
			if (mloMode[mloOpMode]) {
				var clientArray = mloMode[mloOpMode];
				clientArray.push(client);
				mloMode[mloOpMode] = clientArray;
			} else {
				var clientArray = [];
				clientArray.push(client);
				mloMode[mloOpMode] = clientArray;
			}
			
			if (document.getElementById('up_count') && clientState['Connected']) document.getElementById('up_count').innerHTML = '' + clientState['Connected'].length + '';
			if (document.getElementById('down_count') && clientState['Failed']) document.getElementById('down_count').innerHTML = '' + clientState['Failed'].length + '';
		}
		
		if (client.clientConnectionType === 'Wired' && (selectedWLAN === '_all' || selectedWLAN === '_wired') && (client.siteId === selectedSite || selectedSite === '_all'))  {
			//console.log(client)
			if (client['macAddress'].charAt(1) === '2' || client['macAddress'].charAt(1) === '6' || client['macAddress'].charAt(1) === 'a' || client['macAddress'].charAt(1) === 'e') {
				countRandomMAC++;
				randomMACClients.push(client);
			} else {
				actualMACClients.push(client);
			}
			
			// Auth
			if (client.authenticationType.includes('MAC')) macClientsW.push(client);
			else if (client.authenticationType.includes('dot1x')) dot1XClientsW.push(client);
			else if (client.authenticationType.includes('')) noAuthClientsW.push(client);
			
			addClientToModelGroups(client);
			
			if (clientState[client.status]) {
				var clientArray = clientState[client.status];
				clientArray.push(client);
				clientState[client.status] = clientArray;
			} else {
				var clientArray = [];
				clientArray.push(client);
				clientState[client.status] = clientArray;
			}
			
			// Client VLAN
			if (clientVLAN[client.vlanId]) {
				var clientArray = clientVLAN[client.vlanId];
				clientArray.push(client);
				clientVLAN[client.vlanId] = clientArray;
			} else {
				var clientArray = [];
				clientArray.push(client);
				clientVLAN[client.vlanId] = clientArray;
			}
			
			//if (client.tunnelType !== 'None') {
				if (overlayClients[client.tunnelType]) {
					var clientArray = overlayClients[client.tunnelType];
					clientArray.push(client);
					overlayClients[client.tunnelType] = clientArray;
				} else {
					var clientArray = [];
					clientArray.push(client);
					overlayClients[client.tunnelType] = clientArray;
				}
			//}
			
			if (document.getElementById('up_count') && clientState['Connected']) document.getElementById('up_count').innerHTML = '' + clientState['Connected'].length + '';
			if (document.getElementById('down_count') && clientState['Failed']) document.getElementById('down_count').innerHTML = '' + clientState['Failed'].length + '';
		}
	});
	
	loadModelChart();
	loadSNRChart();
	loadChannelChart();
	
	loadProtocolChart();
	loadSecurityChart();
	loadCipherChart();
	loadBandChart();
	loadTunnelChart();
	
	load11kChart();
	load11vChart();
	load11rChart();
	
	loadAuthChart();
	loadRandomMacChart();
	loadMLOChart();
	
	loadVLANChart();
	
	clientNotification.close();
	inProgress = false;
}

function filterClients(status) {
	var table = $('#client-table').DataTable();
	table.search(status).draw();
	
	var myModal = new bootstrap.Modal(document.getElementById('ClientModal'))
	myModal.show();
}

function loadSelectedClients(selectedClients) {
	$('#selected-client-table')
		.DataTable().clear();
		
	var table = $('#selected-client-table').DataTable();
	
	selectedClients.forEach(function(client) {
		//console.log(client)
		let type = '<i class="fa-solid fa-wifi text-dark"></i>';
		let connection = client['wirelessChannel']
		if (client['clientConnectionType'] === 'Wired') {
			type = '<i class="fa-solid fa-ethernet text-dark"></i>';
			connection = client['port']
		}
		
		let status = '<i class="fa-solid fa-link-slash text-danger"></i>';
		if (client['status'] == 'Connected') {
			status = '<i class="fa-solid fa-link text-success"></i>';
		}
		
		/*if (client['health'] == 'Good') {
			status += ' <i class="fa-solid fa-circle text-success"></i>';
		} else if (client['health'] == 'Poor') {
			status += ' <i class="fa-solid fa-diamond text-danger"></i>';
		} else if (client['health'] == 'Fair') {
			status += ' <i class="fa-solid fa-triangle text-warning"></i>';
		} else if  (client['health'] == 'Unknown') {
			status += ' <i class="fa-solid fa-circle-question text-dark"></i>';
		}*/
		
		var ip_address = client['ipv4'];
		if (!ip_address) ip_address = client['ipv6'];
		if (!ip_address) ip_address = '';
		if (client['ipv4'] && client['ipv6']) ip_address = client['ipv4'] + '<br>' + client['ipv6']
		
	// Make Name as a link to Central
		var name = encodeURI(client['name']);
		var apiURL = localStorage.getItem('base_url');
		var centralBaseURL = centralURLs[apiURL];
		var centralURL = centralBaseURL + '/gravity/monitoring/clients/dashboard?contextType=clients&selectedView=dashboard&siteId=' + client['siteId'] + '&selectedPlanet=sun&clientId=' + client['macAddress'] + '&networkType='+ client['clientConnectionType'] + '&timelineFrame=Hour';
		
		// Get Site	var deviceSite = getSiteForId(device['siteId'])
		var deviceSite = getSiteForId(client['siteId'])
		var deviceSiteURL = '';
		if (deviceSite) {
			deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + client['siteId'] + '&selectedPlanet=sun&timelineFrame=Hour';
		}
		
		// Get Connected Device info
		var connectedDevice = findDeviceInMonitoring(client['connectedDeviceSerial']);
		var connectedDeviceURL = '';
		if (connectedDevice) {
			connectedDeviceURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + client['siteId'] + '&selectedPlanet=sun&deviceId=' + connectedDevice['serialNumber'];
		}
		
		// Add row to table
		table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(client['clientName']) + '</strong></a>', '<span title="' + escapeHtml(client['clientConnectionType']) + '"></span>' + type, '<span title="' + escapeHtml(client['status']) + '"></span>' + status, escapeHtml(client['macAddress']), escapeHtml(ip_address), escapeHtml(client['vlanId']), connectedDevice ? '<a href="' + connectedDeviceURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(client['connectedTo']) + '</strong></a>' : '', escapeHtml(connection), escapeHtml(client['clientOperatingSystem']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '']);
	
		initializeTooltips(table.table().body());
	});
	$('#selected-client-table')
		.DataTable()
		.rows()
		.draw();
		
	var myModal = new bootstrap.Modal(document.getElementById('SelectedClientModal'))
	myModal.show();
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Radio Status Bar
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadRadioStatus() {
	
	if (document.getElementById('mem_count')) {
		document.getElementById('mem_count').innerHTML = highMemoryCount;
		if (highMemoryCount == 0) {
			document.getElementById('mem_icon').classList.add('bg-gradient-success');
			document.getElementById('mem_icon').classList.remove('bg-gradient-warning');
			document.getElementById('mem_icon').classList.remove('bg-gradient-danger');
			document.getElementById('mem_icon').classList.remove('bg-gradient-info');
		} else {
			document.getElementById('mem_icon').classList.remove('bg-gradient-success');
			document.getElementById('mem_icon').classList.add('bg-gradient-warning');
			document.getElementById('mem_icon').classList.remove('bg-gradient-danger');
			document.getElementById('mem_icon').classList.remove('bg-gradient-info');
		}
	}
	
	if (document.getElementById('cpu_count')) {
		document.getElementById('cpu_count').innerHTML = highCPUCount;
		if (highCPUCount == 0) {
			document.getElementById('cpu_icon').classList.add('bg-gradient-success');
			document.getElementById('cpu_icon').classList.remove('bg-gradient-warning');
			document.getElementById('cpu_icon').classList.remove('bg-gradient-danger');
			document.getElementById('cpu_icon').classList.remove('bg-gradient-info');
		} else {
			document.getElementById('cpu_icon').classList.remove('bg-gradient-success');
			document.getElementById('cpu_icon').classList.add('bg-gradient-warning');
			document.getElementById('cpu_icon').classList.remove('bg-gradient-danger');
			document.getElementById('cpu_icon').classList.remove('bg-gradient-info');
		}
	}
	
	if (document.getElementById('two_count')) {
		document.getElementById('two_count').innerHTML = down2;
	
		if (down2 > 0) {
			document.getElementById('two_icon').classList.remove('bg-gradient-success');
			document.getElementById('two_icon').classList.remove('bg-gradient-warning');
			document.getElementById('two_icon').classList.add('bg-gradient-danger');
			document.getElementById('two_icon').classList.remove('bg-gradient-info');
		} else {
			document.getElementById('two_icon').classList.remove('bg-gradient-success');
			document.getElementById('two_icon').classList.remove('bg-gradient-warning');
			document.getElementById('two_icon').classList.remove('bg-gradient-danger');
			document.getElementById('two_icon').classList.add('bg-gradient-info');
		}
	}
	
	if (document.getElementById('five_count')) {
		document.getElementById('five_count').innerHTML = down5;
	
		if (down5 > 0) {
			document.getElementById('five_icon').classList.remove('bg-gradient-success');
			document.getElementById('five_icon').classList.remove('bg-gradient-warning');
			document.getElementById('five_icon').classList.add('bg-gradient-danger');
			document.getElementById('five_icon').classList.remove('bg-gradient-info');
		} else {
			document.getElementById('five_icon').classList.remove('bg-gradient-success');
			document.getElementById('five_icon').classList.remove('bg-gradient-warning');
			document.getElementById('five_icon').classList.remove('bg-gradient-danger');
			document.getElementById('five_icon').classList.add('bg-gradient-info');
		}
	}
	
	if (document.getElementById('six_count')) {
		document.getElementById('six_count').innerHTML = down6;
	
		if (down6 > 0) {
			document.getElementById('six_icon').classList.remove('bg-gradient-success');
			document.getElementById('six_icon').classList.remove('bg-gradient-warning');
			document.getElementById('six_icon').classList.add('bg-gradient-danger');
			document.getElementById('six_icon').classList.remove('bg-gradient-info');
		} else {
			document.getElementById('six_icon').classList.remove('bg-gradient-success');
			document.getElementById('six_icon').classList.remove('bg-gradient-warning');
			document.getElementById('six_icon').classList.remove('bg-gradient-danger');
			document.getElementById('six_icon').classList.add('bg-gradient-info');
		}
	}
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Client OS Bar Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadModelChart() {
	let groupSelector = document.getElementById('model-group-selector');
	if (groupSelector) selectedModelGroup = groupSelector.value || 'clientOperatingSystem';

	let selectedGroupData = modelGroupCounts[selectedModelGroup] || {};
	
	// Create selected client group array
	var items = Object.keys(selectedGroupData).map(function(key) {
		return [key, selectedGroupData[key]];
	});
	
	// Sort the array based on the second element
	items.sort(function(first, second) {
		return second[1].length - first[1].length;
	});
	
	// Create a new array with only the first "x" items
	var topModels = items.slice(0, maxModelLimit);
	
	// Build labels and series
	var modelLabels = [];
	var modelSeries = [];
	topModels.forEach(function(item) {
		if (item[0] !== '') {
			modelLabels.push(item[0]);
			modelSeries.push(item[1].length);
		}
	});
	
	var canvasModel = document.getElementById("model-chart");
	if (!canvasModel) return;
	var ctxModel = canvasModel.getContext("2d");
	if (modelChart) modelChart.destroy();

	let modelCardCategory = document.getElementById('model-card-category');
	if (modelCardCategory) modelCardCategory.innerHTML = 'Top ' + maxModelLimit + ' by Count';
	
	modelChart = new Chart(ctxModel, {
	  type: "bar",
	  data: {
		labels: modelLabels,
		datasets: [{
		  weight: 5,
		  borderWidth: 0,
		  borderRadius: 4,
		  backgroundColor: '#8392AB',
		  data: modelSeries,
		  fill: false,
		  maxBarThickness: 35
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: true,
			  drawOnChartArea: true,
			  drawTicks: false,
			  borderDash: [5, 5]
			},
			ticks: {
			  display: true,
			  padding: 10,
			  color: '#9ca2b7',
			  stepSize: 1
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: true,
			  drawTicks: true,
			},
			ticks: {
			  display: true,
			  color: '#9ca2b7',
			  padding: 10
			}
		  },
		},
	  },
	});
	
	// Make sure to attach `onclick` to the canvas, **not** the chart instance
	canvasModel.onclick = (evt) => {
	  const res = modelChart.getElementsAtEventForMode(
		evt,
		'nearest',
		{ intersect: true },
		true
	  );
	  // If didn't click on a bar, `res` will be an empty array
	  if (res.length === 0) {
		return;
	  }
	  
	  var selectedClients = [];
	  var val = modelChart.data.labels[res[0].index];
	  selectedClients = selectedGroupData[val] || [];
	  let selectedGroupLabel = modelGroupLabels[selectedModelGroup] || 'Client Type';
	  document.getElementById('selected-title').innerHTML = selectedGroupLabel + ': ' + val + ' (' + selectedClients.length + ' Clients)';
	  
	  loadSelectedClients(selectedClients);
	};
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Client SNR Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadSNRChart() {
	
	snrArray = [];
	snrArray.push(snr0);
	snrArray.push(snr5);
	snrArray.push(snr10);
	snrArray.push(snr15);
	snrArray.push(snr20);
	snrArray.push(snr25);
	snrArray.push(snr30);
	snrArray.push(snr35);
	snrArray.push(snr40);
	snrArray.push(snr45);
	snrArray.push(snr50);
	snrArray.push(snr55);
	snrArray.push(snr60);

	// Build labels and series
	let chartLabels = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60+'];
	let chartSeries = [snr0.length,snr5.length,snr10.length,snr15.length,snr20.length,snr25.length,snr30.length,snr35.length,snr40.length,snr45.length,snr50.length,snr55.length,snr60.length];
	
	let canvasModel = document.getElementById("snr-chart");
	let ctxModel = canvasModel.getContext("2d");
	if (snrChart) snrChart.destroy();
	
	snrChart = new Chart(ctxModel, {
	  type: "bar",
	  data: {
		labels: chartLabels,
		datasets: [{
		  weight: 5,
		  borderWidth: 0,
		  borderRadius: 4,
		  backgroundColor: '#8392AB',
		  data: chartSeries,
		  fill: false,
		  maxBarThickness: 35
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: true,
			  drawOnChartArea: true,
			  drawTicks: false,
			  borderDash: [5, 5]
			},
			ticks: {
			  display: true,
			  padding: 10,
			  color: '#9ca2b7',
			  stepSize: 1
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: true,
			  drawTicks: true,
			},
			ticks: {
			  display: true,
			  color: '#9ca2b7',
			  padding: 10
			}
		  },
		},
	  },
	});
	
	// Make sure to attach `onclick` to the canvas, **not** the chart instance
	canvasModel.onclick = (evt) => {
	  const res = snrChart.getElementsAtEventForMode(
		evt,
		'nearest',
		{ intersect: true },
		true
	  );
	  // If didn't click on a bar, `res` will be an empty array
	  if (res.length === 0) {
		return;
	  }
	  
	  var selectedClients = [];
	  var val = snrChart.data.labels[res[0].index];
	  selectedClients = snrArray[res[0].index];
	  document.getElementById('selected-title').innerHTML = val + ' Clients';
	  
	  loadSelectedClients(selectedClients);
	};
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Client Channel Distribution Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadChannelChart() {
	let bandSelector = document.getElementById('channel-band-selector');
	if (bandSelector) selectedChannelBand = bandSelector.value || '5 GHz';

	let selectedBandChannels = channelCountsByBand[selectedChannelBand] || {};
	let chartChannels = [];
	if (selectedChannelBand === '2.4 GHz') {
		for (let channel = 1; channel <= 14; channel++) {
			chartChannels.push(channel);
		}
	} else if (selectedChannelBand === '5 GHz') {
		chartChannels = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165, 169, 173, 177];
	} else if (selectedChannelBand === '6 GHz') {
		for (let channel = 1; channel <= 233; channel += 4) {
			chartChannels.push(channel);
		}
	}

	let chartLabels = chartChannels.map(function(channel) {
		return channel.toString();
	});
	let chartSeries = chartChannels.map(function(channel) {
		let value = selectedBandChannels[channel];
		if (!value) return 0;
		return value;
	});

	let canvasModel = document.getElementById('channel-chart');
	if (!canvasModel) return;

	let ctxModel = canvasModel.getContext('2d');
	if (channelChart) channelChart.destroy();

	channelChart = new Chart(ctxModel, {
	  type: 'bar',
	  data: {
		labels: chartLabels,
		datasets: [{
		  weight: 5,
		  borderWidth: 0,
		  borderRadius: 4,
		  backgroundColor: '#8392AB',
		  data: chartSeries,
		  fill: false,
		  maxBarThickness: 35
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: true,
			  drawOnChartArea: true,
			  drawTicks: false,
			  borderDash: [5, 5]
			},
			ticks: {
			  display: true,
			  padding: 10,
			  color: '#9ca2b7',
			  stepSize: 1
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: true,
			  drawTicks: true,
			},
			ticks: {
			  display: true,
			  color: '#9ca2b7',
			  padding: 10
			}
		  },
		},
	  },
	});

	canvasModel.onclick = (evt) => {
	  const res = channelChart.getElementsAtEventForMode(
		evt,
		'nearest',
		{ intersect: true },
		true
	  );
	  if (res.length === 0) return;

	  let channelLabel = channelChart.data.labels[res[0].index];
	  let selectedClients = [];
	  if (channelClientsByBand[selectedChannelBand] && channelClientsByBand[selectedChannelBand][channelLabel]) {
		selectedClients = channelClientsByBand[selectedChannelBand][channelLabel];
	  }

	  document.getElementById('selected-title').innerHTML = 'Clients on channel ' + channelLabel + ' (' + selectedChannelBand + ')';
	  loadSelectedClients(selectedClients);
	};
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Protocol Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadProtocolChart() {
	
	
	// Build labels and series
	let chartLabels = ['Wi-Fi 7','Wi-Fi 6E','Wi-Fi 6','Wi-Fi 5','Wi-Fi 4 (5GHz)','Wi-Fi 4 (2.4GHz)'];
	let chartSeries = [beClients.length, sixEClients.length,axClients.length,acClients.length,anClients.length,gnClients.length];
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	let chartColor = [];
	document.getElementById('protocol-footer').innerHTML = '';
	for (i = 0; i < chartLabels.length; i++) {
		chartColor.push(colorArray[i]);
		if (chartTotal == 0) document.getElementById('protocol-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('protocol-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById("protocol-chart").getContext("2d");
	if (protocolChart) protocolChart.destroy();
	
	protocolChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Radio Band",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = protocolChart.data.labels[dataIndex]
			let selectedClients = [];
			if (val === 'Wi-Fi 7') selectedClients = beClients;
			else if (val === 'Wi-Fi 6E') selectedClients = sixEClients;
			else if (val === 'Wi-Fi 6') selectedClients = axClients;
			else if (val === 'Wi-Fi 5') selectedClients = acClients;
			else if (val === 'Wi-Fi 4 (5GHz)') selectedClients = anClients;
			else selectedClients = gnClients;
			document.getElementById('selected-title').innerHTML = 'Clients connected using ' + val;
			
			loadSelectedClients(selectedClients);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Band Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadBandChart() {
	
	
	// Build labels and series
	let chartLabels = ['6GHz','5GHz','2.4GHz'];
	let chartSeries = [clients6.length, clients5.length,clients2.length];
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	let chartColor = [];
	document.getElementById('band-footer').innerHTML = '';
	for (i = 0; i < chartLabels.length; i++) {
		chartColor.push(colorArray[i]);
		if (chartTotal == 0) document.getElementById('band-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('band-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById("band-chart").getContext("2d");
	if (bandChart) bandChart.destroy();
	
	bandChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Radio Band",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = bandChart.data.labels[dataIndex]
			let selectedClients = [];
			if (val === '6GHz') selectedClients = clients6;
			else if (val === '5GHz') selectedClients = clients5;
			else selectedClients = clients2;
			document.getElementById('selected-title').innerHTML = 'Clients connected to ' + val;
			
			loadSelectedClients(selectedClients);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Random MAC Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadRandomMacChart() {
	
	
	// Build labels and series
	let chartLabels = ['Randomized MAC','Actual MAC'];
	let chartSeries = [randomMACClients.length, actualMACClients.length];
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	let chartColor = [];
	document.getElementById('random-footer').innerHTML = '';
	for (i = 0; i < chartLabels.length; i++) {
		chartColor.push(colorArray[i]);
		if (chartTotal == 0) document.getElementById('random-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('random-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById("random-chart").getContext("2d");
	if (randomChart) randomChart.destroy();
	
	randomChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Random MAC",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = randomChart.data.labels[dataIndex]
			let selectedClients = [];
			if (val === 'Randomized MAC') selectedClients = randomMACClients;	
			else selectedClients = actualMACClients;
			document.getElementById('selected-title').innerHTML = 'Clients connected using ' + val;
			
			loadSelectedClients(selectedClients);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Security Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadSecurityChart() {
	
	// Build labels and series
	let chartLabels = ['WPA3-Personal','WPA3-Enterprise','WPA2-Personal','WPA2-Enterprise','Enhanced Open', 'Open','Others'];
	let chartSeries = [wpa3Clients.length, wpa3XClients.length,wpa2Clients.length,wpa2XClients.length,oweClients.length,openClients.length,otherClients.length];
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	let chartColor = [];
	document.getElementById('security-footer').innerHTML = '';
	for (i = 0; i < chartLabels.length; i++) {
		chartColor.push(colorArray[i]);
		if (chartTotal == 0) document.getElementById('security-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('security-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById("security-chart").getContext("2d");
	if (securityChart) securityChart.destroy();
	
	securityChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Client Encryption",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = securityChart.data.labels[dataIndex]
			let selectedClients = [];
			if (val === 'WPA3-Personal') selectedClients = wpa3Clients;
			else if (val === 'WPA3-Enterprise') selectedClients = wpa3XClients;
			else if (val === 'WPA2-Personal') selectedClients = wpa2Clients;
			else if (val === 'WPA2-Enterprise') selectedClients = wpa2XClients;
			else if (val === 'Enhanced Open') selectedClients = oweClients;
			else if (val === 'Open') selectedClients = openClients;
			else selectedClients = otherClients;
			document.getElementById('selected-title').innerHTML = 'Clients connected to ' + val;
			
			loadSelectedClients(selectedClients);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Cipher Suite Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadCipherChart() {
	
	// Build labels and series
	let chartLabels = ['CCM-128','GCM-256','Open','RC4','TKIP'];
	let chartSeries = [ccm128.length, gcm256.length,openSec.length,rc4.length,tkip.length];
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	let chartColor = [];
	document.getElementById('cipher-footer').innerHTML = '';
	for (i = 0; i < chartLabels.length; i++) {
		chartColor.push(colorArray[i]);
		if (chartTotal == 0) document.getElementById('cipher-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('cipher-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById("cipher-chart").getContext("2d");
	if (cipherChart) cipherChart.destroy();
	
	cipherChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Client Encryption",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = cipherChart.data.labels[dataIndex]
			let selectedClients = [];
			if (val === 'CCM-128') selectedClients = ccm128;
			else if (val === 'GCM-256') selectedClients = gcm256;
			else if (val === 'Open') selectedClients = openSec;
			else if (val === 'RC4') selectedClients = rc4;
			else if (val === 'TKIP') selectedClients = tkip;
			document.getElementById('selected-title').innerHTML = 'Clients connected to ' + val;
			
			loadSelectedClients(selectedClients);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Tunnel Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadTunnelChart() {
	
	// Create AP Model array
	var items = Object.keys(overlayClients).map(function(key) {
		return [key, overlayClients[key]];
	});
	
	// Sort the array based on the second element
	items.sort(function(first, second) {
		return second[1].length - first[1].length;
	});
	
	// Build labels and series
	let chartLabels = [];
	let chartSeries = [];
	let chartColor = [];
	document.getElementById('tunnel-footer').innerHTML = '';
	for (i = 0; i < items.length; i++) {
		chartLabels.push(items[i][0]);
		chartSeries.push(items[i][1].length);
		chartColor.push(colorArray[i]);
	}
	// Build Footer
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	for (i = 0; i < chartLabels.length; i++) {
		if (chartTotal == 0) document.getElementById('tunnel-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('tunnel-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById("tunnel-chart").getContext("2d");
	if (tunnelChart) tunnelChart.destroy();
	
	tunnelChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Tunnels",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = tunnelChart.data.labels[dataIndex]
			let selectedClients = overlayClients[val];
			document.getElementById('selected-title').innerHTML = 'Clients connected to ' + val;
			loadSelectedClients(selectedClients);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	11k Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function load11kChart() {
	
	// Build labels and series
	let chartType = '11k'
	let chartLabels = ['Supported','Not Supported'];
	let chartSeries =  [kClients.length, noKClients.length]
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	let chartColor = [];
	
	document.getElementById('11k-footer').innerHTML = '';
	for (i = 0; i < chartLabels.length; i++) {
		chartColor.push(colorArray[i]);
		if (chartTotal == 0) document.getElementById('11k-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('11k-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById(chartType+'-chart').getContext("2d");
	if (kChart) kChart.destroy();
	
	kChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: '',
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = kChart.data.labels[dataIndex]
			if (val === 'Not Supported') {
				selectedClients = noKClients;
				document.getElementById('selected-title').innerHTML = 'Clients without 802.11k support';
			} else if (val === 'Supported') {
				selectedClients = kClients;
				document.getElementById('selected-title').innerHTML = 'Clients with 802.11k support';
			}
			loadSelectedClients(selectedClients);
		}
	  },
	});
	
}

function load11rChart() {
	// Build labels and series
	let chartType = '11r'
	let chartLabels = ['Supported','Not Supported'];
	let chartSeries =  [rClients.length, noRClients.length]
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	let chartColor = [];
	
	document.getElementById('11r-footer').innerHTML = '';
	for (i = 0; i < chartLabels.length; i++) {
		chartColor.push(colorArray[i]);
		if (chartTotal == 0) document.getElementById('11r-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('11r-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById(chartType+'-chart').getContext("2d");
	if (rChart) rChart.destroy();
	
	rChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: '',
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = rChart.data.labels[dataIndex]
			if (val === 'Not Supported') {
				selectedClients = noRClients;
				document.getElementById('selected-title').innerHTML = 'Clients without 802.11r support';
			} else if (val === 'Supported') {
				selectedClients = rClients;
				document.getElementById('selected-title').innerHTML = 'Clients with 802.11r support';
			}
			loadSelectedClients(selectedClients);
		}
	  },
	});
}

function load11vChart() {
	// Build labels and series
	let chartType = '11v'
	let chartLabels = ['Supported','Not Supported'];
	let chartSeries =  [vClients.length, noVClients.length]
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	let chartColor = [];
	
	document.getElementById('11v-footer').innerHTML = '';
	for (i = 0; i < chartLabels.length; i++) {
		chartColor.push(colorArray[i]);
		if (chartTotal == 0) document.getElementById('11v-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('11v-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById(chartType+'-chart').getContext("2d");
	if (vChart) vChart.destroy();
	
	vChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: '',
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = vChart.data.labels[dataIndex]
			if (val === 'Not Supported') {
				selectedClients = noRClients;
				document.getElementById('selected-title').innerHTML = 'Clients without 802.11v support';
			} else if (val === 'Supported') {
				selectedClients = rClients;
				document.getElementById('selected-title').innerHTML = 'Clients with 802.11v support';
			}
			loadSelectedClients(selectedClients);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	MLO Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadMLOChart() {
	
	// Create MLO array
	var items = Object.keys(mloMode).map(function(key) {
		return [key, mloMode[key]];
	});
	
	// Sort the array based on the second element
	items.sort(function(first, second) {
		return second[1].length - first[1].length;
	});
	
	// Build labels and series
	let chartLabels = [];
	let chartSeries = [];
	let chartColor = [];
	document.getElementById('mlo-footer').innerHTML = '';
	for (i = 0; i < items.length; i++) {
		chartLabels.push(items[i][0]);
		chartSeries.push(items[i][1].length);
		chartColor.push(colorArray[i]);
	}
	// Build Footer
	let chartTotal = chartSeries.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
	for (i = 0; i < chartLabels.length; i++) {
		if (chartTotal == 0) document.getElementById('mlo-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+'</strong></li>');
		else document.getElementById('mlo-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + chartLabels[i] + ': <strong>'+chartSeries[i]+' (' + (chartSeries[i]/chartTotal*100).toFixed(0) + '%)</strong></li>');
	}
	
	let ctx3 = document.getElementById("mlo-chart").getContext("2d");
	if (mloChart) mloChart.destroy();
	
	mloChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Tunnels",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false,
		  hoverOffset: 4
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		interaction: {
		  intersect: false,
		  mode: 'index',
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: false,
			  drawTicks: false,
			},
			ticks: {
			  display: false,
			}
		  },
		},
		onClick: (e, activeEls) => {
			let datasetIndex = activeEls[0].datasetIndex;
			let dataIndex = activeEls[0].index;
			let val = mloChart.data.labels[dataIndex]
			let selectedClients = mloMode[val];
			document.getElementById('selected-title').innerHTML = 'Clients connected to ' + val;
			loadSelectedClients(selectedClients);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Client Auth Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadAuthChart() {

	// Build labels and series
	let chartLabels = ['None', 'MAC Auth', '802.1X'];
	// Build footer
	document.getElementById('auth-footer').innerHTML = '';
	document.getElementById('auth-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[0] + '"></i> 6GHz</li>');
	document.getElementById('auth-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[1] + '"></i> 5GHz</li>');
	document.getElementById('auth-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[2] + '"></i> 2.4GHz</li>');
	document.getElementById('auth-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[3] + '"></i> Wired</li>');
	
	var canvasModel = document.getElementById("auth-chart");
	var ctxModel = canvasModel.getContext("2d");
	if (authChart) authChart.destroy();
	
	authChart = new Chart(ctxModel, {
	  type: "bar",
	  data: {
		labels: chartLabels,
		datasets: [{
		  weight: 5,
		  borderWidth: 0,
		  borderRadius: 4,
		  backgroundColor: colorArray[0],
		  data: [noAuthClients6.length, macClients6.length, dot1XClients6.length],
		  fill: false,
		  maxBarThickness: 15
		},{
		  weight: 5,
		  borderWidth: 0,
		  borderRadius: 4,
		  backgroundColor: colorArray[1],
		  data: [noAuthClients5.length, macClients5.length, dot1XClients5.length],
		  fill: false,
		  maxBarThickness: 15
		},{
		  weight: 5,
		  borderWidth: 0,
		  borderRadius: 4,
		  backgroundColor: colorArray[2],
		  data: [noAuthClients2.length, macClients2.length, dot1XClients2.length],
		  fill: false,
		  maxBarThickness: 15
		},{
		  weight: 5,
		  borderWidth: 0,
		  borderRadius: 4,
		  backgroundColor: colorArray[3],
		  data: [noAuthClientsW.length, macClientsW.length, dot1XClientsW.length],
		  fill: false,
		  maxBarThickness: 15
		}],
	  },
	  options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		  legend: {
			display: false,
		  }
		},
		scales: {
		  y: {
			grid: {
			  drawBorder: false,
			  display: true,
			  drawOnChartArea: true,
			  drawTicks: false,
			  borderDash: [5, 5]
			},
			ticks: {
			  display: true,
			  padding: 10,
			  color: '#9ca2b7',
			  stepSize: 1
			}
		  },
		  x: {
			grid: {
			  drawBorder: false,
			  display: false,
			  drawOnChartArea: true,
			  drawTicks: true,
			},
			ticks: {
			  display: true,
			  color: '#9ca2b7',
			  padding: 10
			}
		  },
		},
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	VLAN Distribution Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadVLANChart() {
	
	// Create Client OS array
	var items = Object.keys(clientVLAN).map(function(key) {
		return [key, clientVLAN[key]];
	});
	
	// Sort the array based on the second element
	items.sort(function(first, second) {
		return second[1].length - first[1].length;
	});
	
	// Create a new array with only the first "x" items
	let topItems = items.slice(0, maxVLANLimit);
	
	// Build labels and series
	let labels = [];
	let series = [];
	topItems.forEach(function(item) {
		if (item[0] !== '') {
			labels.push(item[0]);
			series.push(item[1].length);
		}
	});
	
	var canvasModel = document.getElementById("vlan-chart");
	var ctxModel = canvasModel.getContext("2d");
	if (vlanChart) vlanChart.destroy();
	
	vlanChart = new Chart(ctxModel, {
	type: "bar",
	data: {
		labels: labels,
		datasets: [{
		weight: 5,
		borderWidth: 0,
		borderRadius: 4,
		backgroundColor: '#8392AB',
		data: series,
		fill: false,
		maxBarThickness: 35
		}],
	},
	options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
		legend: {
			display: false,
		}
		},
		scales: {
		y: {
			grid: {
			drawBorder: false,
			display: true,
			drawOnChartArea: true,
			drawTicks: false,
			borderDash: [5, 5]
			},
			ticks: {
			display: true,
			padding: 10,
			color: '#9ca2b7',
			stepSize: 1
			}
		},
		x: {
			grid: {
			drawBorder: false,
			display: false,
			drawOnChartArea: true,
			drawTicks: true,
			},
			ticks: {
			display: true,
			color: '#9ca2b7',
			padding: 10
			}
		},
		},
	},
	});
	
	// Make sure to attach `onclick` to the canvas, **not** the chart instance
	canvasModel.onclick = (evt) => {
	const res = modelChart.getElementsAtEventForMode(
		evt,
		'nearest',
		{ intersect: true },
		true
	);
	// If didn't click on a bar, `res` will be an empty array
	if (res.length === 0) {
		return;
	}
	
	var selectedClients = [];
	var val = modelChart.data.labels[res[0].index];
	selectedClients = clientVLAN[val];
	document.getElementById('selected-title').innerHTML = 'VLAN '+ val + ' Clients';
	
	loadSelectedClients(selectedClients);
	};
}