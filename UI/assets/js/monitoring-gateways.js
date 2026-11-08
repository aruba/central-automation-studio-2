/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var gwNotification;
var gwDetails;
var gwDetailsCounter;
var gwList;
var filteredDeviceList;

var upGWs = [];
var downGWs = [];
var highMemory = [];
var highCPU = [];
var gwModels = {};
var gwFirmware = {};
var gwClusters = {};
var deviceReboot = {};
var configStatusDict = {};

const maxModelLimit = 11;
const maxUptimeLimit = 10;
const maxFirmwareLimit = 5;
const maxRebootLimit = 5;

var firmwareChart;
var modelChart;
var configChart;
var rebootChart;


function refreshGatewayData() {
	localStorage.removeItem('monitoring_gateway_update')
	getGatewayDeviceData(1);
}

function loadCurrentPageAP() {
	loadDataFromDB('monitoring_gateways_details');
}

function loadSavedData(indexKey, data) {
	if (indexKey === 'monitoring_gateways_details') {
		gwDetails = JSON.parse(data);
		gwList = getGateways();
		if (gwDetails && localStorage.getItem('monitoring_gateway_update')) {
			var lastRefresh = new Date(parseInt(localStorage.getItem('monitoring_gateway_update')));
			var now = new Date();
			var diffTime = Math.abs(now - lastRefresh);
			var diffMinutes = Math.ceil(diffTime / (1000 * 60));
			if (diffMinutes > 30) {
				authenticateWithCentral().then(function() {
					getGatewayDetails();
				});
			} else {
				processStats();
			}
		} else {
			authenticateWithCentral().then(function() {
				getGatewayDetails();
			});
		}
	}
}

function processStats() {
	var updateDate = new Date(parseInt(localStorage.getItem('monitoring_gateway_update')));
	if (document.getElementById('lastUpdateDate')) document.getElementById('lastUpdateDate').innerHTML = moment(updateDate).format("Do MMMM YYYY, h:mm:ss a");
	
	let siteChoices = getSiteSelector();
	let selectedSite = siteChoices.getValue(true);
	filteredDeviceList = [];
	
	upGWs = [];
	downGWs = [];
	radioCounter = 0;
	bssCounter = 0;
	gwModels = {};
	gwFirmware = {};
	gwClusters = {};
	deviceReboot = {};
	configStatusDict = {};
	highMemory = [];
	highCPU = [];
	
	
	$('#gateway-table')
	.DataTable().clear();
	
	gwList.forEach(function(device) {
		
		if (device.siteId === selectedSite || selectedSite === '_all')  {
			
			// Add the GW to the gateway-table
			loadGatewayUI(device);
			let currentDeviceDetails = gwDetails[device['serialNumber']];
			var deviceHealth = findDeviceInConfigHealth(device['serialNumber']);
			filteredDeviceList.push(currentDeviceDetails);
			
			//console.log(device)
			//console.log(currentDeviceDetails)
			//console.log(deviceHealth)
			let model = device.model.replace(/^A/, '')
			if (gwModels[model]) {
				let gwArray = gwModels[model];
				gwArray.push(device);
				gwModels[model] = gwArray;
			} else {
				let gwArray = [];
				gwArray.push(device);
				gwModels[model] = gwArray;
			}
			
			if (gwFirmware[device.firmwareVersion]) {
				let gwArray = gwFirmware[device.firmwareVersion];
				gwArray.push(device);
				gwFirmware[device.firmwareVersion] = gwArray;
			} else {
				let gwArray = [];
				gwArray.push(device);
				gwFirmware[device.firmwareVersion] = gwArray;
			}
			
			if (device.status.toUpperCase() === 'ONLINE') {
				upGWs.push(device);
				if (currentDeviceDetails) {
					let rebootReason = currentDeviceDetails['rebootReason'];
					if (!rebootReason) rebootReason = "Unknown";
					if (rebootReason.includes('_')) rebootReason = titleCase(noUnderscore(rebootReason))
					if (deviceReboot[rebootReason]) {
						let deviceArray = deviceReboot[rebootReason];
						deviceArray.push(this);
						deviceReboot[rebootReason] = deviceArray;
					} else {
						let deviceArray = [];
						deviceArray.push(this);
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
				downGWs.push(this);
				
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
			
			if (gwClusters[device.clusterName]) {
				let clusterArray = gwClusters[device.clusterName];
				clusterArray.push(device);
				gwClusters[device.clusterName] = clusterArray;
			} else {
				let clusterArray = [];
				clusterArray.push(device);
				gwClusters[device.clusterName] = clusterArray;
			}
			
			if (currentDeviceDetails) {
				let memoryUtilization = currentDeviceDetails['memoryUtilization'];
				if (memoryUtilization > 75) {
					highMemory.push(device);
				}
				
				let cpuUtilization = currentDeviceDetails['cpuUtilization'];
				if (cpuUtilization > 50) {
					highCPU.push(device);
				}
			}
			
		}
	});
	if (document.getElementById('up_count')) document.getElementById('up_count').innerHTML = '' + upGWs.length + '';
	if (document.getElementById('down_count')) document.getElementById('down_count').innerHTML = '' + downGWs.length + '';
	
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
	
	var clusterList = Object.keys(gwClusters).map(function(key) {
		return [key, gwClusters[key]];
	});
	if (document.getElementById('cluster_count')) document.getElementById('cluster_count').innerHTML = '' + clusterList.length + '';
	
	// Force reload of table data
	$('#gateway-table')
		.DataTable()
		.rows()
		.draw();
		
	loadUptimeTable();
	loadCPUTable();	
	loadMemoryTable();	
	loadFirmwareChart();
	loadConfigChart();
	loadModelChart();
	loadRebootChart();
}

function getGatewayDetails() {
	gwDetails = {};
	gwDetailsCounter = 0;
	if (gwNotification) gwNotification.close();
	gwNotification = showProgressNotification('ca-gateway3', 'Obtaining Gateway Details...', 'bottom', 'center', 'info');
	
	for(var i=0;i<gwList.length;i++) {
		setTimeout(updateGatewayDetails, apiDelay*i, gwList[i]);
	}
}

function updateGatewayDetails(currentGateway) {
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-monitoring/v1/gateways/' + currentGateway['serialNumber'],
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
			setTimeout(updateGatewayDetails, apiWaitDelay, currentGateway);
		} else if (result !== 200) {
			if (gwNotification) {
				gwNotification.update({ type: 'danger', message: 'Failed to download Gateway details for '+ currentGateway['serialNumber'] });
				setTimeout(gwNotification.close, 2000);
			}
			gwDetailsCounter++;
		} else {
			var response = safeParseCommandResponseBody(commandResults, 'Gateway details for ' + currentGateway['serialNumber']);
			if (response) {
				gwDetails[currentGateway['serialNumber']] = response;
			} else if (gwNotification) {
				gwNotification.update({ type: 'danger', message: 'Failed to parse Gateway details for '+ currentGateway['serialNumber'] });
			}
			gwDetailsCounter++;
			if (gwDetailsCounter < gwList.length) {
				var deviceProgress = (gwDetailsCounter / gwList.length) * 100;
				gwNotification.update({ progress: deviceProgress });
			}  else {
				if (gwNotification) gwNotification.update({ progress: 100 });
				saveDataToDB('monitoring_gateways_details', JSON.stringify(gwDetails));
				localStorage.setItem('monitoring_gateway_update', +new Date());
				if (gwNotification) gwNotification.close();
				processStats();
			}
		}
		
	});
}

function filterDevices(status) {
	var table = $('#gateway-table').DataTable();
	table.search(status).draw();
	
	var myModal = new bootstrap.Modal(document.getElementById('GatewayModal'))
	myModal.show();
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
		var ip_address = device['ipAddress'];
		if (!ip_address) ip_address = device['ipv4'];
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
		var centralURL = centralBaseURL + '/gravity/monitoring/gateway/dashboard?contextType=gateway&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
		
		// Get Site
		var deviceSite = getSiteForId(device['siteId'])
		var deviceSiteURL = '';
		if (deviceSite) {
			deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun';
		}
		// Add row to table
		table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', '<span title="' + escapeHtml(device['status']) + '"></span>' + status, escapeHtml(ip_address), escapeHtml(device['model']), escapeHtml(device['serialNumber']), escapeHtml(device['macAddress']), escapeHtml(device['firmwareVersion']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '', '<span title="' + escapeHtml(device['uptimeInMillis']) + '"></span>' + uptimeString]);
	
		initializeTooltips(table.table().body());
	});
	$('#selected-device-table')
		.DataTable()
		.rows()
		.draw();
		
	var myModal = new bootstrap.Modal(document.getElementById('SelectedDeviceModal'))
	myModal.show();
}

function showClusters() {
	$('#cluster-table').DataTable().clear();
		
	var table = $('#cluster-table').DataTable();
	
	var clusterList = Object.keys(gwClusters).map(function(key) {
		return [key, gwClusters[key]];
	});
	clusterList.forEach(function(clusterEntry) {
		let cluster = clusterEntry[1];
		let device = cluster[0];
		console.log(device)
		
		var name = encodeURI(device['deviceName']);
		var apiURL = localStorage.getItem('base_url');
		var centralBaseURL = centralURLs[apiURL];
		
		let status = '<i class="fa-solid fa-circle text-success"></i>';
		let leader = '';
		let members = '';
		let countUp = 0;
		let countDown = 0;
		for (let i=0;i<cluster.length;i++) {
			if (cluster[i]['status'].toUpperCase() !== 'ONLINE') {
				status = '<i class="fa-solid fa-diamond text-danger"></i>';
				countDown++;
			} else {
				countUp++;
			}
			let centralURL = centralBaseURL + '/gravity/monitoring/gateway/dashboard?contextType=gateway&selectedView=dashboard&siteId=' + cluster[i]['siteId'] + '&selectedPlanet=sun&deviceId=' + cluster[i]['serialNumber'];
			if (cluster[i]['role'].includes('Leader') || cluster[i]['role'].includes('Isoleader')) leader = '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(cluster[i]['deviceName']) + '</strong></a>';
			else if (cluster[i]['role'] === 'Member') members += '<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(cluster[i]['deviceName']) + '</strong></a><br>';
		}
		members = members.replace(new RegExp('<br>' + '$'), '');
		
		// Make Name as a link to Central for Cluster
		let centralURL = centralBaseURL + '/gravity/monitoring/gateway-cluster/dashboard?contextType=gateway-cluster&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber']+'&gatewayClusterName='+clusterEntry[0];

		// Get Site
		var deviceSite = getSiteForId(device['siteId'])
		var deviceSiteURL = '';
		if (deviceSite) {
			deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun';
		}
		// Add row to table
		table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(clusterEntry[0]) + '</strong></a>', '<span data-bs-toggle="tooltip" data-bs-placement="top" data-bs-html="true" title="Online: ' + countUp + '<br/>Offline: ' + countDown + '"></span>' + status, leader, members, escapeHtml(device['deviceFunction']), deviceSite ? '<a href="' + deviceSiteURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(deviceSite['siteName']) + '</strong></a>' : '']);
	
		initializeTooltips(table.table().body());
	});
	$('#cluster-table')
		.DataTable()
		.rows()
		.draw();
		
	var myModal = new bootstrap.Modal(document.getElementById('ClusterModal'))
	myModal.show();
}

function showDevices(showMode) {
	
	var selectedDevices = [];
	if (showMode === 'Memory') {
		selectedDevices = highMemory;
		document.getElementById('selected-title').innerHTML = 'Gateways with High Memory Utilization';
	} else if (showMode === 'CPU') {
		selectedDevices = highCPU;
		document.getElementById('selected-title').innerHTML = 'Gateways with High CPU Utilization';
	}

	loadSelectedDevices(selectedDevices);
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Model Bar Chart
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadModelChart() {
	
	// Create AP Model array
	var items = Object.keys(gwModels).map(function(key) {
		return [key, gwModels[key]];
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
	  selectedDevices = gwModels[val];
	  document.getElementById('selected-title').innerHTML = val + ' Gateways';
	  
	  loadSelectedDevices(selectedDevices);
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
			if (uptimeCounter < maxUptimeLimit) {
				var device = busyDevices[i];
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/gateway/dashboard?contextType=gateway&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var uptimeString = '-';
				if (device['uptimeInMillis'] > 0) {
					var uptime = moment.duration(device['uptimeInMillis']);
					uptimeString = uptime.humanize();
				} else if (device['lastSeenAt']){
					//var uptime = moment.duration(ap['lastSeenAt'] * 1000);
					//uptimeString = uptime.humanize();
				}
				
				var reason = 'Unknown'
				reason = rebootReasons[device['rebootReason']];
				if (!reason) reason = device['rebootReason'];
				
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-bs-toggle="tooltip" data-bs-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
	
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
	
	busyDevices = filteredDeviceList;
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		return second.cpuUtilization - first.cpuUtilization;
	});
	
	$('#cpu-table')
		.DataTable().clear();
	
	var table = $('#cpu-table').DataTable();
	var uptimeCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		if (busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE') {
			if (uptimeCounter < maxUptimeLimit) {
				var device = busyDevices[i];
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/gateway/dashboard?contextType=gateway&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-bs-toggle="tooltip" data-bs-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
	
				// Add row to table
				let util = device.cpuUtilization;
				if (util > 75) util = '<span class="text-danger">'+util+'%</span>';
				else util = util+'%'
				table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', util]);
				uptimeCounter++;
			} else break;
		}
	}
	$('#cpu-table')
		.DataTable()
		.rows()
		.draw();
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Memory Table
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadMemoryTable() {
	
	busyDevices = filteredDeviceList;
	// Sort the array based on the second element
	busyDevices.sort(function(first, second) {
		return second.memoryUtilization - first.memoryUtilization;
	});
	
	$('#memory-table')
		.DataTable().clear();
	
	var table = $('#memory-table').DataTable();
	var uptimeCounter = 0;
	for (i = 0; i < busyDevices.length; i++) {
		if (busyDevices[i]['status'] && busyDevices[i]['status'].toUpperCase() === 'ONLINE') {
			if (uptimeCounter < maxUptimeLimit) {
				var device = busyDevices[i];
				
				// Make Name as a link to Central
				var name = encodeURI(device['deviceName']);
				var apiURL = localStorage.getItem('base_url');
				var centralBaseURL = centralURLs[apiURL];
				var centralURL = centralBaseURL + '/gravity/monitoring/gateway/dashboard?contextType=gateway&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
				
				var actionBtns = '';//'<a class="btn btn-link btn-warning" data-bs-toggle="tooltip" data-bs-placement="top" title="Troubleshoot AP" onclick="getAPDetails(\'' + busyDevices[i]['serial'] + '\')"><i class="fa-solid fa-screwdriver-wrench"></i></a> ';
	
				// Add row to table
				let util = device.memoryUtilization;
				if (util > 75) util = '<span class="text-danger">'+util+'%</span>';
				else util = util+'%'
				table.row.add(['<a href="' + centralURL + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(device['deviceName']) + '</strong></a>', util]);
				uptimeCounter++;
			} else break;
		}
	}
	$('#memory-table')
		.DataTable()
		.rows()
		.draw();
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Firmware Card
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function loadFirmwareChart() {
	
	// Create AP Model array
	var items = Object.keys(gwFirmware).map(function(key) {
		return [key, gwFirmware[key]];
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
	
	var canvasFW = document.getElementById("firmware-chart");
	var ctxFW = canvasFW.getContext("2d");
	if (firmwareChart) firmwareChart.destroy();
	
	firmwareChart = new Chart(ctxFW, {
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
			selectedDevices = gwFirmware[val];
			document.getElementById('selected-title').innerHTML = 'Gateways runnning ' + val;
			
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
			document.getElementById('selected-title').innerHTML = 'Gateway Reboot reason: ' + val;
			
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
			var selectedDevices = [];
			selectedDevices = configStatusDict[val];
			document.getElementById('selected-title').innerHTML = 'Gateways with ' + val + ' config';
			
			loadSelectedDevices(selectedDevices);
		}
	  },
	});
}



