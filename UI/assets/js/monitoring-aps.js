/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var apNotification;
var apDetails;
var apDetailsCounter;
var apList;
var filteredDeviceList;

var radioNotification;
var radioDetails = [];
var bssidDetails = {};

var upAPs = [];
var downAPs = [];
var radioCounter;
var apModels = {};
var apThroughput = [];
var apFirmware = {};
var deviceReboot = {};
var apRadios = [];
var bssRadios = [];
var configStatusDict = {};

var down2 = 0;
var down2APs = [];
var down5 = 0;
var down5APs = [];
var down6 = 0;
var down6APs = [];

var portIssues = 0
var portIssuesAPs = [];
var portAPs = [];

var highMemoryAPs = [];
var highMemoryCount = 0;
var highCPUAPs = [];
var highCPUCount = 0;

var negotiatedPower = {};
var flexRadios = {};

const maxModelLimit = 11;
const maxAPLimit = 10;
const maxFirmwareLimit = 5;
const maxRebootLimit = 5;

var firmwareChart;
var modelChart;
var throughputChart;
var rebootChart;
var configChart;
var powerChart;
var flexChart;

var loadRadioData = false;
var loadBSSIDData = false;


function refreshAPData() {
	localStorage.removeItem('monitoring_ap_update')
	authenticateWithCentral().then(function() {
		getAPDeviceData(1);
	});
}

function loadCurrentPageAP() {
	loadRadioData = false;
	loadBSSIDData = false;
	loadDataFromDB('monitoring_aps_details');
	loadDataFromDB('monitoring_radios');
	loadDataFromDB('monitoring_wlan_details');
	loadDataFromDB('monitoring_bssid_details');
}

function loadSavedData(indexKey, data) {
	if (indexKey === 'monitoring_aps_details') {
		apDetails = JSON.parse(data);
		apList = getAPs();
		if (apDetails && localStorage.getItem('monitoring_ap_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_ap_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getAPDetails();
				});
			} else {
				processAPs();
			}
		} else {
			authenticateWithCentral().then(function() {
				getAPDetails();
			});
		}
	} else if (indexKey === 'monitoring_radios') {
		radioDetails = JSON.parse(data);
		if (radioDetails && localStorage.getItem('monitoring_radios_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_radios_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getRadios(1).then(function() {
						radioDetails = getRadioList();
						loadRadioData = true;
						processRadios();
					});
				});
			} else {
				loadRadioData = true;
				processRadios();
			}
		} else {
			authenticateWithCentral().then(function() {
				getRadios(1).then(function() {
					radioDetails = getRadioList();
					loadRadioData = true;
					processRadios();
				});
			});
		}
	} else if (indexKey === 'monitoring_wlan_details') {
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
				processAPs();
			}
		} else {
			authenticateWithCentral().then(function() {
				getWLANs(1);
			});
		}
	} else if (indexKey === 'monitoring_bssid_details') {
		bssidDetails = JSON.parse(data);
		apList = getAPs();
		if (bssidDetails && localStorage.getItem('monitoring_bssid_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_bssid_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getBSSIDs(1).then(function() {
						bssidDetails = getBSSIDList();
						loadBSSIDData = true;
						processRadios();
					});
				});
			} else {
				loadBSSIDData = true;
				processRadios();
			}
		} else {
			authenticateWithCentral().then(function() {
				getBSSIDs(1).then(function() {
					bssidDetails = getBSSIDList();
					loadBSSIDData = true;
					processRadios();
				});
			});
		}
	}
}

function processStats() {
	processAPs();
	processRadios();
}

function processAPs() {
	var updateDate = new Date(parseInt(localStorage.getItem('monitoring_ap_update')));
	if (document.getElementById('lastUpdateDate')) document.getElementById('lastUpdateDate').innerHTML = moment(updateDate).format("Do MMMM YYYY, h:mm:ss a");
	
	getHighThroughput();
	
	let siteChoices = getSiteSelector();
	let selectedSite = siteChoices.getValue(true);
	filteredDeviceList = [];
	
	upAPs = [];
	downAPs = [];
	apModels = {};
	apFirmware = {};
	deviceReboot = {};
	
	portIssues = 0;
	portIssuesAPs = [];
	portAPs = [];
	
	highMemoryAPs = [];
	highCPUAPs = [];
	
	configStatusDict = {};
	
	$('#ap-table')
	.DataTable().clear();
	
	$('#port-table')
	.DataTable().clear();
	
	apList.forEach(function(device) {
		if (device.siteId === selectedSite || selectedSite === '_all')  {
			
			
			// Add the AP to the ap-table
			loadAPUI(device);
			
			var currentDeviceDetails = apDetails[device['serialNumber']];
			if (!currentDeviceDetails) {
				currentDeviceDetails = {
					serialNumber: device['serialNumber'],
					deviceName: device['deviceName'],
					clientCount: '-',
					ports: [],
					apStats: []
				};
			}
			if (device['clientCount']) {
				currentDeviceDetails['clientCount'] = device['clientCount'];
			} else if (!currentDeviceDetails['clientCount']) {
				currentDeviceDetails['clientCount'] = '-';
			}
			if (device['powerConsumption']) currentDeviceDetails['powerConsumption'] = device['powerConsumption'];
			var deviceHealth = findDeviceInConfigHealth(device['serialNumber']);
			filteredDeviceList.push(currentDeviceDetails);
			//console.log(device)
			//console.log(currentDeviceDetails)
			//console.log(deviceHealth)
			
			var tshootBtns = '';
			
			if (apModels[device.model]) {
				var apArray = apModels[device.model];
				apArray.push(device);
				apModels[device.model] = apArray;
			} else {
				var apArray = [];
				apArray.push(device);
				apModels[device.model] = apArray;
			}
			
			if (apFirmware[device.firmwareVersion]) {
				var apArray = apFirmware[device.firmwareVersion];
				apArray.push(device);
				apFirmware[device.firmwareVersion] = apArray;
			} else {
				var apArray = [];
				apArray.push(device);
				apFirmware[device.firmwareVersion] = apArray;
			}
			
			if (device.status === 'ONLINE') {
				upAPs.push(device);
				if (currentDeviceDetails) {
					let rebootReason = currentDeviceDetails['lastRebootReason'];
					if (!rebootReason) rebootReason = "Unknown";
					if (rebootReason.includes('_')) rebootReason = titleCase(noUnderscore(rebootReason))
					rebootReason = rebootReason.replace('Ap', 'AP');
					rebootReason = rebootReason.replace('Hw', 'HW');
					if (rebootReason === 'Both Base and Extension Image Upgrade Successful') rebootReason = 'Image Upgrade';
					if (deviceReboot[rebootReason]) {
						let deviceArray = deviceReboot[rebootReason];
						deviceArray.push(device);
						deviceReboot[rebootReason] = deviceArray;
					} else {
						let deviceArray = [];
						deviceArray.push(device);
						deviceReboot[rebootReason] = deviceArray;
					}
					
				if (currentDeviceDetails.bandSelection && currentDeviceDetails.bandSelection !== '-') {
					if (flexRadios[currentDeviceDetails.bandSelection]) {
						var flexArray = flexRadios[currentDeviceDetails.bandSelection];
						flexArray.push(device);
						flexRadios[currentDeviceDetails.bandSelection] = flexArray;
					} else {
						var flexArray = [];
						flexArray.push(device);
						flexRadios[currentDeviceDetails.bandSelection] = flexArray;
					}
				}
				
				if (currentDeviceDetails.negotiatedPower && currentDeviceDetails.negotiatedPower !== '-') {
					if (negotiatedPower[currentDeviceDetails.negotiatedPower]) {
						var apArray = negotiatedPower[currentDeviceDetails.negotiatedPower];
						apArray.push(device);
						negotiatedPower[currentDeviceDetails.negotiatedPower] = apArray;
					} else {
						var apArray = [];
						apArray.push(device);
						negotiatedPower[currentDeviceDetails.negotiatedPower] = apArray;
					}
				}
				
				let configStatusString = deviceHealth?deviceHealth.configStatus:'Unknown';
				if (!configStatusString) configStatusString = "Unknown";
				configStatusString = titleCase(configStatusString);
				if (configStatusDict[configStatusString]) {
					let configArray = configStatusDict[configStatusString];
					configArray.push(device);
					configStatusDict[configStatusString] = configArray;
				} else {
					let configArray = [];
					configArray.push(device);
					configStatusDict[configStatusString] = configArray;
				}
				
				var ip_address = device['ipv4'];
				if (!ip_address) ip_address = device['ipv6'];
				if (!ip_address) ip_address = '';
				
				if (currentDeviceDetails && currentDeviceDetails['apStats'] && currentDeviceDetails['apStats'][0]) {
					var memoryUtilization = currentDeviceDetails['apStats'][0]['memoryUtilization'];
					if (memoryUtilization > 75) {
						highMemoryAPs.push(device);
					}
					
					var cpuUtilization = currentDeviceDetails['apStats'][0]['cpuUtilization'];
					if (cpuUtilization > 50) {
						highCPUAPs.push(device);
					}
				}
				
				var portTable = $('#port-table').DataTable();
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				// Get Site
				var deviceSite = getSiteForId(device['siteId'])
				var deviceSiteURL = '';
				if (deviceSite) {
					deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&timelineFrame=Hour';
				}
				//console.log(deviceSite)
				
				var deviceStatus = '<i class="fa-solid fa-diamond text-danger"></i>';
				if (device['status'] == 'ONLINE') {
					deviceStatus = '<i class="fa-solid fa-circle text-success"></i>';
				}
				
				if (currentDeviceDetails && currentDeviceDetails.ports) {
					currentDeviceDetails.ports.forEach(function(port) {
						if (port.status === 'UP') {
							var duplex = port['duplex'];
							var portSpeed = port['speed'];
							var issueFound = false;
							if (duplex !== 'Full') {
								duplex = '<span class="text-danger"><strong>'+duplex+'</strong><span>';
								issueFound = true;
							}
							if (parseInt(portSpeed) < 1000) {
								portSpeed = '<span class="text-danger"><strong>'+portSpeed+'</strong><span>';
								issueFound = true;
							}
							
							var nativeVLAN = port['nativeVlan'];
							if (port['vlanMode'] === "Access") nativeVLAN = port['accessVlan'];
							
							portAPs.push([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span title="' + escapeHtml(device['status']) + '"></span>' + deviceStatus, escapeHtml(port['macAddress']), escapeHtml(port['name']), portSpeed, duplex, escapeHtml(port['vlanMode']), escapeHtml(nativeVLAN), escapeHtml(port['allowedVlan']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '',issueFound?'issues problem error':'']);
						
							portTable.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span title="' + escapeHtml(device['status']) + '"></span>' + deviceStatus, escapeHtml(port['macAddress']), escapeHtml(port['name']), portSpeed, duplex, escapeHtml(port['vlanMode']), escapeHtml(nativeVLAN), escapeHtml(port['allowedVlan']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '',issueFound?'issues problem error':'']);
							
							if (issueFound)	portIssues++;
							
							portIssuesAPs.push({ name: device['deviceName'], serial: device['serialNumber'], status: device['status'], mac: port['macAddress'], port: port['name'], speed: port['speed'], duplex: port['duplex'], mode: port['vlanMode'], native: nativeVLAN, allowed: port['allowedVlan'], site: deviceSite['siteName']});
							
							
						}
					});
				}
			} 
			} else {
				downAPs.push(device);
				
				let configStatusString = "Offline";
				if (configStatusDict[configStatusString]) {
					let configArray = configStatusDict[configStatusString];
					configArray.push(device);
					configStatusDict[configStatusString] = configArray;
				} else {
					let configArray = [];
					configArray.push(device);
					configStatusDict[configStatusString] = configArray;
				}
			}
		}
	});
	
	
	if (document.getElementById('port_count')) {
		document.getElementById('port_count').innerHTML = portIssues;
	
		if (portIssues > 0) {
			document.getElementById('port_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('port_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('port_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('port_icon')?.classList.remove('bg-gradient-info');
		} else {
			document.getElementById('port_icon')?.classList.remove('bg-gradient-info');
			document.getElementById('port_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('port_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('port_icon')?.classList.add('bg-gradient-success');
		}
	}
	
	if (document.getElementById('up_count')) document.getElementById('up_count').innerHTML = '' + upAPs.length + '';
	if (document.getElementById('down_count')) document.getElementById('down_count').innerHTML = '' + downAPs.length + '';

	
	// Force reload of table data
	$('#ap-table')
		.DataTable()
		.rows()
		.draw();
		
	$('#port-table')
		.DataTable()
		.rows()
		.draw();
		
	initializeTooltips(document);
		
	loadAPStatus();
	loadClientTable();
	
	loadUptimeTable();
	loadCPUTable();
	loadMemoryTable();
	loadFirmwareChart();
	loadModelChart();
	loadRebootChart();
	loadConfigChart();
	
	loadPowerChart();
	loadFlexChart();
}

function processRadios() {
	if (loadRadioData && loadBSSIDData) {
		$('#radios-table').DataTable().clear();
		var radioTable = $('#radios-table').DataTable();
		
		$('#bssid-table').DataTable().clear();
		var bssidTable = $('#bssid-table').DataTable();
		
		apRadios = [];
		down2 = 0;
		down2APs = [];
		down5 = 0;
		down5APs = [];
		down6 = 0;
		down6APs = [];
		radioCounter = 0;
		
		bssRadios = [];
		bssCounter = 0;
			
		// check if both datasets are available
		if (radioDetails.length > 0 && Object.keys(bssidDetails).length > 0) {
			
			document.getElementById('radioRow').hidden = false;
			document.getElementById('radioRowMessage').hidden = true;
			
			let siteChoices = getSiteSelector();
			let selectedSite = siteChoices.getValue(true);
			filteredDeviceList = [];
		
			radioDetails.forEach(function(radio) {
				
				if (radio.siteId === selectedSite || selectedSite === '_all')  {
					let status = '<i class="fa-solid fa-diamond text-danger"></i>';
					if (radio['status'] == 'UP') {
						status = '<i class="fa-solid fa-circle text-success"></i>';
					}
					
					// find AP for the radio
					let device = findDeviceInMonitoring(radio.serialNumber);
					if (device) {
						// Make Name as a link to Central
						var name = encodeURI(device['deviceName']);
						var apiURL = localStorage.getItem('base_url');
						var centralBaseURL = centralURLs[apiURL];
						var centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
						
						// Get Site
						var deviceSite = getSiteForId(device['siteId'])
						var deviceSiteURL = '';
						if (deviceSite) {
							deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&timelineFrame=Hour';
						}
						
						var ip_address = device['ipv4'];
						if (!ip_address) ip_address = device['ipv6'];
						if (!ip_address) ip_address = '';
						
						// Add row to radio Table
						if (radio['status'] == 'UP') {		
							var channel = '-';
							if (radio['channel']) channel = radio['channel'] + '<span style="font-size:12px;"> (' + radio['channelChangeCount'] + ')</span>'
							
							var power = '-';
							if (radio['power']) power = radio['power'] + '<span style="font-size:12px;">  (' + radio['powerChangeCount'] + ')</span>';
							
							var noiseFloor = radio['noiseFloor'];
							if (!noiseFloor) noiseFloorString = '-';
							else {
								var noiseFloorString = ''+noiseFloor;
								if (noiseFloor > -85) noiseFloorString = '<span style="color:red;">' + noiseFloor + '</span>'
							}
							
							var retries = Math.round(radio['retries']);
							var retryString = ''+retries;
							if (retries > 20) retryString = '<span style="color:red;">' + retries + '</span>'
							
							var interference = Math.round(radio['nonWifiInterference']);
							var intfString = ''+interference;
							if (interference > 20) intfString = '<span style="color:red;">' + interference + '</span>'
							
							var drops = Math.round(radio['drops']);
							
							tshootBtns = ''
							//tshootBtns = '<a class="btn btn-link btn-warning" data-toggle="tooltip" data-placement="top" title="Radio Details" onclick="displayRadioDetails(\'' +  device['serial'] + '\')"><i class="fa-solid fa-circle-info style="color: #67748e; font-size:18px;"></i></a>';
							
							radioTable.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a><br>Radio: ' + escapeHtml(radio['radioNumber']), '<span title="' + escapeHtml(radio['status']) + '"></span>' + status, escapeHtml(radio['macAddress']), '<span data-bs-toggle="tooltip" data-bs-placement="top" title="Radio ID: ' + escapeHtml(radio['radioNumber']) + '"></span>' + radio['band'], radio['mode'], radio['clientCount'] ? radio['clientCount'] : '-', channel, power, radio['channelUtilization'] ? '<span data-bs-toggle="tooltip" data-bs-placement="top" title="Rx: ' + escapeHtml(radio['rxUtilization']) + '% | Tx: ' + escapeHtml(radio['txUtilization']) + '%"></span>' + radio['channelUtilization'] : '-', retryString, interference, noiseFloorString, Math.round(radio['drops']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '']);
							
							// Store for CSV download
							apRadios.push({ 
								name: device['deviceName'], 
								serial: device['serialNumber'], 
								status: radio['status'], 
								radio: radio['radioNumber'],
								radiomac: radio['macAddress'], 
								band: radio['band'], 
								mode: radio['mode'], 
								clients: radio['clientCount'] ? radio['clientCount'] : '-', 
								channel: radio['channel'] ? radio['channel'] : '-', 
								channelChanges: radio['channelChangeCount'], 
								power: radio['power'] ? radio['power'] : '-', 
								powerChanges: radio['powerChangeCount'], 
								util: radio['channelUtilization'] ? radio['channelUtilization'] : '-', 
								retry: radio['retries'] ? radio['retries'] : '-', 
								interference: radio['nonWifiInterference'] ? radio['nonWifiInterference'] : '-', 
								noisefloor: radio['noiseFloor'] ? radio['noiseFloor'] : '-', 
								quality: radio['channelQuality'] ? radio['channelQuality'] : '-', 
								drops: radio['drops'] ? radio['drops'] : '-', 
								//flex: currentDeviceDetails['bandSelection'] ? currentDeviceDetails['bandSelection'] : '-', 
								streams: radio['spatialStream'],
								site: deviceSite['siteName']
							});
						} else {
							radioTable.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a><br>Radio: ' + escapeHtml(radio['radioNumber']), '<span title="' + escapeHtml(radio['status']) + '"></span>' + status, escapeHtml(radio['macAddress']), radio['band'], '-', '-', '-', '-', '-', '-', '-', '-', '-', deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '']);
							
							// Store for CSV download
							apRadios.push({ 
								name: device['deviceName'], 
								serial: device['serialNumber'], 
								status: radio['status'], 
								radio: radio['radioNumber'], 
								radiomac: radio['macAddress'], 
								band: radio['band'], 
								mode: radio['mode'], 
								clients: '-',
								channel: '-', 
								channelChanges: '-', 
								power: '-', 
								powerChanges: '-', 
								util: '-', 
								retry: '-', 
								interference: '-', 
								noisefloor: '-', 
								quality: '-', 
								drops: '-', 
								//flex: currentDeviceDetails['bandSelection'] ? currentDeviceDetails['bandSelection'] : '-', 
								streams: radio['spatialStream'],
								site: deviceSite['siteName']
							});
						}
						
						(bssidDetails[radio['macAddress']] || []).forEach(function(bssid) {
							let wlanInfo = wlanDetails[bssid['wlanName']];
							bssidTable.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span title="' + escapeHtml(device['status']) + '"></span>' + status, escapeHtml(ip_address), escapeHtml(device['model']), escapeHtml(device['serialNumber']), escapeHtml(bssid['wlanName']), escapeHtml(bssid['bssid']), bssid['clientCount'] ? bssid['clientCount'] : '-', radio['band'], wlanInfo ? wlanInfo['security'] : '-', wlanInfo ? wlanInfo['vlan'] : '-', deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '']);
							
							bssRadios.push({ name: device['deviceName'], status: device['status'], ip_address: ip_address, model: device['model'], serial: device['serialNumber'], essid: bssid['wlanName'], bssid: bssid['bssid'], base_mac: radio['macAddress'], clients:bssid['clientCount']?bssid['clientCount']:'-', band:radio['band'], security:wlanInfo?wlanInfo['security']:'-', vlan:wlanInfo?wlanInfo['vlan']:'-', site: deviceSite['siteName']});
							
							bssCounter++;
						});
						
						radioCounter++;
			
						if (radio.band.includes('2.4 GHz') && radio.status !== 'UP') {
							down2++;
							down2APs.push(device);
						}
						if (radio.band.includes('5 GHz') && radio.status !== 'UP') {
							down5++;
							down5APs.push(device);
						}
						if (radio.band.includes('6 GHz') && radio.status !== 'UP') {
							down6++;
							down6APs.push(device);
						}
					
				}
				}
			});
		} else {
			document.getElementById('radioRow').hidden = true;
			document.getElementById('radioRowMessage').hidden = false;
		}
		
		loadRadioStatus();
		
		$('#radios-table')
			.DataTable()
			.rows()
			.draw();
		
		$('#bssid-table')
			.DataTable()
			.rows()
			.draw();
	}
}


function getAPDetails() {
	apDetails = {};
	apDetailsCounter = 0;
	if (apNotification) apNotification.close();
	apNotification = showProgressNotification('ca-ap-icon3', 'Obtaining AP Details...', 'bottom', 'center', 'info');
	
	for(var i=0;i<apList.length;i++) {
		setTimeout(updateAPDetails, apiDelay*i, apList[i]);
	}
}

function updateAPDetails(currentAP) {
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-monitoring/v1/aps/' + currentAP['serialNumber'],
		access_token: localStorage.getItem('access_token'),
	}).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 503) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(updateAPDetails, apiWaitDelay, currentAP);
		} else if (result !== 200) {
			showNotification('ca-ap-icon3', 'Failed to download AP details for '+ currentAP['serialNumber'], 'bottom', 'center', 'warning');
			apDetailsCounter++;
		} else {
			var response = safeParseCommandResponseBody(commandResults, 'AP details for ' + currentAP['serialNumber']);
			if (response) {
				apDetails[currentAP['serialNumber']] = response;
			} else {
				showNotification('ca-ap-icon3', 'Failed to parse AP details for '+ currentAP['serialNumber'], 'bottom', 'center', 'warning');
			}
			apDetailsCounter++;
			if (apDetailsCounter < apList.length) {
				var apProgress = (apDetailsCounter / apList.length) * 100;
				apNotification.update({ progress: apProgress });
			}  else {
				if (apNotification) apNotification.update({ progress: 100 });
				saveDataToDB('monitoring_aps_details', JSON.stringify(apDetails));
				localStorage.setItem('monitoring_ap_update', +new Date());
				if (apNotification) apNotification.close();
				processAPs();
			}
		}
		
	});
}

function getHighThroughput() {
	
	let siteChoices = getSiteSelector();
	let selectedSite = siteChoices.getValue(true);
	selectedFilter = '';
	if (selectedSite !== '_all') selectedFilter = 'site-id='+selectedSite+'&'
	
	let now = DateTime.now();
	let startAt = now.minus({ days: 1 });
	
	
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-monitoring/v1/top-aps-by-usage?'+selectedFilter+'start-at='+ encodeURIComponent(startAt.toUTC().toISO()),
		access_token: localStorage.getItem('access_token'),
	}).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 503) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getHighThroughput, apiWaitDelay);
		} else if (result !== 200) {
			showNotification('ca-ap-icon3', 'Failed to download AP bandwidth details', 'bottom', 'center', 'warning');
		} else {
			var response = safeParseCommandResponseBody(commandResults, 'AP bandwidth details');
			if (!response) {
				showNotification('ca-ap-icon3', 'Failed to parse AP bandwidth details', 'bottom', 'center', 'warning');
				return;
			}
			apThroughput = response.items;
			
			loadThroughputChart();
		}
		
	});
}

function filterDevices(status) {
	var table = $('#ap-table').DataTable();
	table.search(status).draw();
	
	var myModal = new bootstrap.Modal(document.getElementById('APModal'))
	myModal.show();
}



function showDevices(showMode) {
	
	var selectedDevices = [];
	if (showMode === '2.4GHz') {
		selectedDevices = down2APs;
		document.getElementById('selected-title').innerHTML = 'APs with Down ' + showMode + ' Radios';
	} else if (showMode === '5GHz') {
		selectedDevices = down5APs;
		document.getElementById('selected-title').innerHTML = 'APs with Down ' + showMode + ' Radios';
	} else if (showMode === '6GHz') {
		selectedDevices = down6APs;
		document.getElementById('selected-title').innerHTML = 'APs with Down ' + showMode + ' Radios';
	} else if (showMode === 'Memory') {
		selectedDevices = highMemoryAPs;
		document.getElementById('selected-title').innerHTML = 'APs with High Memory Utilization';
	} else if (showMode === 'CPU') {
		selectedDevices = highCPUAPs;
		document.getElementById('selected-title').innerHTML = 'APs with High CPU Utilization';
	}

	loadSelectedDevices(selectedDevices);
}

function loadSelectedDevices(selectedDevices) {
	$('#selected-device-table')
		.DataTable().clear();
		
	var table = $('#selected-device-table').DataTable();
	
	selectedDevices.forEach(function(device) {
		
		var statusString = device['status'];
		var status = '<i class="fa-solid fa-diamond text-danger"></i>';
		var deviceUp = true;
		if (device['status'] == 'ONLINE') {
			status = '<i class="fa-solid fa-circle text-success"></i>';
		} else {
			downAPCount++;
			deviceUp = false;
		}
		var ip_address = device['ipv4'];
		if (!ip_address) ip_address = device['ipv6'];
		if (!ip_address) ip_address = '';
		
		// Build Uptime String
		var uptimeString = '-';
		var currentDeviceDetails = apDetails[device['serialNumber']];
		if (!currentDeviceDetails) {
			currentDeviceDetails = { uptimeInMillis: 0, lastSeenAt: null };
		}
		if (currentDeviceDetails['uptimeInMillis'] > 0) {
			var uptime = moment.duration(currentDeviceDetails['uptimeInMillis']);
			uptimeString = uptime.humanize();
		} else if (currentDeviceDetails['lastSeenAt']){
			//var uptime = moment.duration(ap['lastSeenAt'] * 1000);
			//uptimeString = uptime.humanize();
		}
		
		// Make Name as a link to Central
		var name = encodeURI(device['deviceName']);
		var apiURL = localStorage.getItem('base_url');
		var centralBaseURL = centralURLs[apiURL];
		var centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
		
		// Get Site
		var deviceSite = getSiteForId(device['siteId'])
		var deviceSiteURL = '';
		if (deviceSite) {
			deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&timelineFrame=Hour';
		}
		
		// Add row to table
		table.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span title="' + escapeHtml(device['status']) + '"></span>' + status, escapeHtml(ip_address), escapeHtml(device['model']), escapeHtml(device['serialNumber']), escapeHtml(device['macAddress']), escapeHtml(device['firmwareVersion']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '', '<span title="' + escapeHtml(currentDeviceDetails['uptimeInMillis']) + '"></span>' + uptimeString, /*'<a class="btn btn-link btn-warning edit"><i class="fa-solid fa-list-check" style="color: #67748e; font-size:18px;" onclick="getAuditTrail(\'' + device['deviceName'] + '\', 1)"></i></a>'*/'']);
	
		initializeTooltips(table.table().body());
	});
	$('#selected-device-table')
		.DataTable()
		.rows()
		.draw();
		
	var myModal = new bootstrap.Modal(document.getElementById('SelectedDeviceModal'))
	myModal.show();
}

function filterPorts(checkboxElement) {
	loadPortsTable(checkboxElement);
	
	var myModal = new bootstrap.Modal(document.getElementById('PortModal'))
	if (!document.getElementById('PortModal').classList.contains('show')) myModal.show();	
}

function loadPortsTable(checkboxElement) {
	$('#port-table').DataTable().clear();
	
	// Get UI state for filter
	if (!checkboxElement) {
		document.getElementById('issues_only').checked = true;
	} 
	let showOnlyIssues = document.getElementById('issues_only').checked;
	
	var portTable = $('#port-table').DataTable();
	portAPs.forEach(function(item) {
		if (showOnlyIssues && item[10] !== '') {
			portTable.row.add(item);
		} else if (!showOnlyIssues) {
			portTable.row.add(item);
		}
	});
	
	$('#port-table')
	.DataTable()
	.rows()
	.draw();
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Radio Status Bar
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadAPStatus() {
	
	if (document.getElementById('mem_count')) {
		document.getElementById('mem_count').innerHTML = highMemoryAPs.length;
		if (highMemoryAPs.length == 0) {
			document.getElementById('mem_icon')?.classList.add('bg-gradient-success');
			document.getElementById('mem_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('mem_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('mem_icon')?.classList.remove('bg-gradient-info');
		} else {
			document.getElementById('mem_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('mem_icon')?.classList.add('bg-gradient-warning');
			document.getElementById('mem_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('mem_icon')?.classList.remove('bg-gradient-info');
		}
	}
	
	if (document.getElementById('cpu_count')) {
		document.getElementById('cpu_count').innerHTML = highCPUAPs.length;
		if (highCPUAPs.length == 0) {
			document.getElementById('cpu_icon')?.classList.add('bg-gradient-success');
			document.getElementById('cpu_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('cpu_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('cpu_icon')?.classList.remove('bg-gradient-info');
		} else {
			document.getElementById('cpu_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('cpu_icon')?.classList.add('bg-gradient-warning');
			document.getElementById('cpu_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('cpu_icon')?.classList.remove('bg-gradient-info');
		}
	}
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Radio Status Bar
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadRadioStatus() {
	
	
	if (document.getElementById('radio_count')) document.getElementById('radio_count').innerHTML = '' + radioCounter + '';
	if (document.getElementById('bssid_count')) document.getElementById('bssid_count').innerHTML = '' + bssCounter + '';
	
	if (document.getElementById('two_count')) {
		document.getElementById('two_count').innerHTML = down2;
	
		if (down2 > 0) {
			document.getElementById('two_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('two_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('two_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('two_icon')?.classList.remove('bg-gradient-info');
		} else {
			document.getElementById('two_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('two_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('two_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('two_icon')?.classList.add('bg-gradient-info');
		}
	}
	
	if (document.getElementById('five_count')) {
		document.getElementById('five_count').innerHTML = down5;
	
		if (down5 > 0) {
			document.getElementById('five_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('five_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('five_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('five_icon')?.classList.remove('bg-gradient-info');
		} else {
			document.getElementById('five_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('five_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('five_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('five_icon')?.classList.add('bg-gradient-info');
		}
	}
	
	if (document.getElementById('six_count')) {
		document.getElementById('six_count').innerHTML = down6;
	
		if (down6 > 0) {
			document.getElementById('six_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('six_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('six_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('six_icon')?.classList.remove('bg-gradient-info');
		} else {
			document.getElementById('six_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('six_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('six_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('six_icon')?.classList.add('bg-gradient-info');
		}
	}
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	AP Model Bar Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadModelChart() {
	
	// Create AP Model array
	var items = Object.keys(apModels).map(function(key) {
		return [key, apModels[key]];
	});
	
	// Sort the array based on the second element
	items.sort(function(first, second) {
		return second[1].length - first[1].length;
	});
	
	// Create a new array with only the first "x" items
	var topModels = items.slice(0, maxModelLimit);
	
	// Build labels and series
	var apLabels = [];
	var apSeries = [];
	topModels.forEach(function(item) {
		if (item[0] !== '') {
			apLabels.push(item[0]);
			apSeries.push(item[1].length);
		}
	});
	
	var canvasModel = document.getElementById("model-chart");
	var ctxModel = canvasModel.getContext("2d");
	if (modelChart) modelChart.destroy();
	
	modelChart = new Chart(ctxModel, {
	  type: "bar",
	  data: {
		labels: apLabels,
		datasets: [{
		  weight: 5,
		  borderWidth: 0,
		  borderRadius: 4,
		  backgroundColor: '#8392AB',
		  data: apSeries,
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
	  
	  var selectedDevices = [];
	  var val = modelChart.data.labels[res[0].index];
	  selectedDevices = apModels[val];
	  document.getElementById('selected-title').innerHTML = val + ' Access Points';
	  
	  loadSelectedDevices(selectedDevices);
	};
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Client Table
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadClientTable() {
	
	let busyDevices = filteredDeviceList;
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		let firstClient = first.clientCount;
		if (firstClient === '-') firstClient = 0;
		let secondClient = second.clientCount;
		if (secondClient === '-') secondClient = 0;
		return secondClient - firstClient;
	});
	
	$('#busy-table')
		.DataTable().clear();
	
	let table = $('#busy-table').DataTable();
	let uptimeCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		if (busyDevices[i] && busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE') {
			if (uptimeCounter < maxAPLimit) {
				var device = busyDevices[i];
				
				// Make Name as a link to Central
				let name = encodeURI(device['deviceName']);
				let apiURL = localStorage.getItem('base_url');
				let centralBaseURL = centralURLs[apiURL];
				let centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
	
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-toggle="tooltip" data-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
				// Add row to table
				table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', escapeHtml(device.clientCount)]);
				uptimeCounter++;
			} else break;
		}
	}
	$('#busy-table')
		.DataTable()
		.rows()
		.draw();
	
	initializeTooltips(table.table().body());
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Uptime Table
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadUptimeTable() {
	
	let busyDevices = filteredDeviceList;
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		return first.uptimeInMillis - second.uptimeInMillis;
	});
	
	$('#uptime-table')
		.DataTable().clear();
	
	let table = $('#uptime-table').DataTable();
	let uptimeCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		if (busyDevices[i] && busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE') {
			if (uptimeCounter < maxAPLimit) {
				var device = busyDevices[i];
				
				// Make Name as a link to Central
				let name = encodeURI(device['deviceName']);
				let apiURL = localStorage.getItem('base_url');
				let centralBaseURL = centralURLs[apiURL];
				let centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var uptimeString = '-';
				if (device['uptimeInMillis'] > 0) {
					var uptime = moment.duration(device['uptimeInMillis']);
					uptimeString = uptime.humanize();
				} else if (device['lastSeenAt']){
					//var uptime = moment.duration(ap['lastSeenAt'] * 1000);
					//uptimeString = uptime.humanize();
				}
				
				let reason = 'Unknown'
				reason = rebootReasons[device['lastRebootReason']];
				if (!reason) reason = device['lastRebootReason'];
	
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-toggle="tooltip" data-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
				// Add row to table
				table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span data-bs-toggle="tooltip" data-bs-placement="top" title="' + escapeHtml(reason) + '">' + uptimeString + '</span>']);
				uptimeCounter++;
			} else break;
		}
	}
	$('#uptime-table')
		.DataTable()
		.rows()
		.draw();
	
	initializeTooltips(table.table().body());
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	CPU Table
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadCPUTable() {
	
	let busyDevices = filteredDeviceList;
	function getStatUtilization(device, metricKey) {
		if (!device || !device.apStats || !device.apStats[0]) return -1;
		let value = device.apStats[0][metricKey];
		if (typeof value !== 'number') return -1;
		return value;
	}
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		return getStatUtilization(second, 'cpuUtilization') - getStatUtilization(first, 'cpuUtilization');
	});
	
	$('#cpu-table')
		.DataTable().clear();
	
	var table = $('#cpu-table').DataTable();
	var cpuCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		if (busyDevices[i] && busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE') {
			if (cpuCounter < maxAPLimit) {
				var device = busyDevices[i];
				let cpuUtilization = getStatUtilization(device, 'cpuUtilization');
				if (cpuUtilization < 0) continue;
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-toggle="tooltip" data-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
				// Add row to table
				let util = cpuUtilization;
				if (util > 75) util = '<span class="text-danger">'+util+'%</span>';
				else util = util+'%'
				table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', util]);
				cpuCounter++;
			} else break;
		}
	}
	$('#cpu-table')
		.DataTable()
		.rows()
		.draw();
	
	initializeTooltips(table.table().body());
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Memory Table
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadMemoryTable() {
	
	let busyDevices = filteredDeviceList;
	function getStatUtilization(device, metricKey) {
		if (!device || !device.apStats || !device.apStats[0]) return -1;
		let value = device.apStats[0][metricKey];
		if (typeof value !== 'number') return -1;
		return value;
	}
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		return getStatUtilization(second, 'memoryUtilization') - getStatUtilization(first, 'memoryUtilization');
	});
	
	$('#memory-table')
		.DataTable().clear();
	
	var table = $('#memory-table').DataTable();
	var memoryCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		if (busyDevices[i] && busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE') {
			if (memoryCounter < maxAPLimit) {
				var device = busyDevices[i];
				let memoryUtilization = getStatUtilization(device, 'memoryUtilization');
				if (memoryUtilization < 0) continue;
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-toggle="tooltip" data-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
				// Add row to table
				let util = memoryUtilization;
				if (util > 75) util = '<span class="text-danger">'+util+'%</span>';
				else util = util+'%'
				table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', util]);
				memoryCounter++;
			} else break;
		}
	}
	$('#memory-table')
		.DataTable()
		.rows()
		.draw();
	
	initializeTooltips(table.table().body());
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Firmware Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadFirmwareChart() {
	
	// Create AP Model array
	var items = Object.keys(apFirmware).map(function(key) {
		return [key, apFirmware[key]];
	});
	// Sort the array based on the second element
	items.sort(function(first, second) {
		return second[1].length - first[1].length;
	});
	
	// Create a new array with only the first "x" items
	var top5Firmware = items.slice(0, maxFirmwareLimit);
	
	// Build labels and series
	var fwLabels = [];
	var fwSeries = [];
	var fwColor = [];
	document.getElementById('firmware-footer').innerHTML = '';
	for (i = 0; i < top5Firmware.length; i++) {
		fwLabels.push(top5Firmware[i][0]);
		fwSeries.push(top5Firmware[i][1].length);
		fwColor.push(colorArray[i]);
		document.getElementById('firmware-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + top5Firmware[i][0] + ': <strong>'+top5Firmware[i][1].length+'</strong></li>');
	}
	
	var ctx3 = document.getElementById("firmware-chart").getContext("2d");
	if (firmwareChart) firmwareChart.destroy();
	
	firmwareChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: fwLabels,
		datasets: [{
		  label: "Firmware",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: fwColor,
		  data: fwSeries,
		  fill: false
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
			var val = firmwareChart.data.labels[dataIndex]
			var selectedDevices = [];
			selectedDevices = apFirmware[val];
			document.getElementById('selected-title').innerHTML = 'Access Points runnning ' + val;
			
			loadSelectedDevices(selectedDevices);
		}
	  },
	});
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Reboot Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadRebootChart() {
	
	// Create AP Model array
	var items = Object.keys(deviceReboot).map(function(key) {
		return [key, deviceReboot[key]];
	});
	// Sort the array based on the second element
	items.sort(function(first, second) {
		return second[1].length - first[1].length;
	});
	
	// Create a new array with only the first "x" items
	var top5Reboot = items.slice(0, maxRebootLimit);
	
	// Build labels and series
	var fwLabels = [];
	var fwSeries = [];
	var fwColor = [];
	document.getElementById('reboot-footer').innerHTML = '';
	for (i = 0; i < top5Reboot.length; i++) {
		fwLabels.push(top5Reboot[i][0]);
		fwSeries.push(top5Reboot[i][1].length);
		fwColor.push(colorArray[i]);
		document.getElementById('reboot-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + top5Reboot[i][0] + ': <strong>'+top5Reboot[i][1].length+'</strong></li>');
	}
	
	var ctx3 = document.getElementById("reboot-chart").getContext("2d");
	if (rebootChart) rebootChart.destroy();
	
	rebootChart = new Chart(ctx3, {
	  type: "doughnut",
	  data: {
		labels: fwLabels,
		datasets: [{
		  label: "Firmware",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: fwColor,
		  data: fwSeries,
		  fill: false
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
			var val = rebootChart.data.labels[dataIndex]
			var selectedDevices = [];
			selectedDevices = deviceReboot[val];
			document.getElementById('selected-title').innerHTML = 'Access Points Reboot reason: ' + val;
			
			loadSelectedDevices(selectedDevices);
		}
	  },
	});
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Download Radios Action
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function downloadRadios() {
	//CSV header
	var nameKey = 'DEVICE NAME';
	var serialKey = 'SERIAL';
	var statusKey = 'STATUS';
	var idKey = 'RADIO ID';
	var radioKey = 'RADIO MAC';
	var bandKey = 'BAND';
	var modeKey = 'MODE';
	var channelKey = 'CHANNEL';
	var chCountKey = 'CHANNEL CHANGES';
	var powerKey = 'POWER';
	var powerCountKey = 'POWER CHANGES';
	var utilKey = 'UTLIZATION';
	var retryKey = 'RETRIES';
	var intKey = 'INTERFERENCE';
	var nfKey = 'NOISE FLOOR';
	var qualityKey = 'QUALITY';
	var dropsKey = 'DROPS';
	var streamsKey = 'SPATIAL STREAMS';
	var flexKey = 'FLEX MODE';
	var siteKey = 'SITE';
	
	var csvDataBuild = [];
	
	var table = $('#radios-table').DataTable();
	var filter = table.search();
	var filteredRows = table.rows({ filter: 'applied' });
	
	// For each row in the filtered set
	filteredRows[0].forEach(function(idx) {
		var row = apRadios[idx];
		
		csvDataBuild.push({ 
			[nameKey]: row.name, 
			[serialKey]:row.serial, 
			[statusKey]: row.status, 
			[idKey]: row.radio, 
			[radioKey]: row.radiomac, 
			[bandKey]: row.band, 
			[modeKey]: row.mode, 
			[channelKey]: row.channel, 
			[chCountKey]: row.channelChanges, 
			[powerKey]: row.power, 
			[powerCountKey]: row.powerChanges, 
			[utilKey]: row.util,
			[retryKey]: row.retry,
			[intKey]: row.interference,
			[nfKey]: row.noisefloor,
			[qualityKey]: row.quality,
			[dropsKey]: row.drops,
			//[flexKey]: row.flex,
			[streamsKey]: row.streams,
			[siteKey]: row.site
		});
	});
	
	var filename = 'Radios'
	if (filter !== '') filename = 'Radios-' + filter.replace(/ /g, '_');
	downloadCSVData(filename, csvDataBuild);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Download BSSID Action
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function downloadBSSIDs() {
	//CSV header
	var nameKey = 'DEVICE NAME';
	var statusKey = 'STATUS';
	var ipKey = 'IP ADDRESS';
	var modelKey = 'MODEL';
	var serialKey = 'SERIAL';
	var essidKey = 'ESSID';
	var bssidKey = 'BSSID';
	var radioKey = 'BASE RADIO MAC';
	var clientkey = 'CLIENTS';
	var bandKey = 'BAND';
	var securityKey = 'SECURITY';
	var vlanKey = 'DEFAULT VLAN';
	var siteKey = 'SITE';
	
	var csvDataBuild = [];
	
	var table = $('#bssid-table').DataTable();
	var filteredRows = table.rows({ filter: 'applied' });
	var filter = table.search();
	//console.log(filteredRows)
	//console.log(bssRadios.length)
	// For each row in the filtered set
	filteredRows[0].forEach(function(idx) {
		//console.log(idx)
		var row = bssRadios[idx];
		//console.log(row)
		csvDataBuild.push({ [nameKey]: row.name, [statusKey]: row.status, [ipKey]: row.ip_address, [modelKey]: row.model, [serialKey]: row.serial, [essidKey]: row.essid, [bssidKey]: row.bssid, [radioKey]: row.base_mac, [clientkey]: row.clients, [bandKey]: row.band, [securityKey]: row.security, [vlanKey]: row.vlan, [siteKey]: row.site});
	});
	
	var filename = 'BSSIDs'
	if (filter !== '') filename = 'BSSIDs-' + filter.replace(/ /g, '_');
	downloadCSVData(filename, csvDataBuild);
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Download Ports Action
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function downloadPorts() {
	//CSV header
	var nameKey = 'DEVICE NAME';
	var serialKey = 'SERIAL';
	var statusKey = 'STATUS';
	var macKey = 'MAC';
	var portKey = 'PORT';
	var speedKey = 'SPEED';
	var duplexKey = 'DUPLEX';
	var modeKey = 'MODE';
	var nativeKey = 'NATIVE/ACCESS';
	var allowedKey = 'ALLOWED';
	var siteKey = 'SITE';
	
	var csvDataBuild = [];
	
	var table = $('#port-table').DataTable();
	var filter = table.search();
	var filteredRows = table.rows({ filter: 'applied' });
	
	// For each row in the filtered set
	filteredRows[0].forEach(function(idx) {
		var row = portIssuesAPs[idx];
		csvDataBuild.push({ [nameKey]: row.name, [serialKey]:row.serial, [statusKey]: row.status, [macKey]: row.mac, [portKey]: row.port, [speedKey]: row.speed, [duplexKey]: row.duplex, [modeKey]: row.mode, [nativeKey]: row.native, [allowedKey]: row.allowed, [siteKey]: row.site });
	});
	
	var filename = 'Ports'
	if (filter !== '') filename = 'Ports-' + filter.replace(/ /g, '_');
	downloadCSVData(filename, csvDataBuild);
	
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Config Sync Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadConfigChart() {
	
	// Create array
	var items = Object.keys(configStatusDict).map(function(key) {
		return [key, configStatusDict[key]];
	});
	
	// Build labels and series
	let chartLabels = [];
	let chartSeries = [];
	let chartColor = [];
	document.getElementById('config-footer').innerHTML = '';
	for (i = 0; i < items.length; i++) {
		chartLabels.push(items[i][0]);
		chartSeries.push(items[i][1].length);
		chartColor.push(colorArray[i]);
		document.getElementById('config-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + items[i][0] + ': <strong>'+items[i][1].length +'</strong></li>');
	}
	
	var canvasFW = document.getElementById("config-chart");
	var ctxFW = canvasFW.getContext("2d");
	if (configChart) configChart.destroy();
	
	configChart = new Chart(ctxFW, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Config Status",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false
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
			var val = configChart.data.labels[dataIndex]
			var selectedDevices = [];
			selectedDevices = configStatusDict[val];
			document.getElementById('selected-title').innerHTML = 'APs with ' + val + ' config';
			
			loadSelectedDevices(selectedDevices);
		}
	  },
	});
}

function getAuditTrail(destinationName, offset) {
	
	// filter the data for the last 7 days
	let toTime = new Date().getTime();
	let fromTime = new Date().getTime();
	fromTime = Math.floor(toTime - 604800000);
	
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-services/v1/audits?start-at=' + fromTime + '&end-at=' + toTime + '&filter=destinationName%20eq%20%27' + destinationName + '%27&limit=1000&offset='+offset,
		access_token: localStorage.getItem('access_token'),
	}).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 503) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getAuditTrail, apiWaitDelay, destinationName, offset);
		} else if (result !== 200) {
			showNotification('ca-ap-icon3', 'Failed to download audit trail for '+ destinationName, 'bottom', 'center', 'warning');
		} else {
			var response = safeParseCommandResponseBody(commandResults, 'audit trail for ' + destinationName);
			if (!response) {
				showNotification('ca-ap-icon3', 'Failed to parse audit trail for '+ destinationName, 'bottom', 'center', 'warning');
				return;
			}
			//console.log(response)
			offset++;
			/*
			if (apDetailsCounter < apList.length) {
				var apProgress = (apDetailsCounter / apList.length) * 100;
				apNotification.update({ progress: apProgress });
			}  else {
				if (apNotification) apNotification.update({ progress: 100 });
				saveDataToDB('monitoring_aps_details', JSON.stringify(apDetails));
				localStorage.setItem('monitoring_ap_update', +new Date());
				if (apNotification) apNotification.close();
				processAPs();
			}*/
			
		}
		
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Negotiated Power Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadPowerChart() {
	
	// Create array
	var items = Object.keys(negotiatedPower).map(function(key) {
		return [key, negotiatedPower[key]];
	});
	
	// Build labels and series
	let chartLabels = [];
	let chartSeries = [];
	let chartColor = [];
	document.getElementById('power-footer').innerHTML = '';
	for (i = 0; i < items.length; i++) {
		chartLabels.push(items[i][0]);
		chartSeries.push(items[i][1].length);
		chartColor.push(colorArray[i]);
		document.getElementById('power-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + items[i][0] + ': <strong>'+items[i][1].length +'</strong></li>');
	}
	
	var canvasFW = document.getElementById("power-chart");
	var ctxFW = canvasFW.getContext("2d");
	if (powerChart) powerChart.destroy();
	
	powerChart = new Chart(ctxFW, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Negotiated Power",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false
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
			var val = powerChart.data.labels[dataIndex]
			var selectedDevices = [];
			selectedDevices = negotiatedPower[val];
			document.getElementById('selected-title').innerHTML = 'APs using ' + val + ' config';
			
			loadSelectedDevices(selectedDevices);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Flex Radio Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadFlexChart() {
	
	// Create array
	var items = Object.keys(flexRadios).map(function(key) {
		return [key, flexRadios[key]];
	});
	
	// Build labels and series
	let chartLabels = [];
	let chartSeries = [];
	let chartColor = [];
	document.getElementById('flex-footer').innerHTML = '';
	for (i = 0; i < items.length; i++) {
		chartLabels.push(items[i][0]);
		chartSeries.push(items[i][1].length);
		chartColor.push(colorArray[i]);
		document.getElementById('flex-footer').insertAdjacentHTML('beforeend', '<li><i class="fa-solid fa-circle ' + textColorArray[i] + '"></i> ' + items[i][0] + ': <strong>'+items[i][1].length +'</strong></li>');
	}
	
	var canvasFW = document.getElementById("flex-chart");
	var ctxFW = canvasFW.getContext("2d");
	if (flexChart) flexChart.destroy();
	
	flexChart = new Chart(ctxFW, {
	  type: "doughnut",
	  data: {
		labels: chartLabels,
		datasets: [{
		  label: "Flex Radio Mode",
		  weight: 9,
		  cutout: 100,
		  tension: 0.9,
		  pointRadius: 2,
		  borderWidth: 2,
		  backgroundColor: chartColor,
		  data: chartSeries,
		  fill: false
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
			var val = flexChart.data.labels[dataIndex]
			var selectedDevices = [];
			selectedDevices = flexRadios[val];
			document.getElementById('selected-title').innerHTML = 'APs using ' + val + ' config';
			
			loadSelectedDevices(selectedDevices);
		}
	  },
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Throughput Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function toGigabytes(value, units) {
  const conversions = {
	'Bytes':     value / 1024 ** 3,
	'KB':        value / 1024 ** 2,
	'MB':        value / 1024,
	'GB':        value,
	'TB':        value * 1024,
  };

  if (!(units in conversions)) {
	throw new Error(`Unknown unit: ${units}`);
  }

  return conversions[units];
}

function loadThroughputChart() {
	// Build labels and series
	let labels = [];
	let series = [];
	apThroughput.forEach(function(item) {
		if (item[0] !== '') {
			labels.push(item['deviceName']);
			series.push(parseFloat(toGigabytes(item['totalValue'], item['units'])).toFixed(2));
		}
	});
	
	let canvasModel = document.getElementById("throughput-chart");
	let ctxModel = canvasModel.getContext("2d");
	if (throughputChart) throughputChart.destroy();
	
	throughputChart = new Chart(ctxModel, {
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
}
