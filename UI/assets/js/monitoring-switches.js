/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var switchNotification;
var switchDetails;
var switchDetailsCounter;
var switchList;
var filteredDeviceList;

var upSwitches = [];
var downSwitches = [];
var highMemory = [];
var highCPU = [];
var highPOE = [];
var switchModels = {};
var switchFirmware = {};
var deviceReboot = {};
var configStatusDict = {};

const maxModelLimit = 11;
const maxSwitchLimit = 10;
const maxFirmwareLimit = 5;
const maxRebootLimit = 5;

var firmwareChart;
var modelChart;
var configChart;
var rebootChart;

var swThroughput;
var throughputChart;


function refreshSwitchData() {
	localStorage.removeItem('monitoring_switch_update')
	getSwitchDeviceData(1);
}

function loadCurrentPageSwitch() {
	loadDataFromDB('monitoring_switch_details')
}

function loadSavedData(indexKey, data) {
	if (indexKey === 'monitoring_switch_details') {
		switchDetails = JSON.parse(data);
		switchList = getSwitches();
		if (switchDetails && localStorage.getItem('monitoring_switch_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_switch_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getSwitchDetails();
				});
			} else {
				processStats();
			}
		} else {
			authenticateWithCentral().then(function() {
				getSwitchDetails();
			});
		}
	}
}

function processStats() {
	var updateDate = new Date(parseInt(localStorage.getItem('monitoring_switch_update')));
	if (document.getElementById('lastUpdateDate')) document.getElementById('lastUpdateDate').innerHTML = moment(updateDate).format("Do MMMM YYYY, h:mm:ss a");
	
	getHighThroughput();
	
	let siteChoices = getSiteSelector();
	let selectedSite = siteChoices.getValue(true);
	filteredDeviceList = [];
	
	upSwitches = [];
	downSwitches = [];
	radioCounter = 0;
	bssCounter = 0;
	switchModels = {};
	switchFirmware = {};
	deviceReboot = {};
	configStatusDict = {};
	
	highMemory = [];
	highCPU = [];
	highPOE = [];
	
	$('#switch-table')
	.DataTable().clear();
	
	switchList.forEach(function(device) {
		
		if (device.siteId === selectedSite || selectedSite === '_all')  {
			
			// Add the Switch to the switch-table
			loadSwitchUI(device);
			
			let currentDeviceDetails = switchDetails[device['serialNumber']];
			var deviceHealth = findDeviceInConfigHealth(device['serialNumber']);
			if (!currentDeviceDetails['errorCode']) {
				filteredDeviceList.push(currentDeviceDetails);
				
				//console.log(device)
				//console.log(currentDeviceDetails)
				//console.log(deviceHealth)
				if (switchModels[device.model]) {
					var switchArray = switchModels[device.model];
					switchArray.push(device);
					switchModels[device.model] = switchArray;
				} else {
					var switchArray = [];
					switchArray.push(device);
					switchModels[device.model] = switchArray;
				}
				
				if (switchFirmware[device.firmwareVersion]) {
					var switchArray = switchFirmware[device.firmwareVersion];
					switchArray.push(device);
					switchFirmware[device.firmwareVersion] = switchArray;
				} else {
					var switchArray = [];
					switchArray.push(device);
					switchFirmware[device.firmwareVersion] = switchArray;
				}
				
				if (device.status.toUpperCase() === 'ONLINE') {
					upSwitches.push(device);
					
					if (currentDeviceDetails) {
						let rebootReason = currentDeviceDetails['lastRestartReason'];
						if (!rebootReason) rebootReason = "Unknown";
						if (rebootReason.includes('_')) rebootReason = titleCase(noUnderscore(rebootReason))
						if (deviceReboot[rebootReason]) {
							let deviceArray = deviceReboot[rebootReason];
							deviceArray.push(device);
							deviceReboot[rebootReason] = deviceArray;
						} else {
							let deviceArray = [];
							deviceArray.push(device);
							deviceReboot[rebootReason] = deviceArray;
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
					
				} else {
					downSwitches.push(device);
					
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
				
				if (currentDeviceDetails && currentDeviceDetails['switchTrends'] && currentDeviceDetails['switchTrends'].length > 0) {
					let memoryUtilization = currentDeviceDetails['switchTrends'][0]['memoryUtilization'];
					if (memoryUtilization > 75) {
						highMemory.push(device);
					}
					
					let cpuUtilization = currentDeviceDetails['switchTrends'][0]['cpuUtilization'];
					if (cpuUtilization > 50) {
						highCPU.push(device);
					}
					
					let poeConsumption = currentDeviceDetails['switchTrends'][0]['poeConsumption'];
					let poeAvailable = currentDeviceDetails['switchTrends'][0]['poeAvailable'];
					if (poeConsumption/poeAvailable*100 > 90) {
						highPOE.push(device);
					}
				}
			}
		}
		
	});
	
	if (document.getElementById('up_count')) document.getElementById('up_count').innerHTML = '' + upSwitches.length + '';
	if (document.getElementById('down_count')) document.getElementById('down_count').innerHTML = '' + downSwitches.length + '';
	
	if (document.getElementById('mem_count')) {
		document.getElementById('mem_count').innerHTML = highMemory.length;
		if (highMemory.length == 0) {
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
		document.getElementById('cpu_count').innerHTML = highCPU.length;
		if (highCPU.length == 0) {
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
	
	if (document.getElementById('poe_count')) {
		document.getElementById('poe_count').innerHTML = highPOE.length;
		if (highPOE.length == 0) {
			document.getElementById('poe_icon')?.classList.add('bg-gradient-success');
			document.getElementById('poe_icon')?.classList.remove('bg-gradient-warning');
			document.getElementById('poe_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('poe_icon')?.classList.remove('bg-gradient-info');
		} else {
			document.getElementById('poe_icon')?.classList.remove('bg-gradient-success');
			document.getElementById('poe_icon')?.classList.add('bg-gradient-warning');
			document.getElementById('poe_icon')?.classList.remove('bg-gradient-danger');
			document.getElementById('poe_icon')?.classList.remove('bg-gradient-info');
		}
	}
	
	
	// Force reload of table data
	$('#switch-table')
		.DataTable()
		.rows()
		.draw();
		
	loadUptimeTable();
	loadCPUTable();
	loadMemoryTable();
	loadPOETable();
	loadFirmwareChart();
	loadConfigChart();
	loadModelChart();
	loadRebootChart();
}

function getSwitchDetails() {
	switchDetails = {};
	switchDetailsCounter = 0;
	if (switchNotification) switchNotification.close();
	switchNotification = showProgressNotification('ca-switch-stack3', 'Obtaining Switch Details...', 'bottom', 'center', 'info');
	
	for(var i=0;i<switchList.length;i++) {
		setTimeout(updateSwitchDetails, apiDelay*i, switchList[i]);
	}
}

function updateSwitchDetails(currentSwitch) {
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-monitoring/v1/switches/' + currentSwitch['serialNumber'],
		access_token: localStorage.getItem('access_token'),
	}).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(updateSwitchDetails, apiWaitDelay, currentSwitch);
		} else if (result !== 200) {
			if (switchNotification) {
				switchNotification.update({ type: 'danger', message: 'Failed to download Switch details for '+ currentSwitch['serialNumber'] });
				setTimeout(switchNotification.close, 2000);
			}
			switchDetailsCounter++;
		} else {
			var response = safeParseCommandResponseBody(commandResults, 'Switch details for ' + currentSwitch['serialNumber']);
			if (response) {
				switchDetails[currentSwitch['serialNumber']] = response;
			} else if (switchNotification) {
				switchNotification.update({ type: 'danger', message: 'Failed to parse Switch details for '+ currentSwitch['serialNumber'] });
			}
			switchDetailsCounter++;
			
			if (switchDetailsCounter < switchList.length) {
				var detailProgress = (switchDetailsCounter / switchList.length) * 100;
				switchNotification.update({ progress: detailProgress });
			}  else {
				if (switchNotification) switchNotification.update({ progress: 100 });
				saveDataToDB('monitoring_switch_details', JSON.stringify(switchDetails));
				localStorage.setItem('monitoring_switch_update', +new Date());
				if (switchNotification) switchNotification.close();
				processStats();
			}
		}
		
	});
}

function getHighThroughput() {
	let siteChoices = getSiteSelector();
	let selectedSite = siteChoices.getValue(true);
	selectedFilter = ''
	if (selectedSite !== '_all') selectedFilter = 'site-id='+selectedSite+'&'
	
	let now = DateTime.now();
	let startAt = now.minus({ days: 1 });
	
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-monitoring/v1/switches/topn-interface-trends?'+selectedFilter+'filter=timestamp%20gt%20'+ encodeURIComponent(startAt.toUTC().toISO()),
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
			var response = safeParseCommandResponseBody(commandResults, 'Switch throughput details');
			if (!response) {
				showNotification('ca-ap-icon3', 'Failed to parse switch bandwidth details', 'bottom', 'center', 'warning');
				return;
			}
			swThroughput = [];
			if (response.response) swThroughput = response.response.items;
			loadThroughputChart();
		}
		
	});
}

function filterDevices(status) {
	var table = $('#switch-table').DataTable();
	table.search(status).draw();
	
	var myModal = new bootstrap.Modal(document.getElementById('SwitchModal'))
	myModal.show();
}

function loadSelectedDevices(selectedSwitches) {
	$('#selected-device-table')
		.DataTable().clear();
		
	var table = $('#selected-device-table').DataTable();
	
	selectedSwitches.forEach(function(device) {
		
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
		if (device['uptimeInMillis'] > 0) {
			var uptime = moment.duration(device['uptimeInMillis']);
			uptimeString = uptime.humanize();
		} else if (device['lastSeenAt']){
			//var uptime = moment.duration(ap['lastSeenAt'] * 1000);
			//uptimeString = uptime.humanize();
		}
		
		// Make Name as a link to Central
		var name = encodeURI(device['deviceName']);
		var apiURL = localStorage.getItem('base_url');
		var centralBaseURL = centralURLs[apiURL];
		var centralURL = centralBaseURL + '/gravity/monitoring/switch/dashboard?contextType=switch&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
		
		// Get Site
		var deviceSite = getSiteForId(device['siteId'])
		var deviceSiteURL = '';
		if (deviceSite) {
			deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&timelineFrame=Hour';
		}
		// Add row to table
		table.row.add([device['Conductor'] ? '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + ' (VC)</strong></a>' : '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span title="' + escapeHtml(device['status']) + '"></span>' + status, escapeHtml(ip_address), escapeHtml(device['model']), escapeHtml(device['serialNumber']), escapeHtml(device['macAddress']), escapeHtml(device['firmwareVersion']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '', '<span title="' + escapeHtml(device['uptimeInMillis']) + '"></span>' + uptimeString]);
	
		initializeTooltips(table.table().body());
	});
	$('#selected-device-table')
		.DataTable()
		.rows()
		.draw();
		
	var myModal = new bootstrap.Modal(document.getElementById('SelectedDeviceModal'))
	myModal.show();
}

function showDevices(showMode) {
	
	var selectedDevices = [];
	if (showMode === 'Memory') {
		selectedDevices = highMemory;
		document.getElementById('selected-title').innerHTML = 'Switches with High Memory Utilization';
	} else if (showMode === 'CPU') {
		selectedDevices = highCPU;
		document.getElementById('selected-title').innerHTML = 'Switches with High CPU Utilization';
	} else if (showMode === 'POE') {
		selectedDevices = highPOE;
		document.getElementById('selected-title').innerHTML = 'Switches with High POE Usage > 90%';
	}

	loadSelectedDevices(selectedDevices);
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Model Bar Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadModelChart() {
	
	// Create Model array
	var items = Object.keys(switchModels).map(function(key) {
		return [key, switchModels[key]];
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
	var ctxModel = canvasModel.getContext("2d");
	if (modelChart) modelChart.destroy();
	
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
	  
	  var selectedSwitches = [];
	  var val = modelChart.data.labels[res[0].index];
	  selectedSwitches = switchModels[val];
	  document.getElementById('selected-title').innerHTML = val + ' Access Points';
	  
	  loadSelectedDevices(selectedSwitches);
	};
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Uptime Table
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadUptimeTable() {
	
	busyDevices = filteredDeviceList;
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		return first.uptimeInMillis - second.uptimeInMillis;
	});
	
	$('#uptime-table')
		.DataTable().clear();
	
	var table = $('#uptime-table').DataTable();
	var uptimeCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		if (busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE') {
			if (uptimeCounter < maxSwitchLimit) {
				var device = busyDevices[i];
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/switch/dashboard?contextType=switch&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var uptimeString = '-';
				if (device['uptimeInMillis'] > 0) {
					var uptime = moment.duration(device['uptimeInMillis']);
					uptimeString = uptime.humanize();
				} else if (device['lastSeenAt']){
					//var uptime = moment.duration(ap['lastSeenAt'] * 1000);
					//uptimeString = uptime.humanize();
				}
				
				var reason = 'Unknown'
				reason = rebootReasons[device['lastRestartReason']];
				if (!reason) reason = device['lastRestartReason'];
				
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-bs-toggle="tooltip" data-bs-placement="top" title="Troubleshoot AP" onclick="getswitchDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
	
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
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	CPU Table
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadCPUTable() {
	
	let busyDevices = filteredDeviceList;
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		if (second['switchTrends'][0] && first['switchTrends'][0])
			return second['switchTrends'][0]['cpuUtilization'] - first['switchTrends'][0]['cpuUtilization'];
		else return 0;
	});
	
	$('#cpu-table')
		.DataTable().clear();
	
	var table = $('#cpu-table').DataTable();
	var memoryCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		if (busyDevices[i] && busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE') {
			if (memoryCounter < maxSwitchLimit) {
				var device = busyDevices[i];
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/switch/dashboard?contextType=switch&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-toggle="tooltip" data-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
				// Add row to table
				
				let util = device['switchTrends'][0]['cpuUtilization'];
				if (util > 75) util = '<span class="text-danger">'+util+'%</span>';
				else util = util+'%'
				table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', util]);
				memoryCounter++;
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
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		if (second['switchTrends'][0] && first['switchTrends'][0])
			return second['switchTrends'][0]['memoryUtilization'] - first['switchTrends'][0]['memoryUtilization'];
		else return 0;
	});
	
	$('#memory-table')
		.DataTable().clear();
	
	var table = $('#memory-table').DataTable();
	var memoryCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		if (busyDevices[i] && busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE') {
			if (memoryCounter < maxSwitchLimit) {
				var device = busyDevices[i];
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/switch/dashboard?contextType=switch&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-toggle="tooltip" data-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
				// Add row to table
				let util = device['switchTrends'][0]['memoryUtilization'];
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
	POE Table
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadPOETable() {
	
	let busyDevices = filteredDeviceList;
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		if (second['switchTrends'][0] && first['switchTrends'][0])
			return second['switchTrends'][0]['poeConsumption'] - first['switchTrends'][0]['poeConsumption'];
		else return 0;
	});
	
	$('#poe-table')
		.DataTable().clear();
	
	var table = $('#poe-table').DataTable();
	var poeCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		var device = busyDevices[i];
		if (busyDevices[i] && busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE' && device['switchTrends'][0]['poeAvailable'] != 0) {
			if (poeCounter < maxSwitchLimit) {
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/switch/dashboard?contextType=switch&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-toggle="tooltip" data-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
				// Add row to table
				let percentage = Math.round(device['switchTrends'][0]['poeConsumption']/device['switchTrends'][0]['poeAvailable']*100);
				table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', Math.round(device['switchTrends'][0]['poeConsumption']) + 'W <span class="small">(' + percentage + '%)</span>']);
				poeCounter++;
			} else break;
		}
	}
	$('#poe-table')
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
	var items = Object.keys(switchFirmware).map(function(key) {
		return [key, switchFirmware[key]];
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
			var selectedSwitches = [];
			selectedSwitches = switchFirmware[val];
			document.getElementById('selected-title').innerHTML = 'Switches runnning ' + val;
			
			loadSelectedDevices(selectedSwitches);
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
		  label: "Reboot Reason",
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
			document.getElementById('selected-title').innerHTML = 'Switch Reboot reason: ' + val;
			
			loadSelectedDevices(selectedDevices);
		}
	  },
	});
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
			var selectedSwitches = [];
			selectedSwitches = configStatusDict[val];
			document.getElementById('selected-title').innerHTML = 'Switches with ' + val + ' config';
			
			loadSelectedDevices(selectedSwitches);
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
	let series1 = [];
	let series2 = [];
	swThroughput.forEach(function(item) {
		if (item[0] !== '') {
			labels.push(item['name']);
			series1.push(parseFloat(toGigabytes(item['rxBytes'], 'Bytes')).toFixed(2));
			series2.push(parseFloat(toGigabytes(item['txBytes'], 'Bytes')).toFixed(2));
		}
	});
	
	// Create a new array with only the first "x" items
	labels = labels.slice(0, maxSwitchLimit);
	series1 = series1.slice(0, maxSwitchLimit);
	series2 = series2.slice(0, maxSwitchLimit);
	
	
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
		  borderRadius: 0,
		  backgroundColor: '#8392AB',
		  data: series1,
		  fill: false,
		  maxBarThickness: 35
		},
		{
		weight: 5,
		borderWidth: 0,
		borderRadius: 4,
		backgroundColor: '#344767',
		data: series2,
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
			stacked: true,
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
			stacked: true,
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
