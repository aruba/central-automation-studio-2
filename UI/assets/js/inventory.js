/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

const InventoryType = { All: 0, Unlicensed: 1, Expiring: 2, Assignment: 3};

var inventoryNotification;
var inventoryPromise;
var inventoryResolve;
var deviceInventory = [];

var unlicensedCount = 0;
var expiringCount = 0;
var noAppCount = 0;
var totalCount = 0;

var deviceDisplay = []; // used to store devices in the unfiltered table (depending on the empty group toggle)

function loadCurrentPageAP() {
	// override on visible page - used as a notification
	//console.log('loadCurrentPageAP')
	loadTable(InventoryType.All);
}

function loadCurrentPageSwitch() {
	// override on visible page - used as a notification
	//console.log('loadCurrentPageSwitch')
	loadTable(InventoryType.All);
}

function loadCurrentPageGateway() {
	// override on visible page - used as a notification
	//console.log('loadCurrentPageGateway')
	loadTable(InventoryType.All);
}

function updateInventory() {
	clearUI();
	authenticateWithCentral().then(function() {
		return Promise.all([updateSubscriptions(0), updateApplications(0)]);
	}).then(function() {
		//console.log('Got required GLP pieces');
		return updateDeviceInventory(0);
	}).then(function() {
		loadTable(InventoryType.All);
		updateUI();

		// Check if we need to get the latest data - or can we just load it from localStorage
		var refreshrate = localStorage.getItem('refresh_rate');
		if (refreshrate === null || refreshrate === "") {
		  refreshrate = "30";
		}

		var loadIntervalID;
		loadMonitoringData(refreshrate);
	});
}

function updateDeviceInventory(offset) {
	if (offset == 0) {
		deviceInventory = [];
		if (inventoryNotification) inventoryNotification.close();
		inventoryNotification = showProgressNotification('ca-stock-2', 'Obtaining device inventory...', 'bottom', 'center', 'info');
		
		inventoryPromise = new Promise(function(resolve) { inventoryResolve = resolve; });
	}
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: glpGlobalURL + '/devices/v1/devices?offset='+offset+'&limit='+glpDeviceLimit,
		access_token: localStorage.getItem('access_token'),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}

		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(updateDeviceInventory, apiWaitDelay, offset);
		} else if (result !== 200) {
			if (inventoryNotification) {
				inventoryNotification.update({ type: 'danger', message: 'Failed to download Device Inventory' });
				setTimeout(inventoryNotification.close, 2000);
			}
			inventoryResolve(); // Resolve the promise on failure
		} else {
			var response = JSON.parse(commandResults.responseBody);
			deviceInventory = deviceInventory.concat(response.items);
			offset += glpDeviceLimit;
			if (offset < response.total) {
				var inventoryProgress = (offset / response.total) * 100;
				inventoryNotification.update({ progress: inventoryProgress });
				updateDeviceInventory(offset);
			} else {
				// Obtained the entire inventory...
				if (inventoryNotification) {
					inventoryNotification.update({ progress: 100, message: 'Device Inventory obtained', type: 'success' });
					setTimeout(inventoryNotification.close, 1000);
				}
				saveDataToDB('inventory_devices', JSON.stringify(deviceInventory));
				inventoryResolve();
				//console.log(deviceInventory)
			}
		}
	});
	return inventoryPromise;
}

function findDeviceInGLPInventory(serial) {
	var foundDevice = deviceInventory ? deviceInventory.find(function(d) {
		return d.serialNumber.toUpperCase() === serial.toUpperCase();
	}) : null;
	return foundDevice || null;
}

function findDeviceInGLPInventoryById(devId) {
	var foundDevice = deviceInventory ? deviceInventory.find(function(d) {
		return d.id.toUpperCase() === devId.toUpperCase();
	}) : null;
	return foundDevice || null;
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	UI Pieces
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadTable(inventoryFilter) {
	var updateDate = new Date(parseInt(localStorage.getItem('inventory_update')));
	if (document.getElementById('lastUpdateDate')) document.getElementById('lastUpdateDate').innerHTML = moment(updateDate).format("Do MMMM YYYY, h:mm:ss a");
	// update inventory-table
	$('#inventory-table')
	.DataTable().clear();
	
	totalCount = 0
	unlicensedCount = 0;
	expiringCount = 0;
	noAppCount = 0;
	
	deviceDisplay = [];
	
	var table = $('#inventory-table').DataTable();		
	var filteredRows = table.rows({ filter: 'applied' });		
	var devices = Array.isArray(deviceInventory) ? deviceInventory : [];
	devices.forEach(function(device) {

		// Determine Subscription info
		let daysRemaining = -1;
		let foundSub;
		let foundSubTier = '-';
		let foundSubString = 'Unlicensed';
		let assignedSubs = device.subscription;
		if (assignedSubs && assignedSubs.length > 0) {
			foundSub = findSubscription(assignedSubs[0]['id']);
			if (foundSub.tier.toLowerCase().includes('foundation')) foundSubTier = 'Foundation';
			else if (foundSub.tier.toLowerCase().includes('advance')) foundSubTier = 'Advanced';
			
			foundSubString = '<span data-bs-toggle="tooltip" data-bs-placement="right" data-html="true" title="'+ foundSub.tier +'">'+foundSubTier+'</span>';
			
			if (foundSub) {
				var today = moment();
				var endDate = moment(foundSub['endTime']);
				if (today.isBefore(endDate)) {
					daysRemaining = endDate.diff(today, 'days');
				}
			}
		}
		
		let foundApp;
		if (device.application) foundApp = findApplication(device.application.id)
		let centralInstance = device.region;
		if (foundApp && foundApp.name.includes('Internal')) centralInstance = centralInstance + ' (Internal)';
		
		let mrtDevice = findDeviceInMonitoring(device.serialNumber);
		let siteName = '-';
		let deviceSiteURL = '-'
		if (mrtDevice) {
			siteName = mrtDevice['siteName'];
			let apiURL = localStorage.getItem('base_url');
			let centralBaseURL = centralURLs[apiURL];
			deviceSiteURL = centralBaseURL + '/gravity/monitoring/site/dashboard?contextType=site&selectedView=dashboard&siteId=' + mrtDevice['siteId'] + '&selectedPlanet=sun';
		}
		
		if ((inventoryFilter == InventoryType.All) || (inventoryFilter == InventoryType.Unlicensed && !device.subscription) || (inventoryFilter == InventoryType.Expiring && daysRemaining > 0 && daysRemaining <= 90) || (inventoryFilter == InventoryType.Assignment && !foundApp)) {
			
			let manufacturedDate = '-';
			if (device['manufacturedDate']) manufacturedDate = DateTime.fromISO(device['manufacturedDate']);
		
			table.row.add([device.deviceType, '<span data-bs-toggle="tooltip" data-bs-placement="top" data-bs-html="true" title="Manufactured: ' + manufacturedDate.toLocaleString() + '"</span><strong>' + device.serialNumber + '</strong>', device.macAddress, device.model, device.partNumber, device.archived?'Archived':'Active', foundSubString, foundSub?foundSub.key:'-', foundApp?centralInstance:'-', mrtDevice ? '<a href="' + deviceSiteURL + '" target="_blank"><strong>' + mrtDevice['siteName'] + '</strong></a>' : '-']);
			
			deviceDisplay.push({type: device.deviceType, serial: device.serialNumber, mac: device.macAddress, manufactured: manufacturedDate.toLocaleString(), model:device.model, part:device.partNumber, state:device.archived?'Archived':'Active', tier:foundSubTier, license: foundSub?foundSub.key:'-', app: foundApp?centralInstance:'-', site:siteName, tags:device.tags});
		}
		
		totalCount++;
		if (foundSubString === 'Unlicensed') unlicensedCount++;
		if (!foundApp) noAppCount++;
		if (foundSub) {
			var today = moment();
			var endDate = moment(foundSub['endTime']);
			if (today.isBefore(endDate) && endDate.diff(today, 'days') <= 90) expiringCount++;
		}
		
	});
	$('#inventory-table')
		.DataTable()
		.rows()
		.draw();
}

function clearUI() {
	document.getElementById('total_count').innerHTML = '0';
	document.getElementById('total_icon').classList.add('bg-gradient-secondary');
	document.getElementById('total_icon').classList.remove('bg-gradient-success');
	document.getElementById('total_icon').classList.remove('bg-gradient-warning');
	document.getElementById('total_icon').classList.remove('bg-gradient-danger');
	document.getElementById('total_icon').classList.remove('bg-gradient-info');
	
	document.getElementById('unlicensed_count').innerHTML = '0';
	document.getElementById('unlicensed_icon').classList.add('bg-gradient-secondary');
	document.getElementById('unlicensed_icon').classList.remove('bg-gradient-danger');
	
	document.getElementById('expiring_count').innerHTML = '0';
	document.getElementById('expiring_icon').classList.add('bg-gradient-secondary');
	document.getElementById('expiring_icon').classList.remove('bg-gradient-warning');
	
	document.getElementById('no_app_count').innerHTML = '0';
	document.getElementById('no_app_icon').classList.add('bg-gradient-secondary');
	document.getElementById('no_app_icon').classList.remove('bg-gradient-info');
}

function updateUI() {
	//document.getElementById('total_count').innerHTML = totalCount;
	if (document.getElementById('total_count')) {
		const countUp = new CountUp('total_count', totalCount);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	if (unlicensedCount > 0) document.getElementById('total_icon').classList.add('bg-gradient-danger');
	else if (expiringCount > 0) document.getElementById('total_icon').classList.add('bg-gradient-warning');
	else if (noAppCount > 0) document.getElementById('total_icon').classList.add('bg-gradient-info');
	else document.getElementById('total_icon').classList.add('bg-gradient-success');
	
	//document.getElementById('unlicensed_count').innerHTML = unlicensedCount;
	if (document.getElementById('unlicensed_count')) {
		const countUp = new CountUp('unlicensed_count', unlicensedCount);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	document.getElementById('unlicensed_icon').classList.remove('bg-gradient-muted');
	document.getElementById('unlicensed_icon').classList.add('bg-gradient-danger');
	
	//document.getElementById('expiring_count').innerHTML = expiringCount;
	if (document.getElementById('expiring_count')) {
		const countUp = new CountUp('expiring_count', expiringCount);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	document.getElementById('expiring_icon').classList.remove('bg-gradient-muted');
	document.getElementById('expiring_icon').classList.add('bg-gradient-warning');
	
	//document.getElementById('no_app_count').innerHTML = noAppCount;
	if (document.getElementById('no_app_count')) {
		const countUp = new CountUp('no_app_count', noAppCount);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	document.getElementById('no_app_icon').classList.add('bg-gradient-info');
	document.getElementById('no_app_icon').classList.remove('bg-gradient-muted');
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Download BSSID Action
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function downloadInventory() {
	//CSV header
	var serialKey = 'SERIAL';
	var macKey = 'MAC';
	var manufacturedKey = 'MANUFACTURED DATE';
	var typeKey = 'DEVICE TYPE';
	var modelKey = 'MODEL';
	var partKey = 'PART NUMBER';
	var stateKey = 'STATE';
	var licenseKey = 'LICENSE TIER';
	var subscriptionKey = 'SUBSCRIPTION KEY';
	var appKey = 'CENTRAL INSTANCE';
	var siteKey = 'SITE';
	var tagsKey = 'TAGS';
	
	var csvDataBuild = [];
	
	var table = $('#inventory-table').DataTable();
	var filteredRows = table.rows({ filter: 'applied' });
	var filter = table.search();
	// For each row in the filtered set
	filteredRows[0].forEach(function(rowIdx) {
		var row = deviceDisplay[rowIdx];
		
		let tagString = '';
		if (row.tags) {
			tagString = Object.entries(row.tags).map(([key, value]) => `${key}: ${value}`).join("; ");
		}
		
		csvDataBuild.push({ [serialKey]: row.serial, [macKey]: row.mac, [manufacturedKey]:row.manufactured, [typeKey]: row.type, [modelKey]: row.model, [partKey]: row.part, [stateKey]: row.state, [licenseKey]: row.tier, [subscriptionKey]: row.license, [appKey]: row.app, [siteKey]: row.site, [tagsKey]: tagString});
	});
	
	var filename = 'Inventory'
	if (filter !== '') filename = 'Inventory-' + filter.replace(/ /g, '_');
	downloadCSVData(filename, csvDataBuild);
}