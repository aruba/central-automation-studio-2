/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/

var ftmNotification;
var ftmHistory;

function clearBuildingChoices() {
	var buildingSelectorRef = getBuildingSelector();
	buildingSelectorRef.clearChoices();
	buildingSelectorRef.removeActiveItems();
	clearFTMHistory();
}

function clearFloorChoices() {
	var floorSelectorRef = getFloorSelector();
	floorSelectorRef.clearChoices();
	floorSelectorRef.removeActiveItems();
	clearFTMHistory();
}

function clearFTMHistory() {
	$('#history-table').DataTable().clear();
	$('#history-table').DataTable().rows().draw();
}

function getFTMHistory() {
	var siteChoices = getSiteSelector();
	var selectedSite = siteChoices.getValue(true);
	var selectedSiteData = siteChoices.getValue();

	var floorChoices = getFloorSelector();
	var selectedFloor = floorChoices.getValue(true);
	var selectedFloorData = floorChoices.getValue();
	
	if (selectedSite && selectedFloor) {
		getFTMScans(selectedSiteData, selectedFloorData, 1)
	} else {
		ftmNotification = showNotification('ca-floors', 'Please select a Site, Building and Floor', 'bottom', 'center', 'warning');
	}
}

function getFTMScans(selectedSite, selectedFloor, offset) {
	
	if (offset == 1) {
		if (ftmNotification) ftmNotification.close();
		ftmNotification = showProgressNotification('ca-floors', 'Obtaining AP Ranging Scan history for the selected floor', 'bottom', 'center', 'info');
		ftmHistory = [];
		$('#history-table').DataTable().clear();
	}
	
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-services/v1/sitemaps/'+selectedSite.value+'/floors/'+selectedFloor.value+'/ap-ranging-scans?limit=1000&next='+offset,
		access_token: localStorage.getItem('access_token'),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		var response = JSON.parse(commandResults.responseBody);
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getFTMScans, apiWaitDelay, selectedSite, selectedFloor, offset);
		} else if (result !== 200) {
			if (ftmNotification) {
				ftmNotification.update({ type: 'danger', message: 'Failed to start AP Ranging Scan' });
				setTimeout(ftmNotification.close, 2000);
			}
		} else if (response.httpStatusCode && response.httpStatusCode === 404) {
			if (response.message.includes('No result found')) {
				logInformation('There were no AP Ranging scans at '+ selectedSite.label + ' on floor '+ selectedFloor.label);
				if (ftmNotification) {
					ftmNotification.update({ type: 'info', message: 'There are no AP Ranging Scans for the selected floor', progress: 100 });
					setTimeout(ftmNotification.close, 2000);
				}
			} else {
				logError('There were no APs at '+ selectedSite.label + ' on floor '+ selectedFloor.label)
				if (ftmNotification) {
					ftmNotification.update({ type: 'danger', message: 'There are no APs assigned to the selected floor', progress: 100 });
					setTimeout(ftmNotification.close, 2000);
				}
			}
		} else {

			response.items.forEach(function(item) {
				ftmHistory.push(item);
				loadFTMUI(item);
			});

			offset = response.next;
			if (offset) {
				var deviceProgress = (ftmHistory.length / response.total) * 100;
				ftmNotification.update({ progress: deviceProgress });
				getFTMScans(selectedSite, selectedFloor, offset);
			} else {
				$('#history-table')
				.DataTable()
				.rows()
				.draw();

				if (ftmNotification) ftmNotification.update({ progress: 100 });
				if (ftmNotification) ftmNotification.close();
			}
		}
	}).catch(function(err) {
		showNotification('ca-globe', 'Cannot connect to API server', 'bottom', 'center', 'danger');
	});
}

function loadFTMUI(scan) {
	var actionBtn = '';
	var status = '<i class="fa-solid fa-diamond text-danger"></i>';
	if (scan['status'] == 'COMPLETE') {
		status = '<i class="fa-solid fa-circle text-success"></i>';
	} else if (scan['status'] == 'SCANNING') {
		status = '<i class="fa-solid fa-play text-info"></i>';
	} else if (scan['status'] == 'SCHEDULED') {
		status = '<i class="fa-solid fa-star text-secondary"></i>';
	} else if (scan['status'] == 'CANCELLED') {
		status = '<i class="fa-solid fa-square text-danger"></i>';
	} else if (scan['status'] == 'ABORTED') {
		status = '<i class="fa-solid fa-diamond text-danger"></i>';
	} else if (scan['status'] == 'PENDING') {
		status = '<i class="fa-solid fa-star text-primary"></i>';
		actionBtn = '<a class="btn btn-link btn-warning mt-2" data-bs-toggle="tooltip" data-bs-placement="top" data-container="body" data-animation="true" title="Stop Scan" onclick="stopFTMScan(\'' + scan.id + '\')"><i class="fa-solid fa-octagon" style="color: #67748e; font-size:18px;"></i></a>';
	}
	
	var apArray = [];
	var apiURL = localStorage.getItem('base_url');
	var centralBaseURL = centralURLs[apiURL];
	
	scan.serialNumbers.forEach(function(serial) {
		var device = findDeviceInMonitoring(serial.toString());
		if (device) {
			var name = encodeURI(device['deviceName']);
			// Make Name as a link to Central
			var centralURL = centralBaseURL + '/gravity/monitoring/ap/dashboard?contextType=ap&selectedView=dashboard&siteId=' + device['siteId'] + '&selectedPlanet=sun&deviceId=' + device['serialNumber'];
			apArray.push('<strong><a href="' + centralURL + '" target="_blank">'+device['deviceName']+'</a></strong>');
		} else {
			apArray.push(serial.toString());
		}
	});
	
	var scannedChannels = scan.scannedChannels[0];
	var scannedBand = '5GHz';
	if (scannedChannels.band.includes('2.4GHz')) scannedBand = '2.4GHz';
	if (scannedChannels.band.includes('6GHz')) scannedBand = '6GHz';
	
	var scannedBandwidth = '80MHz';
	if (scannedChannels.bandwidth.includes('20MHZ')) scannedBandwidth = '20MHz';
	if (scannedChannels.bandwidth.includes('40MHZ')) scannedBandwidth = '40MHz';
	if (scannedChannels.bandwidth.includes('160MHZ')) scannedBandwidth = '160MHz';
	
	// Add row to table
	var table = $('#history-table').DataTable();
	table.row.add([escapeHtml(scan['id']), '<span style="display:none;">' + scan['createdAt'] + '</span>' + moment(scan['createdAt']).format('lll'), '<span data-bs-toggle="tooltip" data-bs-placement="top" title="' + escapeHtml(scan['status']) + '"></span>' + status, '<span style="display:none;">' + scan['scanStartTime'] + '</span>' + moment(scan['scanStartTime']).format('lll'), '<span style="display:none;">' + scan['estimatedCompletionTime'] + '</span>' + moment(scan['estimatedCompletionTime']).format('lll'), apArray.join(', '), scannedChannels.primaryChannelList.join(', '), scannedBand, scannedBandwidth, actionBtn]);

	initializeTooltips(table.table().body());
	
	
}

function startFTMScan() {
	var siteChoices = getSiteSelector();
	var selectedSite = siteChoices.getValue(true);
	var selectedSiteData = siteChoices.getValue();
	
	var floorChoices = getFloorSelector();
	var selectedFloor = floorChoices.getValue(true);
	var selectedFloorData = floorChoices.getValue();
	
	if (selectedSite && selectedFloor) {
		if (ftmNotification) ftmNotification.close();
		ftmNotification = showNotification('ca-floors', 'Scheduling AP Ranging Scan for the selected floor', 'bottom', 'center', 'info');
		logStart('Scheduling AP Ranging Scan for '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label)
		fetchProxyWithAuth('/tools/postCommand', {
			url: localStorage.getItem('base_url') + '/network-services/v1/ap-ranging-scans?site-id='+selectedSite+'&floor-id='+selectedFloor,
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
				setTimeout(startFTMScan, apiWaitDelay);
			} else if (result !== 200) {
				if (ftmNotification) {
					ftmNotification.update({ type: 'danger', message: 'Failed to start AP Ranging Scan' });
					setTimeout(ftmNotification.close, 2000);
				}
			} else if (commandResults.httpStatusCode && commandResults.httpStatusCode === 404) {
				logError('There were no APs at '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label)
				if (ftmNotification) {
					ftmNotification.update({ type: 'danger', message: 'There are no APs assigned to the selected floor' });
					setTimeout(ftmNotification.close, 2000);
				}
			} else {
				var response = commandResults;

				if (response.result === 'SUCCESS') {
					ftmNotification.update({ type: 'success', message: 'AP Ranging Scan will start at ' + moment(response.scanStartTime).format('LLL') });
					logInformation('AP Ranging Scan for '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label + ' will start at ' + moment(response.scanStartTime).format('LLL'))
				} else if (response.result === 'SCAN_ALREADY_ACTIVE') {
					ftmNotification.update({ type: 'warning', message: 'AP Ranging Scan already active for the selected floor' });
					logInformation('AP Ranging Scan for '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label + ' is already in progress')
				} else if (response.result === 'NOT_ENOUGH_APS') {
					ftmNotification.update({ type: 'danger', message: 'There were not enough ftm-monitor enabled APs on the selected floor' });
					logInformation('There were not enough ftm-monitor enabled APs at '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label)
				} else if (response.result === 'REGULATORY_DOMAIN_MISMATCH') {
					ftmNotification.update({ type: 'danger', message: 'Not all APs are configured with the same country code. Scan cannot be started.' });
					logInformation('Not all APs are configured with the same country code. Scan cannot be started at '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label)
				} else if (response.result === 'NO_VALID_CHANNELS') {
					ftmNotification.update({ type: 'danger', message: 'There are no available channels to run the AP Ranging Scan. Scan cannot be started.' });
					logInformation('Based on the user configured country code and channel selections. There are no available channels to run the AP Ranging Scan at '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label)
				} else if (response.result === 'ERROR') {
					ftmNotification.update({ type: 'danger', message: response.errorMessage });
					logError('There was an error starting the AP Ranging Scan at '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label + ': '+response.errorMessage)
				}
				setTimeout(ftmNotification.close, 2000);
				setTimeout(getFTMHistory, 2000);
			}
		}).catch(function(err) {
			showNotification('ca-globe', 'Cannot connect to API server', 'bottom', 'center', 'danger');
		});
	}
}

function stopFTMScan(selectedScan) {
	var siteChoices = getSiteSelector();
	var selectedSite = siteChoices.getValue(true);
	var selectedSiteData = siteChoices.getValue();
	
	var floorChoices = getFloorSelector();
	var selectedFloor = floorChoices.getValue(true);
	var selectedFloorData = floorChoices.getValue();
	
	if (selectedSite && selectedFloor) {
		if (ftmNotification) ftmNotification.close();
		ftmNotification = showNotification('ca-floors', 'Stopping AP Ranging Scan for the selected floor', 'bottom', 'center', 'info');
		logStart('Stopping AP Ranging Scan for '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label)
		fetchProxyWithAuth('/tools/deleteCommand', {
			url: localStorage.getItem('base_url') + '/network-services/v1/sitemaps/'+selectedSite+'/floors/'+selectedFloor+'/ap-ranging-scans/'+selectedScan,
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
				setTimeout(stopFTMScan, apiWaitDelay, selectedScan);
			} else if (result !== 200) {
				if (ftmNotification) {
					ftmNotification.update({ type: 'danger', message: 'Failed to stop AP Ranging Scan' });
					setTimeout(ftmNotification.close, 2000);
				}
			} else {
				var response = commandResults;
				if (response.result === 'SUCCESS') {
					ftmNotification.update({ type: 'success', message: 'AP Ranging Scan will start at ' + moment(response.scanStartTime).format('LLL') });
					logInformation('AP Ranging Scan for '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label + ' will start at ' + moment(response.scanStartTime).format('LLL'))
				} else if (response.result === 'INVALID_SCAN_STATE') {
					ftmNotification.update({ type: 'warning', message: 'AP Ranging Scan was not able to be stopped' });
					logInformation('AP Ranging Scan for '+ selectedSiteData.label + ' on floor '+ selectedFloorData.label + ' was not able to be stopped')
				}
				setTimeout(ftmNotification.close, 2000);
				setTimeout(getFTMHistory, 2000);
			}
		}).catch(function(err) {
			showNotification('ca-globe', 'Cannot connect to API server', 'bottom', 'center', 'danger');
		});
	}
}

