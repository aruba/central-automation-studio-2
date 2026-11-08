/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var multipleMonitoringData;
var currentAccountIndex = 0;
var updateCounter = 0;
var selectedHistory = '';

/*  ----------------------------------------------------------------------------------
	Obtaining Monitoring Data functions
	---------------------------------------------------------------------------------- */
	
var fcoNotification;
var fcoData;

function loadSavedData(indexKey, data) {
	fcoData = JSON.parse(data);
	if (!fcoData) fcoData = {};

	getMultipleDashboardData();
}


function getMultipleDashboardData() {
	logNote('Refreshing FCO Data for all accounts')
	fcoNotification = showProgressNotification('ca-stock-2', 'Obtaining FCO Information...', 'bottom', 'center', 'info');
	// Loop through the Central credentials and check if access token is valid
	currentAccountIndex = 0;
	updateCounter = 0;;
	loadCentralAccountDetails();
	
	resetOverallUI();
	buildUIElements();
	
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
			setTimeout(getFCODataForAccount, apiWaitDelay*currentAccountIndex, clientId)
			
			currentAccountIndex++;
			if (currentAccountIndex < centralCredentials.length) verifyAccessForAccount();
		} else {
			logNote(accountName + ': access token needs to be renewed');
			// if not valid - try to generate a new token.
			authenticateWithCentralUsingAccount(currentAccount).then(function() {
				logNote(accountName + ': access token was renewed');
				// Once account is checked and updated, begin polling for Client, AP, Switch, Gateway (Count - up and down)
				setTimeout(getFCODataForAccount, apiWaitDelay*currentAccountIndex, clientId)

				currentAccountIndex++;
				if (currentAccountIndex < centralCredentials.length) verifyAccessForAccount();
			}).catch(function() {
				logError(accountName + ': access token failed to be renewed');
				// On access token failure - add account to multipleMonitoringData with status 'down'
				currentAccountIndex++;
				if (currentAccountIndex < centralCredentials.length) verifyAccessForAccount();
			});
		}
	} else {
		// On access token failure - add account to multipleMonitoringData with status 'down'
		loadMultipleAccountTable();
		currentAccountIndex++;
		if (currentAccountIndex < centralCredentials.length) verifyAccessForAccount();
	}
}

function getFCODataForAccount(clientID) {
	if (!fcoData[getbaseURLforClientID(clientID)]) fcoData[getbaseURLforClientID(clientID)] = {};
	if (document.getElementById(getbaseURLforClientID(clientID)+'_count')) {
		buildUIElements();
	}
	
	updateFCO(clientID);
	
	localStorage.setItem('fco_update', +new Date());
}



/*  ----------------------------------------------------------------------------------
	UI functions
	---------------------------------------------------------------------------------- */
function resetOverallUI() {
	if (document.getElementById('fco_row')) {
		document.getElementById('fco_row').innerHTML = '';
	}
}

function buildUIElements() {
	centralCredentials.forEach(function(cred) {
		var clientID = cred['client_id']
		if (!document.getElementById(getbaseURLforClientID(clientID)+'_count')) {
			var clusterDiv = document.createElement('div');
			clusterDiv.className = 'col-2';
			document.getElementById('fco_row').appendChild(clusterDiv);
			
			var clusterLink = document.createElement('a');
			var base = getbaseURLforClientID(clientID);
			clusterLink.setAttribute('href', "javascript:"+`showFCOHistory('${base}');`);
			clusterDiv.appendChild(clusterLink);
			
			var innerCardDiv = document.createElement('div');
			innerCardDiv.className = 'card card-stats mb-4';
			clusterLink.appendChild(innerCardDiv);
			
			var innerCardBody = document.createElement('div');
			innerCardBody.className = 'card-body p-3';
			innerCardDiv.appendChild(innerCardBody);
			
			var innerCardRow = document.createElement('div');
			innerCardRow.className = 'row';
			innerCardBody.appendChild(innerCardRow);
			
			var innerCardIconCol = document.createElement('div');
			innerCardIconCol.className = 'col-2 fixedIcon';
			innerCardRow.appendChild(innerCardIconCol);
			
			var innerCardIcon = document.createElement('div');
			innerCardIcon.id = getbaseURLforClientID(clientID)+'_icon';
			innerCardIcon.className = 'icon icon-shape bg-gradient-warning shadow-sm text-center border-radius-md';
			innerCardIconCol.appendChild(innerCardIcon);
			
			var innerCardIconImage = document.createElement('i');
			innerCardIconImage.className = 'central-icon ca-m-check text-xl opacity-10';
			innerCardIcon.appendChild(innerCardIconImage);
			
			
			var innerCardLabelCol = document.createElement('div');
			innerCardLabelCol.className = 'col';
			innerCardRow.appendChild(innerCardLabelCol);
			
			var innerCardLabel = document.createElement('div');
			innerCardLabel.className = 'numbers';
			innerCardLabelCol.appendChild(innerCardLabel);
			
			var innerCardLabelCluster = document.createElement('p');
			innerCardLabelCluster.id = getbaseURLforClientID(clientID)+'_label';
			innerCardLabelCluster.className = 'text-sm mb-0 text-capitalize font-weight-bold';
			innerCardLabelCol.appendChild(innerCardLabelCluster);
			
			var innerCardLabelCount = document.createElement('h5');
			innerCardLabelCount.id = getbaseURLforClientID(clientID)+'_count'; // update to cluster specific id
			innerCardLabelCount.className = 'font-weight-bolder mb-0';
			innerCardLabelCol.appendChild(innerCardLabelCount);
		}
	})
}

/*  ----------------------------------------------------------------------------------
	FCO functions
	---------------------------------------------------------------------------------- */
function updateFCO(clientID) {
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: getbaseURLforClientID(clientID) + '/fco-api/v1/get_number_of_fco_devices',
		access_token: getAccessTokenforClientID(clientID),
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
			setTimeout(updateFCO, apiWaitDelay, clientID);
		} else if (result !== 200) {
			if (fcoNotification) {
				fcoNotification.update({ type: 'danger', message: 'Failed to download FCO information' });
				setTimeout(fcoNotification.close, 2000);
			}
		} else {
			var response = JSON.parse(commandResults.responseBody);
			var timestamp = Date.now();
			var clusterData = fcoData[getbaseURLforClientID(clientID)]
			clusterData[timestamp] = response;
			fcoData[getbaseURLforClientID(clientID)] = clusterData;
			saveDataToDB(keyFCO, JSON.stringify(fcoData));

			if (document.getElementById(getbaseURLforClientID(clientID)+'_count')) {
				const countUp = new CountUp(getbaseURLforClientID(clientID)+'_count', response['Number of FCO devices']);
				if (!countUp.error) {
				  countUp.start();
				} else {
				  console.error(countUp.error);
				}
			}
			if (document.getElementById(getbaseURLforClientID(clientID)+'_label')) document.getElementById(getbaseURLforClientID(clientID)+'_label').innerHTML = getClusterName(getbaseURLforClientID(clientID));
			const _fcoIcon = document.getElementById(getbaseURLforClientID(clientID)+'_icon');
			_fcoIcon.classList.remove('bg-gradient-warning');
			if (response['Number of FCO devices'] > 0) {
				_fcoIcon.classList.add('bg-gradient-success');
				_fcoIcon.classList.remove('bg-gradient-danger');
			} else {
				_fcoIcon.classList.remove('bg-gradient-danger');
				_fcoIcon.classList.add('bg-gradient-secondary');
			}

			updateCounter++;
			var progress = updateCounter/centralCredentials.length*100
			fcoNotification.update({ progress: progress });
			if (updateCounter >= centralCredentials.length) {
				if (fcoNotification) {
					fcoNotification.update({ progress: 100, message: 'FCO Information obtained', type: 'success' });
					setTimeout(fcoNotification.close, 500);
				}
			}

			//displayHistoricalData();
		}
	});
}

function showFCOHistory(selectedCluster) {
	selectedHistory = selectedCluster;
	var clusterHistory = fcoData[selectedCluster];
	
	$('#history-table')
	.DataTable().clear();
	
	var table = $('#history-table').DataTable();
	var clusterDates = Object.keys(clusterHistory);
	clusterDates.forEach(function(dateKey) {
		var timestamp = parseInt(dateKey);
		table.row.add(['<span style="display:none;">' + dateKey + '</span>' + moment(timestamp).format('LLL'), clusterHistory[dateKey]['Number of FCO devices']]);
	});
	$('#history-table')
	.DataTable()
	.rows()
	.draw();
	
	
	document.getElementById('historyTitle').innerHTML = 'FCO History: '+ getClusterName(selectedCluster);
	var myModal = new bootstrap.Modal(document.getElementById('HistoryModal'))
	myModal.show();
}

function clearHistory() {
	fcoData[selectedHistory] = {};
	saveDataToDB(keyFCO, JSON.stringify(fcoData));
	(bootstrap.Modal.getInstance(document.getElementById('HistoryModal')) || new bootstrap.Modal(document.getElementById('HistoryModal'))).hide();

}
