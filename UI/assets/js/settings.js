/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var verifyNotification;
var authNotification;

var authCounter = 0;
var authErrorCount = 0;

var verifyAuthPromise = null;
var verifyAuthResolve;

/*  ----------------------------------------------------------------------------------
	Account functions
	---------------------------------------------------------------------------------- */

function loadGlobalSettings() {
	var showingSecrets = localStorage.getItem('reveal_secrets');
	if (showingSecrets != null && showingSecrets != "undefined") {
		document.getElementById("revealSecrets").checked = JSON.parse(showingSecrets);
	} else {
		document.getElementById("revealSecrets").checked = true;
		localStorage.setItem('reveal_secrets',true);
	}
	
	var refreshRate = localStorage.getItem('refresh_rate');
	if (refreshRate != null && refreshRate != "undefined") {
		document.getElementById("refresh_rate").value = refreshRate;
	}
}

function saveGlobalSettings() {
	//console.log('saveGlobalSettings')
	localStorage.setItem('refresh_rate', document.getElementById('refresh_rate').value);
	//localStorage.setItem('data_optimization', document.getElementById('scaleselector').value);
	localStorage.setItem('load_clients_wireless', document.getElementById('load_clients_wireless').checked);
	localStorage.setItem('load_clients_wired', document.getElementById('load_clients_wired').checked);
	localStorage.setItem('load_aps', document.getElementById('load_aps').checked);
	localStorage.setItem('load_switches', document.getElementById('load_switches').checked);
	localStorage.setItem('load_gateways', document.getElementById('load_gateways').checked);
/*	localStorage.setItem('load_airmatch_events', document.getElementById('load_airmatch_events').checked);
	localStorage.setItem('load_optimization_history', document.getElementById('load_optimization_history').checked);
	localStorage.setItem('ap_naming_format', document.getElementById('ap_naming_format').value);
	localStorage.setItem('hostname_variable', document.getElementById('hostname_variable').value);
	localStorage.setItem('port_variable_format', document.getElementById('port_variable_format').value);
	localStorage.setItem('qr_color', document.getElementById('color_picker').value);
	localStorage.setItem('qr_logo', document.getElementById('qr_logo').value);
	*/
	logNote('Central Automation Studio settings saved');
	
	// remove that update is in progress
	localStorage.removeItem('update_in_progress');
}


/*  ----------------------------------------------------------------------------------
	Account functions
	---------------------------------------------------------------------------------- */

function addAccount() {
	document.getElementById('account_name').value = '';
	document.getElementById('cop_address').value = '';
	document.getElementById('central_id').value = '';
	document.getElementById('client_id').value = '';
	document.getElementById('client_id').disabled = false;
	document.getElementById('client_secret').value = '';
	document.getElementById('access_token').value = '';
	document.getElementById('expires_at').value = '';
	document.getElementById('expires_at_string').value = '';
	var clusterChoices = getClusterSelector();
	clusterChoices.removeActiveItems();
	isCOPSelected();
	new bootstrap.Modal(document.getElementById('AccountModal')).show();
}

function saveAccount() {
	loadCentralAccountDetails();
	// Save all supplied addresses and details to the array of accounts
	var currentAccount = checkForDuplicateAccount(document.getElementById('client_id').value);
	
	var clusterChoices = getClusterSelector();
	var selectedCluster = clusterChoices.getValue(true);

	if (currentAccount == -1) {
		centralCredentials.push({ account_name: document.getElementById('account_name').value, central_id: document.getElementById('central_id').value.trim(), client_id: document.getElementById('client_id').value.trim(), client_secret: document.getElementById('client_secret').value.trim(), base_url: selectedCluster, cop_address: document.getElementById('cop_address').value, expires_at: document.getElementById('expires_at').value.trim(), access_token: document.getElementById('access_token').value.trim() });

		// save array to localStorage
		localStorage.setItem('account_details', JSON.stringify(centralCredentials));
	} else {
		//modify existing account
		centralCredentials[currentAccount] = { account_name: document.getElementById('account_name').value, central_id: document.getElementById('central_id').value.trim(), client_id: document.getElementById('client_id').value.trim(), client_secret: document.getElementById('client_secret').value.trim(), base_url: selectedCluster, cop_address: document.getElementById('cop_address').value, expires_at: document.getElementById('expires_at').value.trim(), access_token: document.getElementById('access_token').value.trim() };
		localStorage.setItem('account_details', JSON.stringify(centralCredentials));
	}

	loadAccountTable();
	localStorage.removeItem('monitoring_update');
	(bootstrap.Modal.getInstance(document.getElementById('AccountModal')) || new bootstrap.Modal(document.getElementById('AccountModal'))).hide();
}

function cancelAccount() {
	(bootstrap.Modal.getInstance(document.getElementById('AccountModal')) || new bootstrap.Modal(document.getElementById('AccountModal'))).hide();
}

function editAccount(clientID) {
	loadCentralAccountDetails();
	var account = centralCredentials[checkForDuplicateAccount(clientID)];
	document.getElementById('account_name').value = account.account_name;
	document.getElementById('central_id').value = account.central_id ? account.central_id : '';
	document.getElementById('client_id').value = account.client_id;
	document.getElementById('client_id').disabled = true;
	document.getElementById('client_secret').value = account.client_secret;
	var clusterChoices = getClusterSelector();
	clusterChoices.setChoiceByValue([account.base_url]);
	//document.getElementById('clusterselector').value = account.base_url;
	document.getElementById('cop_address').value = account.cop_address ? account.cop_address : '';
	document.getElementById('access_token').value = account.access_token;
	document.getElementById('expires_at').value = account.expires_at;
	
	// Convert timestamp into actual date
	var expiryEpoch = account.expires_at;
	if (expiryEpoch < 10000000000) expiryEpoch *= 1000; // convert to milliseconds (Epoch is usually expressed in seconds, but Javascript uses Milliseconds)
	var expiryEpoch = expiryEpoch + new Date().getTimezoneOffset() * -1; //for timeZone
	eventTime = new Date(expiryEpoch);
	document.getElementById('expires_at_string').value = eventTime.toLocaleString();
	
	isCOPSelected();
	new bootstrap.Modal(document.getElementById('AccountModal')).show();
}

function deleteAccount(clientID) {
	Swal.fire({
		title: 'Are you sure you want to delete?',
		icon: 'question',
		showDenyButton: true,
		confirmButtonText: `Yes`,
		denyButtonText: `No`,
	}).then(result => {
		if (result.isConfirmed) {
			loadCentralAccountDetails();
			centralCredentials.splice(checkForDuplicateAccount(clientID), 1);
			localStorage.setItem('account_details', JSON.stringify(centralCredentials));
			loadAccountTable();
		}
	});
}

function loadAccountTable() {
	$('#account-table')
		.DataTable()
		.clear();

	var showSecrets = JSON.parse(localStorage.getItem('reveal_secrets'));

	loadCentralAccountDetails();
	centralCredentials.forEach(function(cred) {
		var btnString = '<a href="#" class="btn btn-link btn-warning edit"><i class="fa-solid fa-edit" style="color: #67748e; font-size:18px;"></i></a><a href="#" class="btn btn-link btn-danger remove"><i class="fa-solid fa-trash-can" style="color: #67748e; font-size:18px;"></i></a>';

		var table = $('#account-table').DataTable();
		if (showSecrets) {
			table.row.add(['<strong>' + cred['account_name'] + '</strong>', getClusterName(cred['base_url']), cred['client_id'], cred['client_secret'], btnString]);
		} else {
			table.row.add(['<strong>' + cred['account_name'] + '</strong>', getClusterName(cred['base_url']), cred['client_id'], '********', btnString]);
		}
	});
	$('#account-table')
		.DataTable()
		.rows()
		.draw();
	$('#account-table').DataTable().columns.adjust().draw();
		
	if (document.getElementById('casType')) {
		if (centralCredentials.length == 0) {
			document.getElementById('casType').innerHTML = 'No Account Configured';
			document.getElementById('casTypeColor').classList.add('bg-gradient-dark');
			document.getElementById('casTypeColor').classList.remove('bg-gradient-primary');
			document.getElementById('casTypeColor').classList.remove('bg-gradient-info');
			document.getElementById('newAccountBtn').classList.remove('btn-light');
			document.getElementById('newAccountBtn').classList.add('btn-primary');
			document.getElementById('goBtn').style.visibility = 'hidden';
		} else if (centralCredentials.length == 1) {
			document.getElementById('casType').innerHTML = 'Single Account Mode';
			document.getElementById('casTypeColor').classList.add('bg-gradient-info');
			document.getElementById('casTypeColor').classList.remove('bg-gradient-primary');
			document.getElementById('casTypeColor').classList.remove('bg-gradient-dark');
			document.getElementById('newAccountBtn').classList.add('btn-light');
			document.getElementById('newAccountBtn').classList.remove('btn-primary');
			document.getElementById('goBtn').style.visibility = 'visible';
		} else {
			document.getElementById('casType').innerHTML = 'Multiple Account Mode';
			document.getElementById('casTypeColor').classList.add('bg-gradient-primary');
			document.getElementById('casTypeColor').classList.remove('bg-gradient-info');
			document.getElementById('casTypeColor').classList.remove('bg-gradient-dark');
			document.getElementById('newAccountBtn').classList.add('btn-light');
			document.getElementById('newAccountBtn').classList.remove('btn-primary');
			document.getElementById('goBtn').style.visibility = 'visible';
		}
	}
}

function isCOPSelected() {
	if (document.getElementById('clusterselector').value === getAPIGateway('Central On-Prem')) {
		document.getElementById('cop_address_row').hidden = false;
	} else {
		document.getElementById('cop_address_row').hidden = true;
	}
}

function showSecrets() {
	localStorage.setItem('reveal_secrets', document.getElementById('revealSecrets').checked);
	loadAccountTable();
}


/*  ----------------------------------------------------------------------------------
	Account Verification (initial token generation)
---------------------------------------------------------------------------------- */
function verifyAccount() {
	if (document.getElementById('AccountForm').checkValidity()) {
		verifyNotification = showNotification('ca-padlock', 'Verifying credentials details with GreenLake...', 'bottom', 'center', 'info');
		
		let tokenURL = glpAuthURL;
		var clusterChoices = getClusterSelector();
		var selectedCluster = clusterChoices.getValue(true);
		if (selectedCluster.includes('arubadev.cloud.hpe.com')) tokenURL = glpDevAuthURL;
		
		fetch(getAPIURL() + '/v2/auth/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_id: document.getElementById('client_id').value,
				client_secret: document.getElementById('client_secret').value,
				token_url: tokenURL,
			}),
		}).then(function(resp) { return resp.json(); })
		.then(function(response) {
			if (response.hasOwnProperty('status')) {
				if (response.status === '503') {
					logError('Central Server Error (503): ' + response.reason + ' (/v2/auth/token)');
					return;
				}
			}
			if (response.hasOwnProperty('error')) {
				Swal.fire({
					title: 'Central API connection failed',
					text: response.error_description.replace('refresh_token', 'Refresh Token'),
					icon: 'error',
				});
			} else {
				//console.log(response)
				document.getElementById('access_token').value = response.access_token;
				document.getElementById('expires_at').value = response.expires_at;
				
				// Convert timestamp into actual date
				var expiryEpoch = response.expires_at;
				if (expiryEpoch < 10000000000) expiryEpoch *= 1000; // convert to milliseconds (Epoch is usually expressed in seconds, but Javascript uses Milliseconds)
				var expiryEpoch = expiryEpoch + new Date().getTimezoneOffset() * -1; //for timeZone
				eventTime = new Date(expiryEpoch);
				document.getElementById('expires_at_string').value = eventTime.toLocaleString();
				
				verifyNotification.update({ type: 'success', message: '"' + document.getElementById('account_name').value + '" authenticated successfully with GreenLake' });
				
				verifyCentralInstance();
			}
		}).catch(function(err) {
			console.log('error', err);
			showNotification('ca-globe', 'Cannot connect to API server', 'bottom', 'center', 'danger');
		});
	}
}

function verifyCentralInstance() {
	verifyNotification = showNotification('ca-padlock', 'Verifying selected Central Cluster...', 'bottom', 'center', 'info');
	
	let clusterChoices = getClusterSelector();
	let selectedCluster = clusterChoices.getValue(true);
	let selectedClusterName = clusterChoices.getValue().label;
	
	fetch(getAPIURL() + '/tools/getCommandwHeaders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			url: selectedCluster + '/network-monitoring/v1/devices?filter=deviceType%20eq%20ACCESS_POINT&limit=1',
			access_token: document.getElementById('access_token').value
		}),
	}).then(function(resp) { return resp.json(); })
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}

		// Process The status code of the result
		let result = processStatus(commandResults);
		//console.log(commandResults)
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(verifyCentralInstance, apiWaitDelay);
		} else if (result !== 200) {
			// Show message for error
			verifyNotification.update({ type: 'danger', message: 'Please ensure you have selected the correct Central Cluster' });
			saveAccount();
		} else {
			verifyNotification.update({ type: 'success', message: '"' + document.getElementById('account_name').value + '" connected successfully with ' + selectedClusterName });
			saveAccount();
		}
	}).catch(function(err) {
		showNotification('ca-globe', 'Cannot connect to API server', 'bottom', 'center', 'danger');
	});
}

/*  ----------------------------------------------------------------------------------
	Leaving Settings
---------------------------------------------------------------------------------- */
function switchToDashboard() {
		// Save all supplied addresses and details
		saveGlobalSettings();
		tokenRefreshForAllAccounts();
}

function tokenRefreshForAllAccounts() {
	authNotification = showNotification('ca-padlock', 'Verifying Access Tokens with Central...', 'bottom', 'center', 'info');
	logStart('Verifying Access Tokens with Central...');
	authCounter = 0;
	authErrorCount = 0;
	verifyAuthPromise = new Promise(function(resolve) { verifyAuthResolve = resolve; });

	loadCentralAccountDetails();
	centralCredentials.forEach(function(cred) {
		tokenRefreshForAccount(cred['client_id']);
	});
	return verifyAuthPromise;
}

function checkAuthComplete() {
	if (authCounter >= centralCredentials.length) {
		if ((authErrorCount > 0) && (centralCredentials.length < 2)) {
			logError(authErrorCount+' accounts failed to be verified with Central');
			document.getElementById('ErrorModalLink').click();
			Swal.fire({
				title: 'Central API connection failed',
				text: 'One or more Central accounts failed to authenticate correctly',
				icon: 'error',
			});
		} else {
			if (authErrorCount > 0) logError(authErrorCount+' accounts failed to be verified with Central');
			
			var path = window.location.pathname;
			var page = path.split('/').pop();
			if (page.includes('settings')) {
				// If more than one account configured go to Hydra dashboard
				if (centralCredentials.length > 1) {
					window.location.href = window.location.href.substr(0, location.href.lastIndexOf('/') + 1) + 'dashboards/multiple.html';
				} else {
					// if only one account configured, go to the individual dashboard
					loadSingleAccount(centralCredentials[0].client_id);
				}
			}
		}
		if (verifyAuthResolve) verifyAuthResolve();
	}
}

function tokenRefreshForAccount(clientID) {
	fetch(getAPIURL() + '/v2/auth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: clientID,
			client_secret: getClientSecretforClientID(clientID),
			token_url: glpAuthURL,
		}),
	}).then(function(resp) { return resp.json(); })
	.then(function(response) {
		if (response.hasOwnProperty('status')) {
			if (response.status === '503') {
				logError('Central Server Error (503): ' + response.reason + ' (/auth/refresh)');
				authErrorCount++;
				authCounter++;
				checkAuthComplete();
				return;
			}
		}
		if (response.hasOwnProperty('error')) {
			logError(response.error_description.replace('refresh_token', 'Refresh Token') + ' for Central Account "' + getNameforClientID(clientID) + '"');
			showNotification('ca-padlock', response.error_description.replace('refresh_token', 'Refresh Token') + ' for Central Account "' + getNameforClientID(clientID) + '"', 'bottom', 'center', 'danger');
			authErrorCount++;
		} else {
			var cluster = getAccountforClientID(clientID);
			cluster['access_token'] = response.access_token;
			cluster['expires_at'] = response.expires_at;
			updateAccountDetails(cluster);

			var path = window.location.pathname;
			var page = path.split('/').pop();
			if (page.includes('settings')) {
				// refresh settings page table
				loadAccountTable();
			}
		}
		authCounter++;
		checkAuthComplete();
	}).catch(function(err) {
		// Network error (i.e. connection refused, access denied due to CORS, etc.)
		showNotification('ca-globe', 'Cannot connect to API server', 'bottom', 'center', 'danger');
		authErrorCount++;
		authCounter++;
		checkAuthComplete();
	});
}

function loadSingleAccount(client_id) {
	// get account details and save them out
	var account = getAccountforClientID(client_id);
		//console.log(account)
	//localStorage.setItem('central_id', account.central_id);
	localStorage.setItem('client_id', account.client_id);
	localStorage.setItem('client_secret', account.client_secret);
	localStorage.setItem('base_url', account.base_url);
	localStorage.setItem('access_token', account.access_token);
	localStorage.setItem('expires_at', account.expires_at);

	localStorage.removeItem('monitoring_update');
	window.location.href = window.location.href.substr(0, location.href.lastIndexOf('/') + 1) + 'dashboards/single.html';
}


/*  ----------------------------------------------------------------------------------
	Settings Management
---------------------------------------------------------------------------------- */
function exportSettings() {
	var exportData = {};
	exportData['account_details'] = localStorage.getItem('account_details');
	exportData['reveal_secrets'] = localStorage.getItem('reveal_secrets');
	exportData['refresh_rate'] = localStorage.getItem('refresh_rate');
	/*exportData['ap_naming_format'] = localStorage.getItem('ap_naming_format');
	exportData['hostname_variable'] = localStorage.getItem('hostname_variable');
	exportData['port_variable_format'] = localStorage.getItem('port_variable_format');
	console.log(localStorage.getItem('refresh_rate'))
	exportData['qr_color'] = localStorage.getItem('qr_color');
	exportData['qr_logo'] = localStorage.getItem('qr_logo');*/
	exportData['load_clients_wireless'] = localStorage.getItem('load_clients_wireless');
	exportData['load_clients_wired'] = localStorage.getItem('load_clients_wired');
	exportData['load_aps'] = localStorage.getItem('load_aps');
	exportData['load_switches'] = localStorage.getItem('load_switches');
	exportData['load_gateways'] = localStorage.getItem('load_gateways');
	
	//console.log(exportData)
	
	var exportBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'text/plain' });
	var exportURL = window.URL.createObjectURL(exportBlob);
	var exportLink = document.createElement('a');
	exportLink.href = exportURL;
	exportLink.setAttribute('download', 'cas-settings.json');
	exportLink.click();
	window.URL.revokeObjectURL(exportLink);
}

function importSettings() {
	var files = document.getElementById('import').files;
	//console.log(files);
	if (files.length <= 0) {
		showNotification('ca-migration', 'Please select a backup file', 'bottom', 'center', 'danger');
		return false;
	}
	
	Swal.fire({
		title: 'Are you sure?',
		text: 'Importing settings will overwrite the current settings with those in the selected file.',
		icon: 'warning',
		showCancelButton: true,
		//confirmButtonColor: '#3085d6',
		//cancelButtonColor: '#d33',
		confirmButtonText: 'Yes, import it!',
	}).then(result => {
		if (result.isConfirmed) {
			importConfirmed();
		}
	});
}
	
function importConfirmed() {
	var files = document.getElementById('import').files;
	
	var fr = new FileReader();
	fr.onload = function(e) { 
	var importData = JSON.parse(e.target.result);
		//console.log(importData);
		if (importData['account_details']) {
			if (importData['account_details']) localStorage.setItem('account_details', importData['account_details']);
			if (importData['refresh_rate']) localStorage.setItem('refresh_rate', importData['refresh_rate']);
			else localStorage.setItem('refresh_rate', '');
			/*if (importData['reveal_secrets']) localStorage.setItem('reveal_secrets', importData['reveal_secrets']);
			if (importData['ap_naming_format']) localStorage.setItem('ap_naming_format', importData['ap_naming_format']);
			else localStorage.setItem('ap_naming_format', '');
			if (importData['hostname_variable']) localStorage.setItem('hostname_variable', importData['hostname_variable']);
			else localStorage.setItem('hostname_variable', '');
			if (importData['port_variable_format']) localStorage.setItem('port_variable_format', importData['port_variable_format']);
			else localStorage.setItem('port_variable_format', '');
			if (importData['qr_color']) localStorage.setItem('qr_color', importData['qr_color']);
			if (importData['qr_logo']) localStorage.setItem('qr_logo', importData['qr_logo']);
			else localStorage.setItem('qr_logo', '');*/
			if (importData['load_clients_wireless']) localStorage.setItem('load_clients_wireless', importData['load_clients_wireless']);
			if (importData['load_clients_wired']) localStorage.setItem('load_clients_wired', importData['load_clients_wired']);
			if (importData['load_aps']) localStorage.setItem('load_aps', importData['load_aps']);
			if (importData['load_switches']) localStorage.setItem('load_switches', importData['load_switches']);
			if (importData['load_gateways']) localStorage.setItem('load_gateways', importData['load_gateways']);
			
			Swal.fire({
				title: 'Settings Import Successful!',
				text: 'Backup has been imported. Reload for changes to take effect',
				icon: 'success',
				confirmButtonText: 'Reload Now',
			}).then(result => {
				if (result.isConfirmed) {
					location.reload();
				}
			});
		} else {
			Swal.fire({
				title: 'Settings Import Failed',
				text: 'File does not seem to be a Central Automation Studio backup.',
				icon: 'error',
			});
		}
		
	}
	fr.readAsText(files.item(0));
}
