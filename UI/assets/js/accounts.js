/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/


var centralCredentials = [];

/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	Account Detail Loading
------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */
function loadCentralAccountDetails() {
	var account_details = localStorage.getItem('account_details');
	if (account_details != null && account_details != 'undefined') {
		centralCredentials = JSON.parse(account_details);
		if (document.getElementById('dashboardLink')) {
			if (centralCredentials.length > 1) {
				document.getElementById('dashboardLink').setAttribute('href', '/dashboards/multiple.html');
			} else {
				document.getElementById('dashboardLink').setAttribute('href', '/dashboards/single.html');
			}
		}
	}
}

function getbaseURLforClientID(client_id) {
	baseURL = '';
	loadCentralAccountDetails();
	for (i = 0; i < centralCredentials.length; i++) {
		if (centralCredentials[i].client_id === client_id) {
			baseURL = centralCredentials[i].base_url;
			if (baseURL === getAPIGateway('Central On-Prem')) {
				baseURL = cop_url + centralCredentials[i].cop_address;
			}
		}
	}
	return baseURL;
}

function getAccessTokenforClientID(client_id) {
	accessToken = '';
	loadCentralAccountDetails();
	for (i = 0; i < centralCredentials.length; i++) {
		if (centralCredentials[i].client_id === client_id) accessToken = centralCredentials[i].access_token;
	}
	return accessToken;
}

function getRefreshTokenforClientID(client_id) {
	refreshToken = '';
	loadCentralAccountDetails();
	for (i = 0; i < centralCredentials.length; i++) {
		if (centralCredentials[i].client_id === client_id) refreshToken = centralCredentials[i].refresh_token;
	}
	return refreshToken;
}

function getClientSecretforClientID(client_id) {
	clientSecret = '';

	loadCentralAccountDetails();
	for (i = 0; i < centralCredentials.length; i++) {
		if (centralCredentials[i].client_id === client_id) clientSecret = centralCredentials[i].client_secret;
	}
	return clientSecret;
}

function getNameforClientID(client_id) {
	name = '';

	loadCentralAccountDetails();
	for (i = 0; i < centralCredentials.length; i++) {
		if (centralCredentials[i].client_id === client_id) name = centralCredentials[i].account_name;
	}
	return name;
}

function getAccountforClientID(client_id) {
	foundAccount = {};

	loadCentralAccountDetails();
	for (i = 0; i < centralCredentials.length; i++) {
		if (centralCredentials[i].client_id === client_id) foundAccount = centralCredentials[i];
	}
	return foundAccount;
}

function getAccountforName(account_name) {
	foundAccount = {};

	loadCentralAccountDetails();
	for (i = 0; i < centralCredentials.length; i++) {
		if (centralCredentials[i].account_name === account_name) foundAccount = centralCredentials[i];
	}
	return foundAccount;
}

function updateAccountDetails(account) {
	loadCentralAccountDetails();
	centralCredentials[checkForDuplicateAccount(account.client_id)] = account;
	localStorage.setItem('account_details', JSON.stringify(centralCredentials));
}

function checkForDuplicateAccount(client_id) {
	foundAccount = -1;
	for (i = 0; i < centralCredentials.length; i++) {
		if (centralCredentials[i].client_id === client_id) foundAccount = i;
	}
	return foundAccount;
}

//  --------------------------------------
//	 Account List dropdown
//	--------------------------------------
function loadAccountList() {
	loadCentralAccountDetails();
	
	if (centralCredentials.length > 0) {
		document.getElementById('accountDropdownList').innerHTML = "";
		centralCredentials.sort((a,b) => (a.account_name > b.account_name) ? 1 : ((b.account_name > a.account_name) ? -1 : 0))
		centralCredentials.forEach(function(cred) {
			if (localStorage.getItem('client_id') === cred.client_id) {
				document.getElementById('accountDropdownList').innerHTML += '<a href="javascript:switchAccount(\''+cred.client_id+'\', 1);" class="dropdown-item"><div class="d-flex py-1"><div class="my-auto"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32"><title>radio-checked</title><g fill="#344767" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="10"><circle cx="16" cy="16" r="14" fill="none" stroke="#344767" stroke-width="2"></circle><circle cx="16" cy="16" r="6" fill="#344767" stroke="none" data-stroke="none"></circle></g></svg></div><div class="d-flex flex-column justify-content-center"><h6 class="text-sm font-weight-normal mb-0 ms-2 ">'+cred.account_name+'</h6></div></div></a>';
			} else {
				document.getElementById('accountDropdownList').innerHTML += '<a href="javascript:switchAccount(\''+cred.client_id+'\', 1);" class="dropdown-item"><div class="d-flex py-1"><div class="my-auto"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32"><title>circle-dotted</title><g fill="#344767" stroke-linecap="square" stroke-linejoin="miter"><path d="M14.75 2.25C14.75 1.55964 15.3096 1 16 1C16.6904 1 17.25 1.55964 17.25 2.25C17.25 2.94036 16.6904 3.5 16 3.5C15.3096 3.5 14.75 2.94036 14.75 2.25Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M14.75 29.75C14.75 29.0596 15.3096 28.5 16 28.5C16.6904 28.5 17.25 29.0596 17.25 29.75C17.25 30.4404 16.6904 31 16 31C15.3096 31 14.75 30.4404 14.75 29.75Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M29.75 14.75C30.4404 14.75 31 15.3096 31 16C31 16.6904 30.4404 17.25 29.75 17.25C29.0596 17.25 28.5 16.6904 28.5 16C28.5 15.3096 29.0596 14.75 29.75 14.75Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M2.25 14.75C2.94036 14.75 3.5 15.3096 3.5 16C3.5 16.6904 2.94036 17.25 2.25 17.25C1.55964 17.25 1 16.6904 1 16C1 15.3096 1.55964 14.75 2.25 14.75Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M24.8388 5.39342C25.3269 4.90527 26.1184 4.90527 26.6065 5.39342C27.0947 5.88158 27.0947 6.67304 26.6065 7.16119C26.1184 7.64935 25.3269 7.64935 24.8388 7.16119C24.3506 6.67304 24.3506 5.88158 24.8388 5.39342Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M5.39346 24.8389C5.88162 24.3508 6.67307 24.3508 7.16123 24.839C7.64938 25.3271 7.64938 26.1186 7.16123 26.6067C6.67307 27.0949 5.88162 27.0949 5.39346 26.6067C4.9053 26.1186 4.90531 25.3271 5.39346 24.8389Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M26.6066 24.8388C27.0948 25.327 27.0948 26.1184 26.6066 26.6066C26.1185 27.0948 25.327 27.0948 24.8388 26.6066C24.3507 26.1184 24.3507 25.327 24.8388 24.8388C25.327 24.3507 26.1185 24.3507 26.6066 24.8388Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M7.16105 5.3934C7.64921 5.88156 7.64921 6.67301 7.16105 7.16117C6.67289 7.64932 5.88144 7.64932 5.39328 7.16117C4.90513 6.67301 4.90513 5.88155 5.39328 5.3934C5.88144 4.90524 6.67289 4.90524 7.16105 5.3934Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M29.9165 21.4014C29.8864 22.0911 29.3028 22.6258 28.6132 22.5957C27.9235 22.5656 27.3888 21.9821 27.4189 21.2924C27.449 20.6027 28.0325 20.068 28.7222 20.0981C29.4119 20.1282 29.9466 20.7117 29.9165 21.4014Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M4.58079 10.7078C4.55068 11.3975 3.96716 11.9322 3.27746 11.9021C2.58776 11.872 2.05306 11.2885 2.08317 10.5988C2.11328 9.90906 2.69681 9.37436 3.38651 9.40447C4.0762 9.43458 4.6109 10.0181 4.58079 10.7078Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M11.9018 28.7224C11.8717 29.4121 11.2882 29.9468 10.5985 29.9167C9.9088 29.8866 9.3741 29.303 9.40422 28.6133C9.43433 27.9236 10.0179 27.3889 10.7076 27.4191C11.3972 27.4492 11.9319 28.0327 11.9018 28.7224Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M22.5959 3.38682C22.5658 4.07652 21.9823 4.61122 21.2926 4.58111C20.6029 4.55099 20.0682 3.96747 20.0983 3.27777C20.1284 2.58807 20.7119 2.05337 21.4016 2.08349C22.0913 2.1136 22.626 2.69712 22.5959 3.38682Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M29.9868 10.8779C29.9567 11.5676 29.3732 12.1023 28.6835 12.0722C27.9938 12.0421 27.4591 11.4586 27.4892 10.7689C27.5193 10.0792 28.1028 9.54446 28.7925 9.57457C29.4822 9.60469 30.0169 10.1882 29.9868 10.8779Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M4.51023 21.2312C4.48012 21.9209 3.8966 22.4556 3.2069 22.4255C2.5172 22.3954 1.9825 21.8118 2.01261 21.1221C2.04273 20.4324 2.62625 19.8977 3.31595 19.9278C4.00565 19.958 4.54035 20.5415 4.51023 21.2312Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M22.4253 28.7928C22.3952 29.4825 21.8116 30.0172 21.1219 29.9871C20.4322 29.9569 19.8975 29.3734 19.9277 28.6837C19.9578 27.994 20.5413 27.4593 21.231 27.4894C21.9207 27.5195 22.4554 28.1031 22.4253 28.7928Z" fill="#344767" data-stroke="none" stroke="none"></path> <path d="M12.072 3.31614C12.0419 4.00584 11.4584 4.54054 10.7687 4.51043C10.079 4.48031 9.54427 3.89679 9.57438 3.20709C9.60449 2.51739 10.188 1.98269 10.8777 2.01281C11.5674 2.04292 12.1021 2.62644 12.072 3.31614Z" fill="#344767" data-stroke="none" stroke="none"></path></g></svg></div><div class="d-flex flex-column justify-content-center"><h6 class="text-sm font-weight-normal mb-0 ms-2 ">'+cred.account_name+'</h6></div></div></a>';
			} 
		});
		
		document.getElementById('accountDropdownList').innerHTML += '<div class="divider"></div>';
		if (centralCredentials.length == 1) {
			document.getElementById('accountDropdownList').innerHTML += '<a href="../dashboards/single.html" class="dropdown-item"><div class="d-flex py-1"><div class="my-auto"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 64 64"><title>dashboard</title><g fill="#344767" stroke-linecap="square" stroke-linejoin="miter" transform="translate(0.5 0.5)" stroke-miterlimit="10"><line x1="29.086" y1="34.755" x2="22" y2="22" fill="none" stroke="#344767" stroke-width="3" stroke-linecap="butt"></line><circle cx="32" cy="32" r="29" fill="none" stroke="#344767" stroke-width="3"></circle><path d="M38,40H52.493a22,22,0,1,0-40.986,0H26" fill="none" stroke="#344767" stroke-width="3"></path><circle cx="32" cy="40" r="6" fill="none" stroke="#344767" stroke-width="3"></circle></g></svg></div><div class="d-flex flex-column justify-content-center"><h6 class="text-sm font-weight-normal mb-0 ms-2 ">Dashboard</h6></div></div></a>';
		} else {
			document.getElementById('accountDropdownList').innerHTML += '<a href="../dashboards/multiple.html" class="dropdown-item"><div class="d-flex py-1"><div class="my-auto"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 64 64"><title>dashboard</title><g fill="#344767" stroke-linecap="square" stroke-linejoin="miter" transform="translate(0.5 0.5)" stroke-miterlimit="10"><line x1="29.086" y1="34.755" x2="22" y2="22" fill="none" stroke="#344767" stroke-width="3" stroke-linecap="butt"></line><circle cx="32" cy="32" r="29" fill="none" stroke="#344767" stroke-width="3"></circle><path d="M38,40H52.493a22,22,0,1,0-40.986,0H26" fill="none" stroke="#344767" stroke-width="3"></path><circle cx="32" cy="40" r="6" fill="none" stroke="#344767" stroke-width="3"></circle></g></svg></div><div class="d-flex flex-column justify-content-center"><h6 class="text-sm font-weight-normal mb-0 ms-2 ">Dashboard</h6></div></div></a>';
		}
	}
}

function switchAccount(client_id, hydra) {
	if (client_id === localStorage.getItem('client_id')) {
		console.log('No need to switch accounts, copying access token to clipboard')
		authenticateWithCentral().then(function() {
			navigator.clipboard.writeText(localStorage.getItem('access_token'));
			showNotification('ca-document-copy', 'Access Token for account copied to clipboard', 'top', 'center', 'success');
		});
	} else {
		loadSingleAccount(client_id, hydra);
		location.reload();
	}
}



function loadSingleAccount(client_id, hydra) {
	// get account details and save them out
	var account = getAccountforClientID(client_id);

	// If COP account - write the base_url with the COP address
	var baseURL = account.base_url;
	if (baseURL === getAPIGateway('Central On-Prem')) {
		console.log('Setting COP address');
		baseURL = cop_url + account.cop_address;
		localStorage.setItem('is_cop', '1');
	} else {
		localStorage.removeItem('is_cop');
	}

	localStorage.setItem('client_id', account.client_id);
	localStorage.setItem('client_secret', account.client_secret);
	localStorage.setItem('base_url', baseURL);
	localStorage.setItem('access_token', account.access_token);
	localStorage.setItem('expires_at', account.expires_at);

	// Jump to individual dashboard and refresh data
	if (hydra == 1) localStorage.setItem('from_hydra', hydra);
	else localStorage.removeItem('from_hydra');

	localStorage.removeItem('monitoring_update');
	localStorage.removeItem('monitoring_ap_update');
	localStorage.removeItem('monitoring_switch_update');
	localStorage.removeItem('monitoring_gateway_update');
	localStorage.removeItem('monitoring_radios_update');
	localStorage.removeItem('monitoring_bssid_update');
	localStorage.removeItem('monitoring_wlan_update');
	localStorage.removeItem('monitoring_client_update');
	localStorage.removeItem('inventory_update');
	localStorage.removeItem('config_update');
	localStorage.removeItem('hierarchy_update');
}



//  --------------------------------------
//	 Generic Authentication functions for CAS
//	--------------------------------------

var authNotification;
var authPromise;
var authInProgress = false;

// Check for authentication in progress
function isAuthInProgress() {
	return authInProgress;	
}

// Authenticate with Central and save Access Token and Expiry Time - using localStorage values
function authenticateWithCentral(forceRefresh) {
	if (forceRefresh === undefined) forceRefresh = false;

	if (isAuthInProgress()) {
		return authPromise;
	}

	// Check if access token is still valid (for the next 10mins)
	if (!forceRefresh) {
		var expiryTimeMS = localStorage.getItem('expires_at');
		if (expiryTimeMS) {
			var expiryTime = new Date(expiryTimeMS*1000);
			var minutesLater = new Date();
			minutesLater.setMinutes(minutesLater.getMinutes() + 10);
			if (expiryTime > minutesLater) {
				// no need to generate a new access token just yet
				return Promise.resolve();
			}
		}
	}
	// else need to auth to get new access token

	// prevent concurrent authentications from the same user - and to alert user if changing page whilst auth in progress
	authInProgress = true;

	// Update the user
	authNotification = showLongNotification('ca-padlock', 'Authenticating with Central...', 'bottom', 'center', 'info');

	let tokenURL = glpAuthURL;
	if (localStorage.getItem('base_url').includes('arubadev.cloud.hpe.com')) tokenURL = glpDevAuthURL;

	authPromise = new Promise(function(resolve, reject) {
		fetch(getAPIURL() + '/v2/auth/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_id: localStorage.getItem('client_id'),
				client_secret: localStorage.getItem('client_secret'),
				token_url: tokenURL,
			}),
		}).then(function(resp) { return resp.json(); })
		.then(function(commandResults) {
			// Update API limit counts in UI
			if (commandResults.hasOwnProperty('headers')) {
				//updateAPILimits(JSON.parse(commandResults.headers));
			}

			// Process The status code of the result
			var result = processStatus(commandResults);
			// will return the status code to trigger next step
			if (result !== 200) {
				if (authNotification) {
					authNotification.update({ type: 'danger', message: 'Authentication with Central Failed' });
					setTimeout(authNotification.close, 2000);
				}
				authInProgress = false;
				reject('Authentication with Central Failed');
				return;
			}
			var response = commandResults;
			// process API call response
			if (response.access_token) {
				// save auth tokens in local storage for easy access
				localStorage.setItem('access_token', response.access_token);
				localStorage.setItem('expires_at', response.expires_at);

				// Also save tokens back to full data store of accounts
				var cluster = getAccountforClientID(localStorage.getItem('client_id'));
				cluster['access_token'] = response.access_token;
				cluster['expires_at'] = response.expires_at;
				updateAccountDetails(cluster);

				// Update user that auth refresh was successful
				if (authNotification) {
					authNotification.update({ type: 'success', message: 'Authentication Tokens Updated' });
					setTimeout(authNotification.close, 1000);
				}
				authInProgress = false;
				resolve();
			} else {
				// Update user that auth refresh failed
				if (authNotification) {
					authNotification.update({ type: 'danger', message: 'Authentication Tokens Failed to be Updated' });
					setTimeout(authNotification.close, 1000);
				}
				authInProgress = false;
				reject('Authentication with Central Failed');
			}
		}).catch(function(err) {
			// Network error (i.e. connection refused, access denied due to CORS, etc.)
			showNotification('ca-globe', 'Cannot connect to API server', 'bottom', 'center', 'danger');
			authInProgress = false;
			reject('Authentication with Central Failed');
		});
	});

	return authPromise;
}

// Authenticate with Central and save Access Token and Expiry Time - using supplied Account values
function authenticateWithCentralUsingAccount(account) {
	// prevent concurrent authentications from the same user - and to alert user if changing page whilst auth in progress
	authInProgress = true;

	// Update the user
	authNotification = showLongNotification('ca-padlock', account['account_name'] + ': Authenticating with Central...', 'bottom', 'center', 'info');

	authPromise = new Promise(function(resolve, reject) {
		fetch(getAPIURL() + '/v2/auth/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_id: account['client_id'],
				client_secret: account['client_secret'],
				token_url: glpAuthURL,
			}),
		}).then(function(resp) { return resp.json(); })
		.then(function(response) {
			// process API call response
			if (response.access_token) {
				// Also save tokens back to full data store of accounts
				var accountDetails = getAccountforClientID(account['client_id']);
				accountDetails['access_token'] = response.access_token;
				accountDetails['expires_at'] = response.expires_at;
				updateAccountDetails(accountDetails);

				// Update user that auth refresh was successful
				if (authNotification) {
					authNotification.update({ type: 'success', message: account['account_name'] + ': Authentication Tokens Updated' });
					setTimeout(authNotification.close, 1000);
				}
				authInProgress = false;
				resolve();
			} else {
				// Update user that auth refresh failed
				if (authNotification) {
					authNotification.update({ type: 'danger', message: account['account_name'] + ': Authentication Tokens Failed to be Updated' });
					setTimeout(authNotification.close, 1000);
				}
				authInProgress = false;
				reject('Authentication with Central Failed');
			}
		}).catch(function(err) {
			console.log(err);
			// Network error (i.e. connection refused, access denied due to CORS, etc.)
			showNotification('ca-globe', 'Cannot connect to API server', 'bottom', 'center', 'danger');
			authInProgress = false;
			reject(account['account_name'] + ': Authentication with Central Failed');
		});
	});

	return authPromise;
}
