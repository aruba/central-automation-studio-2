/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var multipleMonitoringData;
var goToAllowed = true;
var currentAccountIndex = 0;

var statusKey = 'status'
var clientKey = 'clients'
var apKey = 'aps';
var switchKey = 'switches';
var gatewayKey = 'gateways';
var siteKey = 'sites';


/*  ----------------------------------------------------------------------------------
	Obtaining Monitoring Data functions
	---------------------------------------------------------------------------------- */
	
function loadMultipleDashboardData(refreshrate) {
	resetOverallUI();
	//goToAllowed = true;
	if (!localStorage.getItem('multiple_update')) {
		console.log('Getting new monitoring data from Central for multiple accounts');
		getMultipleDashboardData();
	} else {
		loadCentralAccountDetails();
		var lastRefresh = new Date(parseInt(localStorage.getItem('multiple_update')));
		var now = new Date();
		var diffTime = Math.abs(now - lastRefresh);
		var diffMinutes = Math.ceil(diffTime / (1000 * 60));
		if (diffMinutes > refreshrate) {
			console.log('Getting new monitoring data from Central for multiple accounts');
			getMultipleDashboardData();
		} else {
			console.log('Getting monitoring data from the IndexedDB for multiple accounts');
			const transaction = db.transaction('general', 'readonly');
			const store = transaction.objectStore('general');
			const monitoringQuery = store.get('multiple_monitoring');
			monitoringQuery.onsuccess = function() {
				if (monitoringQuery.result && monitoringQuery.result.data) {
					multipleMonitoringData = JSON.parse(monitoringQuery.result.data);
					loadMultipleAccountTable();
					updateOverallUI()
				}
			};
		}
	}
}

function getMultipleDashboardData() {
	logNote('Refreshing Dashboard Data for all accounts')
	resetOverallUI();
	multipleMonitoringData = {};
	// Loop through the Central credentials and check if access token is valid
	currentAccountIndex = 0;
	loadCentralAccountDetails();
	verifyAccessForAccount();
}

function verifyAccessForAccount() {
	var currentAccount = centralCredentials[currentAccountIndex];
	// Check if access token is still valid (for the next 10mins)
	var clientId = currentAccount['client_id'];
	var accountName = currentAccount['account_name'];
	var expiryTimeMS = currentAccount['expires_at'];
	if (expiryTimeMS) {
		var expiryTime = new Date(expiryTimeMS*1000);
		var minutesLater = new Date();
		minutesLater.setMinutes(minutesLater.getMinutes() + 10);
		if (expiryTime > minutesLater) {
			console.log(accountName + ': token is still valid');
			// no need to generate a new access token just yet
			setTimeout(getDashboardDataForAccount, apiWaitDelay*currentAccountIndex, clientId)
			
			currentAccountIndex++;
			if (currentAccountIndex < centralCredentials.length) verifyAccessForAccount();
		} else {
			logInformation(accountName + ': access token needs to be renewed');
			// if not valid - try to generate a new token.
			authenticateWithCentralUsingAccount(currentAccount).then(function() {
				logInformation(accountName + ': access token was renewed');
				// Once account is checked and updated, begin polling for Client, AP, Switch, Gateway (Count - up and down)
				setTimeout(getDashboardDataForAccount, apiWaitDelay*currentAccountIndex, clientId)
				
				currentAccountIndex++;
				if (currentAccountIndex < centralCredentials.length) verifyAccessForAccount();
			})
			.catch(function() {
				
				logError(accountName + ': access token failed to be renewed');
				// On access token failure - add account to multipleMonitoringData with status 'down'
				multipleMonitoringData[clientId] = {[statusKey]:'down', [clientKey]:{'wireless-connected':0, 'wireless-disconnected':0, 'wired-connected':0, 'wired-disconnected':0}, [apKey]: {'up':0, 'down':0}, [switchKey]: {'up':0, 'down':0}, [gatewayKey]: {'up':0, 'down':0}, [siteKey]: []};
				loadMultipleAccountTable();
				currentAccountIndex++;
				if (currentAccountIndex < centralCredentials.length) verifyAccessForAccount();
			});
		}
	} else {
		// On access token failure - add account to multipleMonitoringData with status 'down'
		//multipleMonitoringData[clientId] = {[statusKey]:'down', [clientKey]:{'wireless-connected':0, 'wireless-disconnected':0, 'wired-connected':0, 'wired-disconnected':0}, [apKey]: {'up':0, 'down':0}, [switchKey]: {'up':0, 'down':0}, [gatewayKey]: {'up':0, 'down':0}, [siteKey]: []};
		loadMultipleAccountTable();
		currentAccountIndex++;
		if (currentAccountIndex < centralCredentials.length) verifyAccessForAccount();
	}
}

function getDashboardDataForAccount(clientId) {
	// Create clear data structure
	multipleMonitoringData[clientId] = {[statusKey]:'down', [clientKey]:{'wireless-connected':0, 'wireless-disconnected':0, 'wired-connected':0, 'wired-disconnected':0}, [apKey]: {'up':0, 'down':0}, [switchKey]: {'up':0, 'down':0}, [gatewayKey]: {'up':0, 'down':0}, [siteKey]: []};
	
	showNotification('ca-cloud-data-download', 'Updating data for "' + getNameforClientID(clientId) + '"', 'bottom', 'center', 'info');
	
	
	
	// Add to account in multipleMonitoringData, and to overallMonitoringData.
	getWirelessClientOverviewForAccount(clientId);
	getWiredClientOverviewForAccount(clientId);
	getAPOverviewForAccount(clientId);
	getSwitchOverviewForAccount(clientId);
	getGatewayOverviewForAccount(clientId);
	
	updateOverallUI();
	loadMultipleAccountTable();
	localStorage.setItem('monitoring_update', +new Date());
}

/*  ----------------------------------------------------------------------------------
	Multiple Account Overall UI functions
	---------------------------------------------------------------------------------- */
function resetOverallUI() {
	if (document.getElementById('client_icon')) {
		document.getElementById('client_icon')?.classList.add('bg-gradient-success');
		document.getElementById('client_icon')?.classList.remove('bg-gradient-secondary');
		document.getElementById('client_icon')?.classList.remove('bg-gradient-danger');
	}
	if (document.getElementById('client_count')) document.getElementById('client_count').innerHTML = '-';
	
	if (document.getElementById('ap_icon')) {
		document.getElementById('ap_icon')?.classList.add('bg-gradient-success');
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-secondary');
		document.getElementById('ap_icon')?.classList.remove('bg-gradient-danger');
	}
	if (document.getElementById('ap_count')) document.getElementById('ap_count').innerHTML = '-';
	
	if (document.getElementById('switch_icon')) {
		document.getElementById('switch_icon')?.classList.add('bg-gradient-success');
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-secondary');
		document.getElementById('switch_icon')?.classList.remove('bg-gradient-danger');
	}
	if (document.getElementById('switch_count')) document.getElementById('switch_count').innerHTML = '-';
	
	if (document.getElementById('gateway_icon')) {
		document.getElementById('gateway_icon')?.classList.add('bg-gradient-success');
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-secondary');
		document.getElementById('gateway_icon')?.classList.remove('bg-gradient-danger');
	}
	if (document.getElementById('gateway_count')) document.getElementById('gateway_count').innerHTML = '-';
	
	if (document.getElementById('license_icon')) {
		document.getElementById('license_icon')?.classList.add('bg-gradient-success');
		document.getElementById('license_icon')?.classList.remove('bg-gradient-secondary');
		document.getElementById('license_icon')?.classList.remove('bg-gradient-danger');
	}
}

function updateOverallUI() {
	var clientCount = 0;
	var clientDiconnected = false;
	var apCount = 0;
	var apDown = false;
	var switchCount = 0;
	var switchDown = false;
	var gatewayCount = 0;
	var gatewayDown = false;
	var licenseCount = 0;
	
	for (const [key, value] of Object.entries(multipleMonitoringData)) {
		var accountData = value;
		//console.log(accountData[clientKey])
		clientCount += accountData[clientKey]['wireless-connected'] + accountData[clientKey]['wireless-disconnected'];
		if (accountData[clientKey]['wireless-disconnected'] > 0) clientDiconnected = true;
		clientCount += accountData[clientKey]['wired-connected'] + accountData[clientKey]['wired-disconnected'];
		if (accountData[clientKey]['wired-disconnected'] > 0) clientDiconnected = true;
		
		apCount += accountData[apKey]['up'] + accountData[apKey]['down'];
		if (accountData[apKey]['down'] > 0) apDown = true;
		
		switchCount += accountData[switchKey]['up'] + accountData[switchKey]['down'];
		if (accountData[switchKey]['down'] > 0) switchDown = true;
		
		gatewayCount += accountData[gatewayKey]['up'] + accountData[gatewayKey]['down'];
		if (accountData[gatewayKey]['down'] > 0) gatewayDown = true;
	}
	
	if (document.getElementById('client_icon')) {
		if (clientDiconnected) {
			document.getElementById('client_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('client_icon')?.classList.remove('bg-gradient-secondary');
			document.getElementById('client_icon')?.classList.remove('bg-gradient-success');
		} else {
			document.getElementById('client_icon')?.classList.add('bg-gradient-success');
			document.getElementById('client_icon')?.classList.remove('bg-gradient-secondary');
			document.getElementById('client_icon')?.classList.remove('bg-gradient-danger');
		}
	}
	//if (document.getElementById('client_count')) document.getElementById('client_count').innerHTML = '' + clientCount;
	if (document.getElementById('client_count')) {
		const countUp = new CountUp('client_count', clientCount);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	
	if (document.getElementById('ap_icon')) {
		if (apDown) {
			document.getElementById('ap_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('ap_icon')?.classList.remove('bg-gradient-secondary');
			document.getElementById('ap_icon')?.classList.remove('bg-gradient-success');
		} else {
			document.getElementById('ap_icon')?.classList.add('bg-gradient-success');
			document.getElementById('ap_icon')?.classList.remove('bg-gradient-secondary');
			document.getElementById('ap_icon')?.classList.remove('bg-gradient-danger');
		}
	}
	//if (document.getElementById('ap_count')) document.getElementById('ap_count').innerHTML = '' + apCount;
	if (document.getElementById('ap_count')) {
		const countUp = new CountUp('ap_count', apCount);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	
	if (document.getElementById('switch_icon')) {
		if (switchDown) {
			document.getElementById('switch_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('switch_icon')?.classList.remove('bg-gradient-secondary');
			document.getElementById('switch_icon')?.classList.remove('bg-gradient-success');
		} else {
			document.getElementById('switch_icon')?.classList.add('bg-gradient-success');
			document.getElementById('switch_icon')?.classList.remove('bg-gradient-secondary');
			document.getElementById('switch_icon')?.classList.remove('bg-gradient-danger');
		}
	}
	//if (document.getElementById('switch_count')) document.getElementById('switch_count').innerHTML = '' + switchCount;
	if (document.getElementById('switch_count')) {
		const countUp = new CountUp('switch_count', switchCount);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	
	if (document.getElementById('gateway_icon')) {
		if (gatewayDown) {
			document.getElementById('gateway_icon')?.classList.add('bg-gradient-danger');
			document.getElementById('gateway_icon')?.classList.remove('bg-gradient-secondary');
			document.getElementById('gateway_icon')?.classList.remove('bg-gradient-success');
		} else {
			document.getElementById('gateway_icon')?.classList.add('bg-gradient-success');
			document.getElementById('gateway_icon')?.classList.remove('bg-gradient-secondary');
			document.getElementById('gateway_icon')?.classList.remove('bg-gradient-danger');
		}
	}
	if (document.getElementById('gateway_count')) document.getElementById('gateway_count').innerHTML = '' + gatewayCount;
	if (document.getElementById('gateway_count')) {
		const countUp = new CountUp('gateway_count', gatewayCount);
		if (!countUp.error) {
		  countUp.start();
		} else {
		  console.error(countUp.error);
		}
	}
	
	if (document.getElementById('license_icon')) {
		document.getElementById('license_icon')?.classList.add('bg-gradient-success');
		document.getElementById('license_icon')?.classList.remove('bg-gradient-secondary');
		document.getElementById('license_icon')?.classList.remove('bg-gradient-danger');
	}
	if (document.getElementById('license_count')) document.getElementById('license_count').innerHTML = '-';
}


/*  ----------------------------------------------------------------------------------
	Account Table functions
	---------------------------------------------------------------------------------- */
function loadMultipleAccountTable() {
	disposeTooltips(document.getElementById('account-table'));
	$('#account-table')
		.DataTable().clear();
	
	for (const [key, value] of Object.entries(multipleMonitoringData)) {
		var accountData = value;
		
		var accountStatusString = '<span data-bs-toggle="tooltip" data-bs-placement="right" title="API Authentication was successful"><i class="fa-solid fa-circle text-success"></i>';
		if (accountData[statusKey] === 'down') accountStatusString = '<span data-bs-toggle="tooltip" data-bs-placement="right" title="Unable to authenticate to API Gateway"><i class="fa-solid fa-diamond text-danger"></i></span>';
	
		// Process Clients
		var clientString = '';
		if (accountData[clientKey]['wireless-connected'] > 0) clientString = '<i class="fa-solid fa-laptop fa-fw text-success"></i><span class="text-success me-2"><strong> ' + accountData[clientKey]['wireless-connected'] + ' </strong></span>';
		else clientString = '<i class="fa-solid fa-laptop fa-fw"></i><span class="me-2"><strong> ' + accountData[clientKey]['wireless-connected'] + ' </strong></span>';
		
		if (accountData[clientKey]['wireless-disconnected'] > 0) clientString += '<i class="fa-solid fa-laptop fa-fw text-danger"></i><span class="text-danger me-2"><strong> ' + accountData[clientKey]['wireless-disconnected'] + ' </strong></span>';
		else clientString += '<i class="fa-solid fa-laptop fa-fw"></i><span class="me-2"><strong> ' + accountData[clientKey]['wireless-disconnected'] + ' </strong></span>';
		
		if (accountData[clientKey]['wired-connected']) clientString += '<i class="fa-solid fa-computer fa-fw text-success"></i><span class="text-success me-2"><strong> ' + accountData[clientKey]['wired-connected'] + ' </strong></span>';
		else clientString += '<i class="fa-solid fa-computer fa-fw"></i><span class="me-2"><strong> ' + accountData[clientKey]['wired-connected'] + ' </strong></span>';
		
		if (accountData[clientKey]['wired-disconnected'] > 0) clientString += '<i class="fa-solid fa-computer fa-fw text-danger"></i><span class="text-danger me-2"><strong> ' + accountData[clientKey]['wired-disconnected'] + ' </strong></span>';
		else clientString += '<i class="fa-solid fa-computer fa-fw"></i><span class="me-2"><strong> ' + accountData[clientKey]['wired-disconnected'] + ' </strong></span>';

		// Process APs
		var apsUp = accountData[apKey]['up'];
		var apsDown = accountData[apKey]['down'];
		var apString = '';
		if (apsUp > 0) apString += '<i class="fa-solid fa-arrow-up fa-fw text-success"></i><span class="text-success me-2"><strong> ' + apsUp + ' </strong></span>';
		else apString += '<i class="fa-solid fa-arrow-up fa-fw"></i><span class="me-2"><strong> ' + apsUp + ' </strong></span>';
		if (apsDown > 0) apString += '<i class="fa-solid fa-arrow-down fa-fw text-danger"></i><span class="text-danger me-2"><strong> ' + apsDown + ' </strong></span>';
		else apString += '<i class="fa-solid fa-arrow-down fa-fw"></i><span class="me-2"><strong> ' + apsDown + ' </strong></span>';
	
		// Process Switches
		var switchesUp = accountData[switchKey]['up'];
		var switchesDown = accountData[switchKey]['down'];
		var switchesString = '';
		if (switchesUp > 0) switchesString += '<i class="fa-solid fa-arrow-up fa-fw text-success"></i><span class="text-success me-2"><strong> ' + switchesUp + ' </strong></span>';
		else switchesString += '<i class="fa-solid fa-arrow-up fa-fw"></i><span class="me-2"><strong> ' +switchesUp + ' </strong></span>';
		if (switchesDown > 0) switchesString += '<i class="fa-solid fa-arrow-down fa-fw text-danger"></i><span class="text-danger me-2"><strong> ' + switchesDown + ' </strong></span>';
		else switchesString += '<i class="fa-solid fa-arrow-down fa-fw"></i><span class="me-2"><strong> ' + switchesDown + ' </strong></span>';
	
		// Process Gateways
		var gatewaysUp = accountData[gatewayKey]['up'];
		var gatewaysDown = accountData[gatewayKey]['down'];
		var gatewayString = '';
		if (gatewaysUp > 0) gatewayString += '<i class="fa-solid fa-arrow-up fa-fw text-success"></i><span class="text-success me-2"><strong> ' + gatewaysUp + ' </strong></span>';
		else gatewayString += '<i class="fa-solid fa-arrow-up fa-fw"></i><span class="me-2"><strong> ' + gatewaysUp + ' </strong></span>';
		if (gatewaysDown > 0) gatewayString += '<i class="fa-solid fa-arrow-down fa-fw text-danger"></i><span class="text-danger me-2"><strong> ' + gatewaysDown + ' </strong></span>';
		else gatewayString += '<i class="fa-solid fa-arrow-down fa-fw"></i><span class="me-2"><strong> ' + gatewaysDown + ' </strong></span>';
	
		// Process sites
		var siteDanger = 0;
		var siteWarning = 0;
		var siteMinor = 0;
		var siteOK = 0;
		/*var siteOK = accountData[k]['sites'].length;
		$.each(accountData[k]['sites'], function() {
			siteIssues = 4;
			var status = '<i class="fa-solid fa-circle fa-fw text-success"></i>';
			var healthReason = '';
			if (this['wan_uplinks_down'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-danger"></i>';
				healthReason = 'Gateway with WAN links down';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['wan_tunnels_down'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-danger"></i>';
				healthReason = 'Gateway with VPN Tunnels down';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['wlan_cpu_high'] > 1) {
				status = '<i class="fa-solid fa-circle fa-fw text-danger"></i>';
				healthReason = 'APs with high CPU usage';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['wlan_cpu_high'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-danger"></i>';
				healthReason = 'AP with high CPU usage';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['wired_cpu_high'] > 1) {
				status = '<i class="fa-solid fa-diamond text-danger"></i>';
				healthReason = 'Switches with high CPU usage';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['wired_cpu_high'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-danger"></i>';
				healthReason = 'Switch with high CPU usage';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['branch_cpu_high'] > 1) {
				status = '<i class="fa-solid fa-circle fa-fw text-danger"></i>';
				healthReason = 'Gateways with high CPU usage';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['branch_cpu_high'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-danger"></i>';
				healthReason = 'Gateway with high CPU usage';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['wlan_device_status_down'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-danger"></i>';
				healthReason = 'One or more APs are down';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['wired_device_status_down'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-danger"></i>';
				healthReason = 'One or more switches are down';
				if (siteIssues > 1) {
					siteIssues = 1;
					siteDanger++;
					siteOK--;
				}
			} else if (this['device_high_noise_5ghz'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-warning"></i>';
				healthReason = 'High noise on 5GHz';
				if (siteIssues > 2) {
					siteIssues = 2;
					siteWarning++;
					siteOK--;
				}
			} else if (this['device_high_noise_2_4ghz'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-warning"></i>';
				healthReason = 'High noise on 2.4GHz';
				if (siteIssues > 2) {
					siteIssues = 2;
					siteWarning++;
					siteOK--;
				}
			} else if (this['device_high_ch_5ghz'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-warning"></i>';
				healthReason = 'High channel utilization on 5GHz';
				if (siteIssues > 2) {
					siteIssues = 2;
					siteWarning++;
					siteOK--;
				}
			} else if (this['device_high_ch_2_4ghz'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-warning"></i>';
				healthReason = 'High channel utilization on 2.4GHz';
				if (siteIssues > 2) {
					siteIssues = 2;
					siteWarning++;
					siteOK--;
				}
			} else if (this['device_high_mem'] > 0) {
				status = '<i class="fa-solid fa-circle fa-fw text-minor"></i>';
				healthReason = 'Devices with high memory utilization';
				if (siteIssues > 3) {
					siteIssues = 3;
					siteMinor++;
					siteOK--;
				}
			}
		});
		*/
		var siteString = '';
		if (siteOK > 0) siteString += '<i class="fa-solid fa-circle fa-fw-pointer text-success"><strong> ' + siteOK + ' </strong></i>';
		if (siteDanger > 0) siteString += '<i class="fa-solid fa-circle fa-fw-pointer text-danger"><strong> ' + siteDanger + ' </strong></i>';
		if (siteWarning > 0) siteString += '<i class="fa-solid fa-circle fa-fw-pointer text-warning"><strong> ' + siteWarning + ' </strong></i>';
		if (siteMinor > 0) siteString += '<i class="fa-solid fa-circle fa-fw-pointer text-minor"><strong> ' + siteMinor + ' </strong></i>';
		
		var checkBtn = '<button class="btn btn-round btn btn-outline-info mt-3" onclick="goToAccount(\'' + key + '\',1)">Go To Account &nbsp;<strong><i class="fa-regular fa-circle-play fa-lg"></i></button>';
	
		var table = $('#account-table').DataTable();
		table.row.add([accountStatusString, '<strong>' + getNameforClientID(key) + '</strong>', clientString, apString, switchesString, gatewayString, siteString, checkBtn]);
		$('#account-table')
			.DataTable()
			.rows()
			.draw();
	}
	initializeTooltips(document.getElementById('account-table'));
}

function goToAccount(client_id, multiple) {
	if (!goToAllowed) {
		if (authNotification) authNotification.update({ type: 'warning', message: 'Authenticating with Central is still in progress' });
	} else {
		loadSingleAccount(client_id, multiple);
		window.location.href = window.location.href.substr(0, location.href.lastIndexOf('/') + 1) + 'single.html';
	}
}

function getWirelessClientOverviewForAccount(clientID) {
	// Get Up AP Count for account
	var wirelessUp = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/clients?filter=status%20in%20%28%27Connected%27%29%20and%20clientConnectionType%20eq%20%27Wireless%27&limit=1',
			access_token: getAccessTokenforClientID(clientID)
		}),
	};

	fetch(wirelessUp.url, {method: wirelessUp.method, headers: wirelessUp.headers, body: wirelessUp.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getWirelessClientOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			let response = commandResults;
			
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][clientKey]['wireless-connected'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
	
	// Get Down AP Count for account
	var wirelessDown = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/clients?filter=status%20in%20%28%27Failed%27%29%20and%20clientConnectionType%20eq%20%27Wireless%27&limit=1',
			access_token: getAccessTokenforClientID(clientID),
		}),
	};

	fetch(wirelessDown.url, {method: wirelessDown.method, headers: wirelessDown.headers, body: wirelessDown.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		let result = processStatus(commandResults);
		
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getWirelessClientOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			let response = commandResults;
			
			//console.log(response)
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][clientKey]['wireless-disconnected'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
}

function getWiredClientOverviewForAccount(clientID) {
	// Get Up AP Count for account
	var wiredUp = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/clients?filter=status%20in%20%28%27Connected%27%29%20and%20clientConnectionType%20eq%20%27Wired%27&limit=1',
			access_token: getAccessTokenforClientID(clientID)
		}),
	};

	fetch(wiredUp.url, {method: wiredUp.method, headers: wiredUp.headers, body: wiredUp.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		let result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getWiredClientOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			let response = commandResults;
			
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][clientKey]['wired-connected'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
	
	// Get Down AP Count for account
	var wiredDown = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/clients?filter=status%20in%20%28%27Failed%27%29%20and%20clientConnectionType%20eq%20%27Wired%27&limit=1',
			access_token: getAccessTokenforClientID(clientID),
		}),
	};

	fetch(wiredDown.url, {method: wiredDown.method, headers: wiredDown.headers, body: wiredDown.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		let result = processStatus(commandResults);
		
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getWiredClientOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			let response = commandResults;
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][clientKey]['wired-disconnected'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
}

function getAPOverviewForAccount(clientID) {
	// Get Up AP Count for account
	var settingsUp = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/devices?filter=status%20eq%20ONLINE%20and%20deviceType%20eq%20ACCESS_POINT&limit=1', 
			access_token: getAccessTokenforClientID(clientID)
		}),
	};

	fetch(settingsUp.url, {method: settingsUp.method, headers: settingsUp.headers, body: settingsUp.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getAPOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			var response = commandResults;
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][apKey]['up'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
	
	// Get Down AP Count for account
	var settingsDown = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/devices?filter=status%20eq%20OFFLINE%20and%20deviceType%20eq%20ACCESS_POINT&limit=1',
			access_token: getAccessTokenforClientID(clientID),
		}),
	};

	fetch(settingsDown.url, {method: settingsDown.method, headers: settingsDown.headers, body: settingsDown.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getAPOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			var response = commandResults;
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][apKey]['down'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
}

function getSwitchOverviewForAccount(clientID) {
	// Get Up AP Count for account
	var settingsUp = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/devices?filter=status%20eq%20ONLINE%20and%20deviceType%20eq%20SWITCH&limit=1', 
			access_token: getAccessTokenforClientID(clientID)
		}),
	};

	fetch(settingsUp.url, {method: settingsUp.method, headers: settingsUp.headers, body: settingsUp.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getSwitchOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			var response = commandResults;
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][switchKey]['up'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
	
	// Get Down AP Count for account
	var settingsDown = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/devices?filter=status%20eq%20OFFLINE%20and%20deviceType%20eq%20SWITCH&limit=1',
			access_token: getAccessTokenforClientID(clientID),
		}),
	};

	fetch(settingsDown.url, {method: settingsDown.method, headers: settingsDown.headers, body: settingsDown.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getSwitchOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			var response = commandResults;
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][switchKey]['down'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
}

function getGatewayOverviewForAccount(clientID) {
	// Get Up AP Count for account
	var settingsUp = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/devices?filter=status%20eq%20ONLINE%20and%20deviceType%20eq%20GATEWAY&limit=1', 
			access_token: getAccessTokenforClientID(clientID)
		}),
	};

	fetch(settingsUp.url, {method: settingsUp.method, headers: settingsUp.headers, body: settingsUp.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getGatewayOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			var response = commandResults;
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][gatewayKey]['up'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
	
	// Get Down AP Count for account
	var settingsDown = {
		url: getAPIURL() + '/tools/getCommand',
		method: 'POST',
		timeout: 0,
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			url: getbaseURLforClientID(clientID) + '/network-monitoring/v1/devices?filter=status%20eq%20OFFLINE%20and%20deviceType%20eq%20GATEWAY&limit=1',
			access_token: getAccessTokenforClientID(clientID),
		}),
	};

	fetch(settingsDown.url, {method: settingsDown.method, headers: settingsDown.headers, body: settingsDown.data}).then(r => r.json()).then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		
		// Process The status code of the result
		var result = processStatus(commandResults);
		
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getGatewayOverviewForAccount, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (!multipleMonitoringData[clientID]['errorNotified']) {
				multipleMonitoringData[clientID]['errorNotified'] = true;
				showNotification('ca-globe', 'Aruba Central returned HTTP ' + result + ' for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
			}
		} else {
			var response = commandResults;
			multipleMonitoringData[clientID][statusKey] = 'up';
			multipleMonitoringData[clientID][gatewayKey]['down'] = response.total;
			saveDataToDB('multiple_monitoring', JSON.stringify(multipleMonitoringData));
			loadMultipleAccountTable();
			updateOverallUI();
			localStorage.setItem('multiple_update', +new Date());
		}
	}).catch(function(err) {
		if (!multipleMonitoringData[clientID]['errorNotified']) {
			multipleMonitoringData[clientID]['errorNotified'] = true;
			console.error('API error for ' + getNameforClientID(clientID) + ':', err);
			showNotification('ca-globe', 'Cannot connect to Aruba Central for "' + getNameforClientID(clientID) + '".', 'bottom', 'center', 'danger');
		}
	});
}