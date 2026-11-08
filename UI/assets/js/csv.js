/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var currentWorkflow = '';

var csvData;
var csvDataCount = 0;
var csvNotification;

const glpAddDeviceLimit = 5;
const glpAddDelay = 3000;
const glpUpdateDeviceLimit = 5;
const glpUpdateDelay = 3500;

var addCounter = 0;
var addTotal = 0;
var addNotification;
var addTracking = {};
var addErrors = [];

var licenseCounter = 0;
var licenseTotal = 0;
var licenseNotification;
var licenseTracking = {};
var licenseErrors = [];
var licenseAdd = false;

var appCounter = 0;
var appTotal = 0;
var appNotification;
var appTracking = {};
var appErrors = [];
var appAdd = false;

var personaCounter = 0;
var personaMissing = 0;
var personaErrors = [];
var personaNotification;

var siteCounter = 0;
var siteMissing = 0;
var siteErrors = [];
var siteNotification;
var siteDevices = {};
const siteAssignmentLimit = 100;

var renameCounter = 0;
var renameMissing = 0;
var renameErrors = [];
var renameNotification;


// Automation Variables
var automationNotification;

var autoAddPromise; var autoAddResolve;
var autoLicensePromise; var autoLicenseResolve;
var autoAppPromise; var autoAppResolve;
var autoPersonaPromise; var autoPersonaResolve;
var autoRenamePromise; var autoRenameResolve;
var autoSitePromise; var autoSiteResolve;
var autoMagicRenamePromise; var autoMagicRenameResolve;

var aplicenseSelector;
var swlicenseSelector;
var gwlicenseSelector;

function initialLicenseChoices() {
	let aplicenseElement = document.getElementById('aplicenseselector');
	if (aplicenseElement) {
		if (!aplicenseSelector) {
			aplicenseSelector = new Choices(aplicenseElement, {
			searchEnabled: false,
			shouldSort: false,
			itemSelectText: "Press to select"
			});
		}
		let aplicenseChoices = [];
		getSubscriptions().forEach(function(sub){
			//console.log(sub)
			if (sub.subscriptionType === 'CENTRAL_AP' && sub.availableQuantity > 0 && !isDateInPast(sub.endTime)) aplicenseChoices.push({ value: sub.key, label: sub.key + ' (<strong>'+sub.tierDescription + '</strong>) - '+ sub.availableQuantity + ' available'});
		})
		aplicenseSelector.clearChoices();
		aplicenseSelector.setChoices(aplicenseChoices);
	}	
	
	let swlicenseElement = document.getElementById('swlicenseselector');
	if (swlicenseElement) {
		if (!swlicenseSelector) {
			swlicenseSelector = new Choices(swlicenseElement, {
				searchEnabled: false,
				shouldSort: false,
				itemSelectText: "Press to select"
			});
		}
		let swlicenseChoices = [];
		getSubscriptions().forEach(function(sub){
			if (sub.subscriptionType === 'CENTRAL_SWITCH' && sub.availableQuantity > 0 && !isDateInPast(sub.endTime)) swlicenseChoices.push({ value: sub.key, label: sub.key + ' (<strong>'+sub.tierDescription + '</strong>) - '+ sub.availableQuantity + ' available'});
		})
		swlicenseSelector.clearChoices();
		swlicenseSelector.setChoices(swlicenseChoices);
	}	
	
	let gwlicenseElement = document.getElementById('gwlicenseselector');
	if (gwlicenseElement) {
		if (!gwlicenseSelector) {
			gwlicenseSelector = new Choices(gwlicenseElement, {
				searchEnabled: false,
				shouldSort: false,
				itemSelectText: "Press to select"
			});
		}
		let gwlicenseChoices = [];
		getSubscriptions().forEach(function(sub){
			//console.log(sub)
			if (sub.subscriptionType === 'CENTRAL_GW' && sub.availableQuantity > 0 && !isDateInPast(sub.endTime)) gwlicenseChoices.push({ value: sub.key, label: sub.key + ' (<strong>'+sub.tierDescription + '</strong>) - '+ sub.availableQuantity + ' available'});
		})
		gwlicenseSelector.clearChoices();
		gwlicenseSelector.setChoices(gwlicenseChoices);
	}	
}

function loadCurrentPageSubscription() {
	initialLicenseChoices();
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		CSV functions
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function processCSV(results) {
	apiErrorCount = 0;
	csvData = results.data;
	csvDataCount = csvData.length;
	forcedTokenRefresh = false;
}

function loadCSVFile(clickedRow) {
	const fileInput = document.getElementById('files');
	if (!fileInput.files.length) return;
	csvNotification = showNotification('ca-cpu', 'Processing CSV File...', 'bottom', 'center', 'info');
	Papa.parse(fileInput.files[0], {
		delimiter: ',',
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: function(h) {
			return h.toUpperCase().trim();
		},
		error: function(err) {
			showNotification('ca-c-warning', err.message, 'bottom', 'center', 'danger');
		},
		complete: function(results) {
			processCSV(results);
			if (csvNotification) csvNotification.close();
			if (!csvData) {
				showNotification('ca-c-warning', 'No CSV data found. Try selecting a CSV document.', 'bottom', 'center', 'danger');
				return;
			}
			if (clickedRow === 'adddevices') {
				logStart('Adding devices...');
				currentWorkflow = '';
				addDevices();
			} else if (clickedRow === 'licensedevices') {
				logStart('Licensing devices...');
				currentWorkflow = '';
				licenseDevices();
			} else if (clickedRow === 'unlicensedevices') {
				logStart('Removing licenses from devices...');
				currentWorkflow = '';
				unlicenseDevices();
			} else if (clickedRow === 'linkToCentral') {
				logStart('Assigning devices to Central...');
				currentWorkflow = '';
				linkDevicesToCentral();
			} else if (clickedRow === 'unlinkFromCentral') {
				logStart('Unassigning devices to Central...');
				currentWorkflow = '';
				unlinkDevicesFromCentral();
			} else if (clickedRow === 'assignpersona') {
				logStart('Assigning device function...');
				currentWorkflow = '';
				assignPersona();
			} else if (clickedRow === 'renamedevices') {
				logStart('Renaming devices...');
				currentWorkflow = '';
				renameDevices();
			} else if (clickedRow === 'assignSite') {
				logStart('Assigning devices to sites...');
				currentWorkflow = '';
				assignSite();
			}
		},
	});
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Add Devices Tasks
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function addDevices() {
	authenticateWithCentral().then(function() {
		
		addCounter = 0;
		addTracking = {};
		addErrors = [];
		
		addNotification = showProgressNotification('ca-c-add', 'Adding devices...', 'bottom', 'center', 'info');
	
		var base_url = localStorage.getItem('base_url');
		var currentClusterName = 'Internal';
		if (base_url) currentClusterName = getClusterName(base_url);
	
		var devices = [];
		csvData.some(function(row) {
			// build array for uploading.
			if ((!row['SERIAL'] && !row['SERIAL NUMBER']) || (!row['MAC'] && !row['MAC ADDRESS'])) {
				return true; // break
			}
			let mac = row['MAC'];
			if (!row['MAC']) mac = row['MAC ADDRESS'];
			let serial = row['SERIAL'];
			if (!row['SERIAL']) serial = row['SERIAL NUMBER'];
			
			if (currentClusterName === 'Central On-Prem') devices.push({ macAddress: cleanMACAddress(mac), serialNumber: serial.trim(), partNumber: row['MODEL'].trim() });
			else devices.push({ macAddress: cleanMACAddress(mac), serialNumber: serial.trim() });
		});
		
		// Use double the device count for the 2 operations (post and async status check)
		addTotal = devices.length * 2; 
		
		// Need to split up into device blocks (API limitation)
		var timeoutCounter = 0;
		while (devices.length > 0) {
			var deviceBlock = [];
			deviceBlock = devices.splice(0, glpUpdateDeviceLimit);
			
			// Add group of devices
			setTimeout(addDeviceBlock, glpUpdateDelay * timeoutCounter, deviceBlock);
			timeoutCounter++;
		}
		
		if (currentWorkflow !== '') {
			autoAddPromise = new Promise(function(resolve) { autoAddResolve = resolve; });
			return autoAddPromise;
		}
	});
};

function addDeviceBlock(devices) {
	
	var settings = {
		url: getAPIURL() + '/tools/postCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: glpGlobalURL + '/devices/v1/devices',
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify({network: devices, storage:[], compute:[]})
		}),
	};

	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {	
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(addDeviceBlock, apiWaitDelay, devices);
			return;
		} else if (result !== 202) {
			if (addNotification) {
				addNotification.update({ type: 'danger', message: 'Failed to add devices' });
				setTimeout(addNotification.close, 2000);
				logError('Error adding: '+JSON.stringify(devices));
			}
			addCounter = addCounter + devices.length;
		} else {
			// Need to get async location from header.
			if (commandResults.hasOwnProperty('headers')) {
				var parsedHeaders = JSON.parse(commandResults.headers);
				addTracking[parsedHeaders.location] = devices;
				
				setTimeout(checkAddAsyncResult, 5000, parsedHeaders.location)
			}
			var logString = [];
			devices.forEach(function(dev) { logString.push(dev.serialNumber); });
			logInformation('Adding: '+logString.join(', '));
			addCounter = addCounter + devices.length;
		}
		var addProgress = (addCounter / addTotal) * 100;
		addNotification.update({ progress: addProgress });		
	});
}

function checkAddAsyncResult(location) {
	var asyncSettings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: glpGlobalURL + location,
			access_token: localStorage.getItem('access_token')
		}),
	};
	
	fetch(asyncSettings.url, {method: asyncSettings.method, headers: asyncSettings.headers, body: asyncSettings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(checkAddAsyncResult, apiWaitDelay, location);
			return;
		} else if (result !== 200) {
			if (addNotification) {
				addNotification.update({ type: 'danger', message: 'Failed to add devices' });
				setTimeout(addNotification.close, 2000);
				logError('Error adding: '+JSON.stringify(addTracking[location]));
			}
		} else {
			// Need to get async location from header.
			if (commandResults.hasOwnProperty('headers')) {
				
				var response = JSON.parse(commandResults.responseBody);
				
				var results = response.result;
				if (response.status === "FAILED" || response.status === "TIMEDOUT") {
					if (results['failedDevicesSerial'] && results['failedDevicesSerial'].length > 0) {
						apiErrorCount++;
						addErrors = addErrors.concat(results['failedDevicesSerial']);
					} else if (results['failedDevices'] && results['failedDevices'].length > 0) {
						apiErrorCount++;
						results['failedDevices'].forEach(function(id) {
							addErrors.push(findDeviceInGLPInventoryById(id).serialNumber);
						});
					}
				} else if (response.status === "RUNNING" || response.status === "INITIALIZED") {
					setTimeout(checkAddAsyncResult, response.suggestedPollingIntervalSeconds * 1000, location);
					return;
				} else if (response.status === "SUCCEEDED") {
					// Devices added.
				}
				
			}
		}
		
		//addCounter = addCounter + 1;
		addCounter = addCounter + addTracking[location].length;
		var addProgress = (addCounter / addTotal) * 100;
		addNotification.update({ progress: addProgress });	
		
		if (addCounter >= addTotal) {
			if (addNotification) addNotification.close();
			if (currentWorkflow === '') {
				if (apiErrorCount != 0) {
					logError('The following devices failed to be added to GreenLake: '+addErrors.join(', ') );
					Swal.fire({
						title: 'Add Failure',
						text: 'Some or all devices failed to be added to GreenLake. Check the log for details.',
						icon: 'error',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});
				} else {
					Swal.fire({
						title: 'Add Success',
						text: 'All devices were added to GreenLake',
						icon: 'success',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});
				}
			} else {
				if (apiErrorCount != 0) {
					Swal.fire({
						title: 'Add Failure',
						text: 'Some or all devices failed to be added to GreenLake. Check the log for details.',
						icon: 'error',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});;
					if (automationNotification) {
						automationNotification.update({ message: 'Unable to add all Devices', type: 'danger' });
						setTimeout(automationNotification.close, 1000);
					}
				} else {
					// complete the Add part of the automation
					logEnd('Automation: Adding devices complete');
					autoAddResolve();
				}
				
			}
		}
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	License Devices Tasks
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function licenseDevices() {
	new bootstrap.Modal(document.getElementById('LicenseModal')).show();
}

function beginLicensing() {
	authenticateWithCentral().then(function() {
		updateSubscriptions(0).then(function() {
			updateDeviceInventory(0).then(function() {
				licenseCounter = 0;
				licenseTracking = {};
				licenseErrors = [];
				licenseTotal = 0;
				licenseWarning = false;
				apiErrorCount = 0;
				licenseAdd = true;
				
				licenseNotification = showProgressNotification('ca-license-key', 'Licensing devices...', 'bottom', 'center', 'info');
			
				let licenseList = {};
				csvData.some(function(row) {
					// build array for uploading.
					if (!row['SERIAL'] && !row['SERIAL NUMBER']) {
						return true; // break
					}
					let serial = row['SERIAL'];
					if (!row['SERIAL']) serial = row['SERIAL NUMBER'];
					let cleanSerial = serial.toUpperCase().trim();
					
					let cleanLicense = '';
					if (row['LICENSE']) cleanLicense = row['LICENSE'].toUpperCase().trim();
					
					let foundDevice = findDeviceInGLPInventory(cleanSerial);
					if (!foundDevice) {
						logError('Device with serial number: "'+ cleanSerial + '" was not found in GreenLake inventory');
					} else {
						// If no license in CSV, use license key selected in drop downs
						if (cleanLicense === '' && foundDevice.deviceType.includes('AP')) cleanLicense = aplicenseSelector.getValue(true);
						if (cleanLicense === '' && foundDevice.deviceType.includes('SWITCH')) cleanLicense = swlicenseSelector.getValue(true);
						if (cleanLicense === '' && foundDevice.deviceType.includes('GATEWAY')) cleanLicense = gwlicenseSelector.getValue(true);
						
						// If no license key... through warning
						if (!cleanLicense  || cleanLicense === '') {
							if (!licenseWarning) {
								logError('Please select an appropriate license from the dropdowns, or add license key to CSV');
								showNotification('ca-license-key', 'Please select an appropriate license from the dropdowns, or add license key to CSV', 'bottom', 'center', 'danger');
								licenseWarning = true;
								return false;
							}
						}
					
						let foundSubscription = findSubscriptionWithKey(cleanLicense);
						if (!foundSubscription) {
							logError('Subscription with key: "'+ cleanLicense + '" was not found in GreenLake inventory');
						} else {
							// check if other devices have the same services assigned
							if (!licenseList[foundSubscription.id]) {
								licenseList[foundSubscription.id] = [];
							}
							
							// Add device to the list that matches the services.
							let devices = licenseList[foundSubscription.id];
							devices.push(foundDevice);
							licenseList[foundSubscription.id] = devices;
							
							// Use double the device count for the 2 operations (patch and async status check)
							licenseTotal = licenseTotal+2;
						}
					}
				});
				
				if (!licenseWarning) {
					(bootstrap.Modal.getInstance(document.getElementById('LicenseModal')) || new bootstrap.Modal(document.getElementById('LicenseModal'))).hide();
					var timeoutCounter = 0;
					for (const [key, value] of Object.entries(licenseList)) {
						let devices = value;
						
						// Need to split up into 100 device blocks (API limitation)
						while (devices.length > 0) {
							let deviceBlock = devices.splice(0, glpUpdateDeviceLimit);
							
							// Update licensing
							setTimeout(licenseDeviceBlock, glpUpdateDelay * timeoutCounter, key, deviceBlock);
							timeoutCounter++;
						}
					}
					
					if (currentWorkflow !== '') {
						autoLicensePromise = new Promise(function(resolve) { autoLicenseResolve = resolve; });
						return autoLicensePromise;
					}
				} else {
					if (licenseNotification) {
						licenseNotification.close();
					}
				}
			});
		});
	});
};

function unlicenseDevices() {
	authenticateWithCentral().then(function() {
		updateSubscriptions(0).then(function() {
			updateDeviceInventory(0).then(function() {
				licenseCounter = 0;
				licenseTracking = {};
				licenseErrors = [];
				licenseTotal = 0;
				licenseAdd = false;
				
				licenseNotification = showProgressNotification('ca-widget', 'Removing licenses from devices...', 'bottom', 'center', 'info');
				
				let licenseList = [];
				csvData.some(function(row) {
					// build array for uploading.
					if (!row['SERIAL'] && !row['SERIAL NUMBER']) {
						return true; // break
					}
					let serial = row['SERIAL'];
					if (!row['SERIAL']) serial = row['SERIAL NUMBER'];
					let cleanSerial = serial.toUpperCase().trim();
					
					let foundDevice = findDeviceInGLPInventory(cleanSerial);
					if (!foundDevice) {
						logError('Device with serial number: "'+ cleanSerial + '" was not found in GreenLake inventory');
					} else {
						licenseList.push(foundDevice)
						
						// Use double the device count for the 2 operations (patch and async status check)
						licenseTotal = licenseTotal+2;
					}
				});
				
				var timeoutCounter = 0;
				// Need to split up into device blocks (API limitation)
				while (licenseList.length > 0) {
					let deviceBlock = licenseList.splice(0, glpUpdateDeviceLimit);
					
					// Update licensing
					setTimeout(licenseDeviceBlock, glpUpdateDelay * timeoutCounter, null, deviceBlock);
					timeoutCounter++;
				}
				
				if (currentWorkflow !== '') {
					autoLicensePromise = new Promise(function(resolve) { autoLicenseResolve = resolve; });
					return autoLicensePromise;
				}
			});
		});
	});
};

function licenseDeviceBlock(key, devices) {
	let deviceIds = []
	let deviceSerials = [];
	devices.forEach(function(dev){
		deviceSerials.push(dev.serialNumber);
		deviceIds.push(dev.id);
	});
	
	let keys = [];
	if (key) keys = [key];
	
	var settings = {
		url: getAPIURL() + '/tools/patchCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: glpGlobalURL + '/devices/v1/devices?id='+deviceIds.join('&id='),
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify({subscription: keys})
		}),
	};

	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(licenseDeviceBlock, apiWaitDelay, key, devices);
			return;
		} else if (result !== 202) {
			if (licenseNotification) {
				licenseNotification.update({ type: 'danger', message: 'Failed to update device licenses' });
				setTimeout(licenseNotification.close, 2000);
				logError('Error licensing: '+deviceSerials.join(', '));
			}
			licenseCounter = licenseCounter + devices.length;
		} else {
			// Need to get async location from header.
			if (commandResults.hasOwnProperty('headers')) {
				var parsedHeaders = JSON.parse(commandResults.headers);
				licenseTracking[parsedHeaders.location] = devices;
				
				setTimeout(checkLicenseAsyncResult, 5000, parsedHeaders.location)
			}
			var logString = [];
			devices.forEach(function(dev) { logString.push(dev.serialNumber); });
			logInformation('Licensing: '+logString.join(', '));
			licenseCounter = licenseCounter + devices.length;
		}
		let licenseProgress = (licenseCounter / licenseTotal) * 100;
		licenseNotification.update({ progress: licenseProgress });		
	});
}

function checkLicenseAsyncResult(location) {
	var asyncSettings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: glpGlobalURL + location,
			access_token: localStorage.getItem('access_token')
		}),
	};
	
	fetch(asyncSettings.url, {method: asyncSettings.method, headers: asyncSettings.headers, body: asyncSettings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(checkLicenseAsyncResult, apiWaitDelay, location);
			return;
		} else if (result !== 200) {
			if (licenseNotification) {
				licenseNotification.update({ type: 'danger', message: 'Failed to update device licenses' });
				setTimeout(licenseNotification.close, 2000);
				logError('Error licensing: '+JSON.stringify(licenseTracking[location]));
			}
		} else {
			// Need to get async location from header.
			if (commandResults.hasOwnProperty('headers')) {
				
				var response = JSON.parse(commandResults.responseBody);
				
				var results = response.result;
				if (response.status === "FAILED" || response.status === "TIMEDOUT") {
					if (results['failedDevicesSerial'] && results['failedDevicesSerial'].length > 0) {
						apiErrorCount++;
						licenseErrors = licenseErrors.concat(results['failedDevicesSerial']);
					} else if (results['failedDevices'] && results['failedDevices'].length > 0) {
						apiErrorCount++;
						results['failedDevices'].forEach(function(id) {
							licenseErrors.push(findDeviceInGLPInventoryById(id).serialNumber);
						});
					}
				} else if (response.status === "RUNNING" || response.status === "INITIALIZED") {
					setTimeout(checkLicenseAsyncResult, response.suggestedPollingIntervalSeconds * 1000, location);
					return;
				} else if (response.status === "SUCCEEDED") {
					// Devices licensed.
					if (results['succeededDevices'] && results['succeededDevices'].length > 0) {
						results['succeededDevices'].forEach(function(id) {
							if (licenseAdd) logInformation(findDeviceInGLPInventoryById(id).serialNumber + ' was successfully applied a license');
							else logInformation('License was successfully removed from '+findDeviceInGLPInventoryById(id).serialNumber);
						});
					}
				}
				
			}
		}
		
		//addCounter = addCounter + 1;
		licenseCounter = licenseCounter + licenseTracking[location].length;
		var licenseProgress = (licenseCounter / licenseTotal) * 100;
		licenseNotification.update({ progress: licenseProgress });	
		
		if (licenseCounter >= licenseTotal) {
			if (licenseNotification) licenseNotification.close();
			if (currentWorkflow === '') {
				if (apiErrorCount != 0) {
					logError('The following devices failed to have licenses updated in GreenLake: '+licenseErrors.join(', ') );
					Swal.fire({
						title: 'Licensing Failure',
						text: 'Some or all devices failed to have licenses updated in GreenLake. Check the log for details.',
						icon: 'error',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});;
				} else {
					Swal.fire({
						title: 'Licensing Success',
						text: 'All devices were updated in GreenLake',
						icon: 'success',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});;
				}
			} else {
				if (apiErrorCount != 0) {
					Swal.fire({
						title: 'Licensing Failure',
						text: 'Some or all devices failed to have licenses updated in GreenLake. Check the log for details.',
						icon: 'error',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});;
					if (automationNotification) {
						automationNotification.update({ message: 'Unable to update all Devices', type: 'danger' });
						setTimeout(automationNotification.close, 1000);
					}
				} else {
					// complete the Add part of the automation
					logEnd('Automation: Licensing devices complete');
					autoLicenseResolve();
				}
				
			}
		}
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Device-to-Central Tasks
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function linkDevicesToCentral() {
	authenticateWithCentral().then(function() {
		updateDeviceInventory(0).then(function() {
			appCounter = 0;
			appTracking = {};
			appErrors = [];
			appTotal = 0;
			appAdd = true;
			
			appNotification = showProgressNotification('ca-window-add', 'Assigning devices to Central...', 'bottom', 'center', 'info');
		
			let base_url = localStorage.getItem('base_url');
			let currentClusterName = 'Internal';
			if (base_url) currentClusterName = getClusterName(base_url);
			if (base_url) currentClusterRegion = getClusterRegion(base_url);
				
			
			// determine the application that matches the chosen cluster
			let apps = getApplications();
			let selectedAppID = null;
			apps.forEach(function(app) {
				if (currentClusterRegion === app.id) {
					app.serviceManagers.forEach(function(sm) {
						if (sm.name.includes('Central Internal') && currentClusterName === "Internal") selectedAppID = sm.id;
						else if (sm.name.includes('Central') && currentClusterName !== "Internal") selectedAppID = sm.id;
					});
				}
			});
			
			let devices = [];
			csvData.some(function(row) {
				// build array for uploading.
				if (!row['SERIAL'] && !row['SERIAL NUMBER']) {
					return true; // break
				}
				let serial = row['SERIAL'];
				if (!row['SERIAL']) serial = row['SERIAL NUMBER'];
				let cleanSerial = serial.toUpperCase().trim();
				
				let foundDevice = findDeviceInGLPInventory(cleanSerial);
				if (!foundDevice) {
					logError('Device with serial number: "'+ cleanSerial + '" was not found in GreenLake inventory');
				} else {
					devices.push(foundDevice);
					
					// Use double the device count for the 2 operations (patch and async status check)
					appTotal += 2;
				}
			});
			
			var timeoutCounter = 0;
			while (devices.length > 0) {
				let deviceBlock = devices.splice(0, glpUpdateDeviceLimit);
				
				// Update licensing
				setTimeout(linkDeviceBlock, glpUpdateDelay * timeoutCounter, selectedAppID, currentClusterRegion, deviceBlock);
				timeoutCounter++;
			}
			
			if (currentWorkflow !== '') {
				autoAppPromise = new Promise(function(resolve) { autoAppResolve = resolve; });
				return autoAppPromise;
			}
		});
	});
};

function unlinkDevicesFromCentral() {
	authenticateWithCentral().then(function() {
		updateDeviceInventory(0).then(function() {
			appCounter = 0;
			appTracking = {};
			appErrors = [];
			appTotal = 0;
			appAdd = false;
			
			appNotification = showProgressNotification('ca-window-delete', 'Unassigning devices from Central...', 'bottom', 'center', 'info');
		
			let devices = [];
			csvData.some(function(row) {
				// build array for uploading.
				if (!row['SERIAL'] && !row['SERIAL NUMBER']) {
					return true; // break
				}
				let serial = row['SERIAL'];
				if (!row['SERIAL']) serial = row['SERIAL NUMBER'];
				let cleanSerial = serial.toUpperCase().trim();
				
				let foundDevice = findDeviceInGLPInventory(cleanSerial);
				if (!foundDevice) {
					logError('Device with serial number: "'+ cleanSerial + '" was not found in GreenLake inventory');
				} else {
					devices.push(foundDevice)
					
					// Use double the device count for the 2 operations (patch and async status check)
					appTotal += 2;
				}
			});
			
			var timeoutCounter = 0;
			// Need to split up into device blocks (API limitation)
			while (devices.length > 0) {
				let deviceBlock = devices.splice(0, glpUpdateDeviceLimit);
				
				// Update licensing
				setTimeout(linkDeviceBlock, glpUpdateDelay * timeoutCounter, null, null, deviceBlock);
				timeoutCounter++;
			}
			
			if (currentWorkflow !== '') {
				autoAppPromise = new Promise(function(resolve) { autoAppResolve = resolve; });
				return autoAppPromise;
			}
		});
	});
};

function linkDeviceBlock(appId, region, devices) {
	let deviceIds = [];
	let deviceSerials = [];
	devices.forEach(function(dev){
		deviceSerials.push(dev.serialNumber);
		deviceIds.push(dev.id);
	});
	
	let data = {application: {id: appId}, region: region}
	if (!appId) {
		data = {application: {id: null}, region: null}
	}
	
	var settings = {
		url: getAPIURL() + '/tools/patchCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: glpGlobalURL + '/devices/v1/devices?id='+deviceIds.join('&id='),
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify(data)
		}),
	};

	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(linkDeviceBlock, apiWaitDelay, appId, devices);
			return;
		} else if (result !== 202) {
			if (appNotification) {
				appNotification.update({ type: 'danger', message: 'Failed to update Central assignment' });
				setTimeout(appNotification.close, 2000);
				logError('Error in Central assignment: '+deviceSerials.join(', '));
			}
			appCounter += devices.length;
		} else {
			// Need to get async location from header.
			if (commandResults.hasOwnProperty('headers')) {
				let parsedHeaders = JSON.parse(commandResults.headers);
				appTracking[parsedHeaders.location] = devices;
				
				setTimeout(checkAppAsyncResult, 5000, parsedHeaders.location)
			}
			var logString = [];
			devices.forEach(function(dev) { logString.push(dev.serialNumber); });
			logInformation('Central assignment: '+logString.join(', '));
			appCounter += devices.length;
		}
		let appProgress = (appCounter / appTotal) * 100;
		appNotification.update({ progress: appProgress });		
	});
}

function checkAppAsyncResult(location) {
	var asyncSettings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: glpGlobalURL + location,
			access_token: localStorage.getItem('access_token')
		}),
	};
	
	fetch(asyncSettings.url, {method: asyncSettings.method, headers: asyncSettings.headers, body: asyncSettings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(checkAppAsyncResult, apiWaitDelay, location);
			return;
		} else if (result !== 200) {
			if (appNotification) {
				appNotification.update({ type: 'danger', message: 'Failed to update Central assignments' });
				setTimeout(appNotification.close, 2000);
				logError('Error in Central assignment: '+JSON.stringify(appTracking[location]));
			}
		} else {
			// Need to get async location from header.
			if (commandResults.hasOwnProperty('headers')) {
				
				var response = JSON.parse(commandResults.responseBody);
				var results = response.result;
				if (response.status === "FAILED" || response.status === "TIMEDOUT") {
					if (results['failedDevicesSerial'] && results['failedDevicesSerial'].length > 0) {
						apiErrorCount++;
						appErrors = appErrors.concat(results['failedDevicesSerial']);
					}
				} else if (response.status === "RUNNING" || response.status === "INITIALIZED") {
					setTimeout(checkAppAsyncResult, response.suggestedPollingIntervalSeconds * 1000, location);
					return;
				} else if (response.status === "SUCCEEDED") {
					// Devices licensed.
				}
				
			}
		}
		
		//addCounter = addCounter + 1;
		appCounter += appTracking[location].length;
		var appProgress = (appCounter / appTotal) * 100;
		appNotification.update({ progress: appProgress });	
		
		if (appCounter >= appTotal) {
			if (appNotification) appNotification.close();
			if (currentWorkflow === '') {
				if (apiErrorCount != 0) {
					logError('The following devices failed to have assignments updated in GreenLake: '+licenseErrors.join(', ') );
					Swal.fire({
						title: 'Central Assignment Failure',
						text: 'Some or all devices failed to have assignments updated in GreenLake. Check the log for details.',
						icon: 'error',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});;
				} else {
					Swal.fire({
						title: 'Central Assignment Success',
						text: 'All devices were updated in GreenLake',
						icon: 'success',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});;
				}
			} else {
				if (apiErrorCount != 0) {
					Swal.fire({
						title: 'Central Assignment Failure',
						text: 'Some or all devices failed to have assignments updated in GreenLake. Check the log for details.',
						icon: 'error',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});;
					if (automationNotification) {
						automationNotification.update({ message: 'Unable to update all Devices', type: 'danger' });
						setTimeout(automationNotification.close, 1000);
					}
				} else {
					// complete the Add part of the automation
					logEnd('Automation: Central assignments devices complete');
					autoAppResolve();
				}
				
			}
		}
	});
}

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Persona assignment Tasks
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function checkForPersonaCompletion() {
	var presonaProgress = (personaCounter / csvData.length) * 100;
	personaNotification.update({ progress: presonaProgress });

	if (personaCounter == csvData.length) {
		if (personaNotification) personaNotification.close();
		if (currentWorkflow === '') {
			if (personaMissing === siteCounter) {
				if (apiErrorCount != 0) {
					Swal.fire({
						title: 'Device Function Assignment Failure',
						text: 'Unable to locate devices in the Inventory. Would you like to try again after updating the inventory?',
						icon: 'question',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						} else if (result.isConfirmed) {
							assignPersona(true);
						}
					});
				}
			} else {
				if (apiErrorCount != 0) {
					Swal.fire({
						title: 'Device Function Assignment Failure',
						text: 'Some or all devices failed to be assigned',
						icon: 'error',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});
				} else {
					Swal.fire({
						title: 'Device Function Assignment Success',
						text: 'All devices were assigned a device function',
						icon: 'success',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});
				}
				
				logEnd('Device function assignment complete');
			}
		} else if (currentWorkflow === 'auto-site-persona') {
			logEnd('Automation: Device function assignment complete');
			autoPersonaResolve();
		}
		getDeviceInventoryData(1, true);
	}
}

function assignPersona(force=false) {
	personaMissing = 0;
	personaCounter = 0;
	personaErrors = [];
	var personaList = {}
	apiErrorCount = 0;
	
	authenticateWithCentral().then(function() {
		getDeviceInventoryData(1, force).then(function() {
			personaNotification = showProgressNotification('ca-tags-stack', 'Assign device function to devices...', 'bottom', 'center', 'info');
			
			var i = 0;
			csvData.some(function(row) {
				// build array for uploading.
				
				if (!row['SERIAL'] && !row['SERIAL NUMBER']) {
					return true; // break
				}
				let serial = row['SERIAL'];
				if (!row['SERIAL']) serial = row['SERIAL NUMBER'];
				let cleanSerial = serial.toUpperCase().trim();
				
				if (row['DEVICE FUNCTION']) {
					var newPersona = row['DEVICE FUNCTION'].trim();
					// cleanup Persona to fit known valid list
					if (newPersona.toLowerCase().includes('campus') || newPersona.toLowerCase().includes('cap')) newPersona = 'campus ap';
					else if (newPersona.toLowerCase().includes('micro') || newPersona.toLowerCase().includes('mb')) newPersona = 'microbranch ap';
					else if (newPersona.toLowerCase().includes('mobility') || newPersona.toLowerCase().includes('mgw')) newPersona = 'mobility gw';
					else if (newPersona.toLowerCase().includes('branch') || newPersona.toLowerCase().includes('bgw')) newPersona = 'branch gw';
					else if (newPersona.toLowerCase().includes('vpn') ) newPersona = 'vpnc concentrator';
					else if (newPersona.toLowerCase().includes('aos-s') && newPersona.toLowerCase().includes('access')) newPersona = 'aos-s access switch';
					else if (newPersona.toLowerCase().includes('aos-s') && newPersona.toLowerCase().includes('agg')) newPersona = 'aos-s aggregation switch';
					else if (newPersona.toLowerCase().includes('aos-s') && newPersona.toLowerCase().includes('core')) newPersona = 'aos-s core switch';
					else if (newPersona.toLowerCase().includes('aos') && newPersona.toLowerCase().includes('access')) newPersona = 'aos-s access switch';
					else if (newPersona.toLowerCase().includes('aos') && newPersona.toLowerCase().includes('agg')) newPersona = 'aos-s aggregation switch';
					else if (newPersona.toLowerCase().includes('aos') && newPersona.toLowerCase().includes('core')) newPersona = 'aos-s core switch';
					else if (newPersona.toLowerCase().includes('access')) newPersona = 'access switch';
					else if (newPersona.toLowerCase().includes('agg')) newPersona = 'aggregation switch';
					else if (newPersona.toLowerCase().includes('core')) newPersona = 'core switch';
					else if (newPersona.toLowerCase().includes('bridge')) newPersona = 'bridge';
					else if (newPersona.toLowerCase().includes('iot')) newPersona = 'iot';
					else if (newPersona.toLowerCase().includes('hybrid') || newPersona.toLowerCase().includes('nac')) newPersona = 'hybrid nac';
					
					//console.log(newPersona)
					newPersona = personas[newPersona];
					
					if (!newPersona) {
						logError('Unable to determine the correct device function for Device with Serial Number: ' + cleanSerial);
						personaCounter++;;
						checkForPersonaCompletion();
					} else {
					
						// check if other devices have the same services assigned
						if (!personaList[newPersona]) {
							personaList[newPersona] = [];
						}
						
						// Add device to the list that matches the services.
						var deviceList = personaList[newPersona];
						deviceList.push(cleanSerial);
						personaList[newPersona] = deviceList;
					}
				} else {
					personaCounter++
					checkForPersonaCompletion();
				}
			});
			
			var timeoutCounter = 0;
			for (const [key, value] of Object.entries(personaList)) {
				var deviceList = value;
				
				// Need to split up into 100 device blocks (API limitation)
				while (deviceList.length > 0) {
					var deviceBlock = [];
					deviceBlock = deviceList.splice(0, apiPersonaLimit);
					
					// Update licensing
					setTimeout(assignPersonaToDevices, apiDelay * timeoutCounter, key, deviceBlock);
					timeoutCounter++;
				}
			}
		});
	});
}

function assignPersonaToDevices(personaString, deviceBlock) {
	// Assign persona to devices
	//console.log(deviceBlock)
	var settings = {
		url: getAPIURL() + '/tools/postCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1alpha1/persona-assignment',
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify({
					"persona-device-list": [
						{
							"device-function": personaString,
							"device-id": deviceBlock,
						}
					]
				})
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			//console.log(JSON.parse(commandResults.responseBody))
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(assignPersonaToDevices, apiWaitDelay, personaString, deviceBlock);
			return;
		} else if (result !== 200) {
			logError('The following devices had issues assigning "'+ personaString + '": '+ deviceBlock.join(', '));
			personaCounter += deviceBlock.length
		} else {
		logInformation('The following devices were assigned "'+ personaString + '": '+ deviceBlock.join(', '));
			personaCounter += deviceBlock.length;
		}
		checkForPersonaCompletion();	
	});
}


/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Renaming Tasks
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function checkForRenameCompletion() {
	var renameProgress = (renameCounter / csvData.length) * 100;
	renameNotification.update({ progress: renameProgress });

	if (renameCounter == csvData.length) {
		if (renameNotification) renameNotification.close();
		if (currentWorkflow === '') {
			if (renameMissing === renameCounter) {
				if (apiErrorCount != 0) {
					Swal.fire({
						title: 'Renaming Failure',
						text: 'Unable to locate devices in the Inventory. Would you like to try again after updating the inventory?',
						icon: 'question',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						} else if (result.isConfirmed) {
							renameDevices(true);
						}
					});
				}
			} else {
				if (apiErrorCount != 0) {
					Swal.fire({
						title: 'Renaming Failure',
						text: 'Some or all devices failed to be renamed',
						icon: 'error',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});
				} else {
					Swal.fire({
						title: 'Renaming Success',
						text: 'All devices were renamed',
						icon: 'success',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});
				}
			}
		} else if (currentWorkflow === 'auto-site-rename') {
			logEnd('Automation: Renaming complete');
			autoRenameResolve();
		} else if (currentWorkflow === 'auto-site-autorename') {
			logEnd('Automation: Magic Renaming complete');
			autoMagicRenameResolve();
		} else if (currentWorkflow === 'auto-site-autorenameap-portdescriptions') {
			logEnd('Automation: Magic Renaming complete');
			autoMagicRenameResolve();
		}
	}
}

function renameDevices(force=false) {
	renameCounter = 0;
	renameErrors = [];
	renameMissing = 0;
	apiErrorCount = 0;
	
	authenticateWithCentral().then(function() {
		getDeviceInventoryData(1, force).then(function() {
			renameNotification = showProgressNotification('ca-card-update', 'Renaming devices...', 'bottom', 'center', 'info');
			
			var i = 0;
			csvData.some(function(row) {
				// build array for uploading.
				if (!row['SERIAL'] && !row['SERIAL NUMBER']) {
					return true; // break
				}
				var currentSerial = '';
				if (row['SERIAL']) currentSerial  = row['SERIAL'].trim().toUpperCase();
				else if (row['SERIAL NUMBER']) currentSerial  = row['SERIAL NUMBER'].trim().toUpperCase();
				
				if (row['DEVICE NAME'] || row['NAME']) {
					var newHostname;
					if (row['DEVICE NAME']) newHostname = row['DEVICE NAME'].trim();
					else if (row['NAME']) newHostname = row['NAME'].trim();
					
					if (!newHostname) {
						logError('Device with Serial Number: ' + currentSerial + ' has no device name in the CSV file');
						renameCounter++;;
						checkForRenameCompletion();
					} else {
					
						var device = findDeviceInInventory(currentSerial);
						
						if (device) {
							if (device.scopeId && device.deviceFunction && device.deviceFunction !== '-') setTimeout(renameDevice, apiDelay * i, device, newHostname);
							else if (!device.scopeId) {
								logError('Please assign ' + currentSerial + ' to a Site');
								renameCounter++
								checkForRenameCompletion();
							} else {
								logError('Unable to determine device function for ' + currentSerial + '. Please assign a device function to the device');
								renameCounter++
								checkForRenameCompletion();
							}
						} else {
							logError('Unable to find device ' + currentSerial + ' in the device inventory');
							renameMissing++;
							renameCounter++
							checkForRenameCompletion();
						}
					}
				} else {
					renameCounter++
					checkForRenameCompletion();
				}
			});
		});
	});
}

function renameDevice(device, newHostname) {
	var checkSettings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1/system-info?view_type=LOCAL&scope_id='+device.scopeId,
			access_token: localStorage.getItem('access_token')
		}),
	};
	
	fetch(checkSettings.url, {method: checkSettings.method, headers: checkSettings.headers, body: checkSettings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(renameDevice, apiWaitDelay, device, newHostname);
			return;
		}
		
		var response = JSON.parse(commandResults.responseBody);
		if (Object.keys(response).length == 0) {
			// need to create system-info object
			var newSysInfo = {
				url: getAPIURL() + '/tools/postCommandwHeaders',
				method: 'POST',
				timeout: 0,
				headers: {
					'Content-Type': 'application/json',
				},
				data: JSON.stringify({
					url: localStorage.getItem('base_url') + '/network-config/v1/system-info?object_type=LOCAL&scope_id='+device.scopeId+'&device-function='+personas[device.deviceFunction.toLowerCase()],
					access_token: localStorage.getItem('access_token'),
					data: JSON.stringify({"profile": [{"name": "sys-system-info-profile", "hostname": newHostname}]})
				}),
			};
			
			fetch(newSysInfo.url, {method: newSysInfo.method, headers: newSysInfo.headers, body: newSysInfo.data}).then(r => r.json()).then(function(commandResults) {	
				var result = processStatus(commandResults);
				// will return the status code to trigger next step
				if (result == 429 || result == 409) {
					// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
					setTimeout(renameDevice, apiWaitDelay, device, newHostname);
					return;
				} else if (result !== 200) {
					var logName = device.deviceName;
					if (logName === '') logName = device.macAddress;
					logError('Unable to create System Info profile for '+logName);
					renameCounter++
				} else {
					// system-info exists now contains "hostname-alias": "sys_host_name"
					var logName = device.deviceName;
					if (logName === '') logName = device.macAddress;
					logInformation(logName + ' was renamed successfully to "'+ newHostname +'"');
					renameCounter++
				}
				checkForRenameCompletion();	
			});
		} else if ((response.profile) && (response['profile'][0]['hostname'] === newHostname)) {
			// system-info exists and has the hostname-alias configured
			var logName = device.deviceName;
			if (logName === '') logName = device.macAddress;
			logInformation(logName + ' was already set to the correct hostname');
			renameCounter++
			checkForRenameCompletion();
		} else {
			// Correct the system-info alias link
			let currentSysInfo = JSON.parse(commandResults.responseBody);
			delete currentSysInfo['metadata'];
			let currentProfile = currentSysInfo['profile'][0];
			currentProfile["hostname"] = newHostname;
			currentSysInfo['profile'][0] = currentProfile;
			
			var updatedSysInfo = {
				url: getAPIURL() + '/tools/patchCommandwHeaders',
				method: 'POST',
				timeout: 0,
				headers: {
					'Content-Type': 'application/json',
				},
				data: JSON.stringify({
					url: localStorage.getItem('base_url') + '/network-config/v1/system-info?object_type=LOCAL&scope_id='+device.scopeId+'&device-function='+personas[device.deviceFunction.toLowerCase()],
					access_token: localStorage.getItem('access_token'),
					data: JSON.stringify(currentSysInfo)
				}),
			};
			
			fetch(updatedSysInfo.url, {method: updatedSysInfo.method, headers: updatedSysInfo.headers, body: updatedSysInfo.data}).then(r => r.json()).then(function(commandResults) {	
				
				var result = processStatus(commandResults);
				// will return the status code to trigger next step
				if (result == 429 || result == 409) {
					// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
					setTimeout(renameDevice, apiWaitDelay, device, newHostname);
					return;
				} else if (result !== 200) {
					var logName = device.deviceName;
					if (logName === '') logName = device.macAddress;
					logError('Unable to update System Info profile for '+logName);
					renameCounter++
				} else {
					// system-info exists now contains "hostname-alias": "sys_host_name"
					
					var logName = device.deviceName;
					if (logName === '') logName = device.macAddress;
					logInformation(logName + ' was renamed successfully to "'+ newHostname +'"');
					renameCounter++
				}
				checkForRenameCompletion();	
			});
		}
	});
	
}

/*function renameDevice(device, newHostname) {
	// Check for the sys_host_name alias with the hostname
	var settings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1alpha1/aliases?view_type=LOCAL&scope_id='+device.scopeId,
			access_token: localStorage.getItem('access_token')
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(createHostNameAlias, apiWaitDelay, device, newHostname);
			return;
		} else if (result !== 200) {
			var logName = device.deviceName;
			if (logName === '') logName = device.macAddress;
			logError(logName + ' was not renamed');
			renameCounter++
		} else {
			var response = JSON.parse(commandResults['responseBody']);
			var exists = false;
			var needRename = true;
			if (response['alias']) {
				response['alias'].forEach(function(alias) {
					if (alias['name'] === 'sys_host_name') {
						exists = true;
						if (alias['default-value']['hostname-value']['hostname'] === newHostname) needRename = false;
					}
				});
			}
			// Missing the sys_host_name alias
			if (!exists) createHostNameAlias(device, newHostname);
			// alias exists but name needs updating
			else if (exists && needRename) updateHostNameAlias(device, newHostname);
			// check if system-info exists and contains "hostname-alias": "sys_host_name"
			else checkSystemInfo(device, newHostname);
		}
		checkForRenameCompletion();	
	});
}

function createHostNameAlias(device, newHostname) {
	// Create the alias with the new hostname
	//console.log(device)
	var settings = {
		url: getAPIURL() + '/tools/postCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1alpha1/aliases/sys_host_name?object_type=LOCAL&scope_id='+device.scopeId+'&device-function='+personas[device.deviceFunction.toLowerCase()],
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify({
					"name": "sys_host_name",
					"type": "ALIAS_HOSTNAME",
					"default-value": {
						"hostname-value": {
							"hostname": newHostname
						}
					}
				})
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(createHostNameAlias, apiWaitDelay, device, newHostname);
			return;
		} else if (result !== 200) {
			var logName = device.deviceName;
			if (logName === '') logName = device.macAddress;
			logError(logName + ' was not renamed: unable to create sys_host_name alias');
			renameCounter++
		} else {
			var logName = device.deviceName;
			if (logName === '') logName = device.macAddress;
			logInformation(logName + ': sys_host_name alias created')
			// check if system-info exists and contains "hostname-alias": "sys_host_name"
			checkSystemInfo(device, newHostname);
		}
		checkForRenameCompletion();	
	});
}

function updateHostNameAlias(device, newHostname) {
	// Create the alias with the new hostname
	//console.log(device)
	var settings = {
		url: getAPIURL() + '/tools/patchCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1alpha1/aliases/sys_host_name?object_type=LOCAL&scope_id='+device.scopeId+'&device-function='+personas[device.deviceFunction.toLowerCase()],
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify({
					"name": "sys_host_name",
					"type": "ALIAS_HOSTNAME",
					"default-value": {
						"hostname-value": {
							"hostname": newHostname
						}
					}
				})
		}),
	};
	
	fetch(settings.url, {method: settings.method, headers: settings.headers, body: settings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(updateHostNameAlias, apiWaitDelay, device, newHostname);
			return;
		} else if (result !== 200) {
			var logName = device.deviceName;
			if (logName === '') logName = device.macAddress;
			logError(logName + ' was not renamed');
			renameCounter++
		} else {
			var logName = device.deviceName;
			if (logName === '') logName = device.macAddress;
			logInformation(logName + ': sys_host_name alias updated')
			// check if system-info exists and contains "hostname-alias": "sys_host_name"
			checkSystemInfo(device, newHostname);
		}
		checkForRenameCompletion();	
	});
}

function checkSystemInfo(device, newHostname) {
	var checkSettings = {
		url: getAPIURL() + '/tools/getCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1alpha1/system-info?view_type=LOCAL&scope_id='+device.scopeId,
			access_token: localStorage.getItem('access_token')
		}),
	};
	
	fetch(checkSettings.url, {method: checkSettings.method, headers: checkSettings.headers, body: checkSettings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(checkSystemInfo, apiWaitDelay, device, newHostname);
			return;
		}
		
		var response = JSON.parse(commandResults.responseBody);
		console.log(response)
		if (Object.keys(response).length == 0) {
			// need to create system-info object with alias reference
			var newSysInfo = {
				url: getAPIURL() + '/tools/postCommandwHeaders',
				method: 'POST',
				timeout: 0,
				headers: {
					'Content-Type': 'application/json',
				},
				data: JSON.stringify({
					url: localStorage.getItem('base_url') + '/network-config/v1alpha1/system-info?object_type=LOCAL&scope_id='+device.scopeId+'&device-function='+personas[device.deviceFunction.toLowerCase()],
					access_token: localStorage.getItem('access_token'),
					data: JSON.stringify({"hostname-alias": "sys_host_name"})
				}),
			};
			
			fetch(newSysInfo.url, {method: newSysInfo.method, headers: newSysInfo.headers, body: newSysInfo.data}).then(r => r.json()).then(function(commandResults) {	
				console.log(commandResults)
				var result = processStatus(commandResults);
				// will return the status code to trigger next step
				if (result == 429 || result == 409) {
					// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
					setTimeout(checkSystemInfo, apiWaitDelay, device, newHostname);
					return;
				} else if (result !== 200) {
					var logName = device.deviceName;
					if (logName === '') logName = device.macAddress;
					logError('Unable to create System Info profile for '+logName);
					renameCounter++
				} else {
					// system-info exists now contains "hostname-alias": "sys_host_name"
					var logName = device.deviceName;
					if (logName === '') logName = device.macAddress;
					logInformation(logName + ' was renamed successfully to "'+ newHostname +'"');
					renameCounter++
				}
				checkForRenameCompletion();	
			});
		} else if (("hostname-alias" in response) && (response["hostname-alias"] == "sys_host_name")) {
			// system-info exists and has the hostname-alias configured
			var logName = device.deviceName;
			if (logName === '') logName = device.macAddress;
			logInformation(logName + ' was renamed successfully to "'+ newHostname +'"');
			renameCounter++
			checkForRenameCompletion();
		} else {
			// Correct the system-info alias link
			var currentSysInfo = JSON.parse(commandResults.responseBody);
			console.log(currentSysInfo)
			currentSysInfo["hostname-alias"] = "sys_host_name";
			var updatedSysInfo = {
				url: getAPIURL() + '/tools/patchCommandwHeaders',
				method: 'POST',
				timeout: 0,
				headers: {
					'Content-Type': 'application/json',
				},
				data: JSON.stringify({
					url: localStorage.getItem('base_url') + '/network-config/v1alpha1/system-info?object_type=LOCAL&scope_id='+device.scopeId+'&device-function='+personas[device.deviceFunction],
					access_token: localStorage.getItem('access_token'),
					data: JSON.stringify(currentSysInfo)
				}),
			};
			
			fetch(newSysInfo.url, {method: newSysInfo.method, headers: newSysInfo.headers, body: newSysInfo.data}).then(r => r.json()).then(function(commandResults) {	
				var result = processStatus(commandResults);
				// will return the status code to trigger next step
				if (result == 429 || result == 409) {
					// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
					setTimeout(checkSystemInfo, apiWaitDelay, device, newHostname);
					return;
				} else if (result !== 200) {
					var logName = device.deviceName;
					if (logName === '') logName = device.macAddress;
					logError('Unable to update System Info profile for '+logName);
					renameCounter++
				} else {
					// system-info exists now contains "hostname-alias": "sys_host_name"
					
					var logName = device.deviceName;
					if (logName === '') logName = device.macAddress;
					logInformation(logName + ' was renamed successfully to "'+ newHostname +'"');
					renameCounter++
				}
				checkForRenameCompletion();	
			});
		}
	});
	
}*/
/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Site Assignment Tasks
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function checkForSiteAssignmentCompletion() {
	var siteProgress = (siteCounter / csvData.length) * 100;
	siteNotification.update({ progress: siteProgress });
	
	if (siteCounter == csvData.length) {
		if (siteNotification) siteNotification.close();
		if (currentWorkflow === '') {
			if (siteMissing === siteCounter) {
				if (apiErrorCount != 0) {
					Swal.fire({
						title: 'Site Assignment Failure',
						text: 'Unable to locate devices in the Inventory. Would you like to try again after updating the inventory?',
						icon: 'question',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						} else if (result.isConfirmed) {
							assignSite(true);
						}
					});
				}
			} else {
				if (apiErrorCount != 0) {
					Swal.fire({
						title: 'Site Assignment Failure',
						text: 'Some or all devices failed to be assigned to sites',
						icon: 'error',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});
				} else {
					Swal.fire({
						title: 'Site Assignment Success',
						text: 'All devices were assigned to sites',
						icon: 'success',
						showCancelButton: true,
						confirmButtonColor: '#3085d6',
						cancelButtonColor: '#888888',
						confirmButtonText: 'OK',
						cancelButtonText: 'Show Log',
					}).then(result => {
						if (result.isDismissed) {
							setTimeout(showLog,500);
						}
					});
				}
			}
		} else if (currentWorkflow === 'auto-site-rename') {
			logEnd('Automation: Renaming complete');
			autoRenameResolve();
		} else if (currentWorkflow === 'auto-site-autorename') {
			logEnd('Automation: Magic Renaming complete');
			autoMagicRenameResolve();
		} else if (currentWorkflow === 'auto-site-autorenameap-portdescriptions') {
			logEnd('Automation: Magic Renaming complete');
			autoMagicRenameResolve();
		}
	}
}

function assignSite(force=false) {
	siteCounter = 0;
	siteMissing = 0;
	siteErrors = [];
	siteDevices = {};
	apiErrorCount = 0;
	
	authenticateWithCentral().then(function() {
		getDeviceInventoryData(1, force).then(function() {
			siteNotification = showProgressNotification('ca-license-key', 'Assigning devices to sites...', 'bottom', 'center', 'info');
			
			var i = 0;
			csvData.some(function(row) {
				// build array for uploading.
				if (!row['SERIAL'] && !row['SERIAL NUMBER']) {
					siteCounter++;
					return true; // break
				}
				var currentSerial = '';
				if (row['SERIAL']) currentSerial  = row['SERIAL'].trim().toUpperCase();
				else if (row['SERIAL NUMBER']) currentSerial  = row['SERIAL NUMBER'].trim().toUpperCase();
				
				if (row['SITE']) {
					var newSite = row['SITE'].trim();
					
					if (!newSite || newSite === '-') {
						logError('Device with Serial Number ' + currentSerial + ' has no Site assigned in the CSV file');
						siteCounter++;
					} else {
					
						let device = findDeviceInInventory(currentSerial);
						let site = getSiteForName(newSite);
						
						if (device && site) {
							// build arrays of devices going to the same site
							let deviceList = siteDevices[site.id];
							if (!deviceList) deviceList = [];
							deviceList.push(device.serialNumber);
							siteDevices[site.id] = deviceList;
						} else if (!device) {
							logError('Unable to find device ' + currentSerial + ' in the device inventory');
							siteCounter++;
							siteMissing++;
						} else if (!site) {
							logError('Unable to find site "' + newSite + '" in the Site list');
							siteCounter++;
						}
						
					}
				} else {
					siteCounter++;
				}
			});
			completedSiteProcessing();
		});
	});
}

function completedSiteProcessing() {
	// Sites all processed
	if (Object.keys(siteDevices).length == 0) {
		checkForSiteAssignmentCompletion();
	} else {
		console.log('processing')
		for (const [siteId, serialsToMove] of Object.entries(siteDevices)) {
			var serialArray = serialsToMove;
		
			// Need to split up into device blocks (API limitation)
			var i = 0;
			while (serialArray.length > 0) {
				var serialBlock = [];
				serialBlock = serialArray.splice(0, siteAssignmentLimit);
				setTimeout(assignDeviceToSite, apiDelay * i, siteId, serialBlock);
				i++;
			}
		}
	}
}

function assignDeviceToSite(siteId, serialArray) {
	
	var assignSettings = {
		url: getAPIURL() + '/tools/postCommandwHeaders',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: localStorage.getItem('base_url') + '/network-config/v1/site-add-devices',
			access_token: localStorage.getItem('access_token'),
			data: JSON.stringify({ "desScopeId": siteId.toString(), "devices": serialArray })
		}),
	};
	
	fetch(assignSettings.url, {method: assignSettings.method, headers: assignSettings.headers, body: assignSettings.data}).then(r => r.json()).then(function(commandResults) {	
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429 || result == 409) {
			// Over API threshold limit. Wait 'apiWaitDelay' value and try again.
			setTimeout(assignDeviceToSite, apiWaitDelay, siteId, serialArray);
			return;
		}
		
		var response = JSON.parse(commandResults.responseBody);
		console.log(response)
		// check response
		if (response.status !== 'SUCCESS') {
			apiErrorCount++;
		}
		siteCounter += serialArray.length;
		checkForSiteAssignmentCompletion();
	});
}