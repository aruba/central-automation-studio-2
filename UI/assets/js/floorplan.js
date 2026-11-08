/*
Central Automation shared floorplan engine.
Shared AP/client/pathloss rendering plus floor image sizing and retrieval.
Used by monitoring and future AirMatch views.
*/

var floorplanNotification;
var buildings;
var neighbourNotification;
var neighbourRequestToken = 0;
var neighbourWatchdogTimer = null;
var apRFNeighbours = [];
var neighbourCache = {};

function updateInformation() {
	authenticateWithCentral().then(function() {
		getSiteData(0);
	});
}

function loadCurrentPageSite() {
	
}

function getBuildings() {
	buildings = [];
	var siteChoices = getSiteSelector();
	var selectedSite = siteChoices.getValue(true);
	if (selectedSite) {
		authenticateWithCentral().then(function() {
			getBuildingsForSite(selectedSite);
		});
	}
}

function getBuildingsForSite(siteId) {
	
	if (floorplanNotification) floorplanNotification.close();
	floorplanNotification = showNotification('ca-floors', 'Obtaining Buildings and Floors for Site...', 'bottom', 'center', 'info');
	
	fetchProxyWithAuth('/tools/getCommandwHeaders', {
		url: localStorage.getItem('base_url') + '/network-monitoring/v1/sitemaps/'+siteId+'/buildings',
		access_token: localStorage.getItem('access_token'),
	})
	.then(function(commandResults) {
		if (commandResults.hasOwnProperty('headers')) {
			//updateAPILimits(JSON.parse(commandResults.headers));
		}
		//console.log(commandResults)
		// Process The status code of the result
		var result = processStatus(commandResults);
		// will return the status code to trigger next step
		if (result == 429) {
			// Over API threshold limit. Wait apiWaitDelay value and try again.
			setTimeout(getBuildingsForSite, apiWaitDelay, siteId);
		} else if (result !== 200) {
			if (floorplanNotification) {
				floorplanNotification.update({ type: 'danger', message: 'Failed to download floor information' });
				setTimeout(floorplanNotification.close, 2000);
			}
		} else {
			var response = JSON.parse(commandResults.responseBody);
			
			// Add floors to the floor selector
			buildings = response['items'];
			if (buildings.length == 0) {
				if (floorplanNotification) {
					floorplanNotification.update({ message: 'There are no buildings configured for this site', type: 'danger' });
					setTimeout(floorplanNotification.close, 500);
				}
				return;
			}
			
			if (document.getElementById('buildingselector') && buildings) {
				clearBuildingChoices();
				var buildingSelectorRef = getBuildingSelector();
				var buildingChoices = [];
				buildings.forEach(function(building) {
					buildingChoices.push({ value: building['buildingId'], label: building['properties']['name'] });
				});
				buildingSelectorRef.clearChoices();
				buildingSelectorRef.setChoices(buildingChoices);
			}
			
			clearFloorChoices();

			if (floorplanNotification) {
				floorplanNotification.update({ message: 'Building & Floor information obtained', type: 'success' });
				setTimeout(floorplanNotification.close, 500);
			}
		}
	});
}

function clearBuildingChoices() {
	var buildingSelectorRef = getBuildingSelector();
	buildingSelectorRef.clearChoices();
	buildingSelectorRef.removeActiveItems();
}

function clearFloorChoices() {
	var floorSelectorRef = getFloorSelector();
	floorSelectorRef.clearChoices();
	floorSelectorRef.removeActiveItems();
}

function getFloors() {
	var buildingChoices = getBuildingSelector();
	var selectedBuilding = buildingChoices.getValue(true);
	if (selectedBuilding) {
		
		var floors = [];
		for (var i=0; i<buildings.length;i++) {
			if (buildings[i]['buildingId'] === selectedBuilding) floors = buildings[i]['floors'];
		}
	
		if (floors.length == 0) {
			if (floorplanNotification) {
				floorplanNotification.update({ message: 'There are no floors configured for this building', type: 'danger' });
				setTimeout(floorplanNotification.close, 500);
			}
			return;
		}
		if (document.getElementById('floorselector') && floors) {
			var floorSelectorRef = getFloorSelector();
			floorSelectorRef.removeActiveItems();
			var floorChoices = [];
			floors.forEach(function(floor) {
				floorChoices.push({ value: floor['floorId'], label: floor['properties']['name'] });
			});
			floorSelectorRef.clearChoices();
			floorSelectorRef.setChoices(floorChoices);
		}
	}
}

/*  ---------------------------------------------------------------------------
---------------------------------------------------------------------------------------
	Shared Floor Retrieval
-------------------------------------------------------------------------------
------------------------------------------------------------------------------------ */
function requestCentralToolWithRetry(toolPath, targetUrl, options) {
	if (!options) options = {};
	var retryStatuses = Array.isArray(options.retryStatuses) ? options.retryStatuses : [429, 409];
	var retryDelay = Number.isFinite(options.retryDelay) ? options.retryDelay : apiWaitDelay;

	function runRequest() {
		return fetchProxyWithAuth(toolPath, {
			url: targetUrl,
			access_token: localStorage.getItem('access_token')
		})
		.then(function(commandResults) {
			if (commandResults.hasOwnProperty('headers')) {
				//updateAPILimits(JSON.parse(commandResults.headers));
			}

			var result = processStatus(commandResults);
			if (retryStatuses.includes(result)) {
				if (typeof options.onRetry === 'function') {
					options.onRetry(result);
				}
				return new Promise(function(resolve) {
					setTimeout(resolve, retryDelay);
				}).then(runRequest);
			}

			if (result !== 200) {
				return Promise.reject(new Error('Request failed with status ' + result));
			}

			return commandResults;
		});
	}

	return runRequest();
}

function getSharedFloorplanDetails(siteId, floorId, options) {
	if (!options) options = {};
	var targetUrl = localStorage.getItem('base_url') + '/network-monitoring/v1/sitemaps/' + siteId + '/floors/' + floorId;

	return requestCentralToolWithRetry('/tools/getCommandwHeaders', targetUrl, options)
		.then(function(commandResults) {
			return JSON.parse(commandResults.responseBody);
		});
}

function getSharedFloorplanImage(siteId, floorId, options) {
	if (!options) options = {};
	var targetUrl = localStorage.getItem('base_url') + '/network-monitoring/v1/sitemaps/' + siteId + '/floors/' + floorId + '/image?raster=true';

	return requestCentralToolWithRetry('/tools/getImage', targetUrl, options)
		.then(function(commandResults) {
			return commandResults.responseBody;
		});
}

function loadSharedFloorplanAPs(siteId, floorId, options) {
	if (!options) options = {};
	var initialOffset = Number.isFinite(options.initialOffset) ? options.initialOffset : 1;
	var retryDelay = Number.isFinite(options.retryDelay) ? options.retryDelay : apiWaitDelay;
	var pageLimit = Number.isFinite(options.pageLimit) ? options.pageLimit : 100;
	var items = [];

	// Used to show notifications and clear variables in the calling code
	if (typeof options.onStart === 'function') {
		options.onStart();
	}

	function fetchPage(offset) {
		var targetUrl = localStorage.getItem('base_url') + '/network-monitoring/v1/sitemaps/' + siteId + '/network-devices-deployed?filter=floorId%20eq%20%27' + floorId + '%27&limit=' + pageLimit + '&next=' + offset;

		return fetchProxyWithAuth('/tools/getCommandwHeaders', {
			url: targetUrl,
			access_token: localStorage.getItem('access_token')
		})
		.then(function(commandResults) {
			if (commandResults.hasOwnProperty('headers')) {
				//updateAPILimits(JSON.parse(commandResults.headers));
			}

			var result = processStatus(commandResults);
			if (result == 429 || result == 409) {
				if (typeof options.onRetry === 'function') {
					options.onRetry(offset, result);
				}
				return new Promise(function(resolve) {
					setTimeout(resolve, retryDelay);
				}).then(function() {
					return fetchPage(offset);
				});
			}

			if (result !== 200) {
				if (typeof options.onError === 'function') {
					options.onError(result);
				}
				return Promise.reject(new Error('Failed to retrieve devices on floorplan: status ' + result));
			}

			var response = JSON.parse(commandResults.responseBody);
			var pageItems = response && Array.isArray(response.items) ? response.items : [];
			items = items.concat(pageItems);

			if (typeof options.onProgress === 'function') {
				options.onProgress(items, response);
			}

			if (response && response.next) {
				return fetchPage(response.next);
			}

			if (typeof options.onComplete === 'function') {
				options.onComplete(items, response);
			}
			return items;
		});
	}

	return fetchPage(initialOffset);
}

/*  ---------------------------------------------------------------------------
-------------------------------------------------------------------------------
--------
	Shared Pathloss Retrieval
-------------------------------------------------------------------------------
-------------------------------------------------------------------------------
----- */
function getRFNeighboursForRadio(radioMac, offset) {
	if (offset === undefined) offset = 0;
	var requestToken = offset === 0 ? ++neighbourRequestToken : neighbourRequestToken;

	function clearNeighbourWatchdog() {
		if (neighbourWatchdogTimer) {
			clearTimeout(neighbourWatchdogTimer);
			neighbourWatchdogTimer = null;
		}
	}

	function armNeighbourWatchdog() {
		clearNeighbourWatchdog();
		neighbourWatchdogTimer = setTimeout(function() {
			if (requestToken !== neighbourRequestToken || !neighbourNotification) return;
			neighbourNotification.update({ type: 'warning', message: 'RF Neighbours request timed out' });
			setTimeout(neighbourNotification.close, 2000);
			neighbourWatchdogTimer = null;
		}, 45000);
	}

	function finalizeNeighbourNotification(type, message, closeDelay) {
		clearNeighbourWatchdog();
		if (requestToken !== neighbourRequestToken || !neighbourNotification) return;
		neighbourNotification.update({ type: type, message: message });
		setTimeout(neighbourNotification.close, closeDelay);
	}

	if (offset === 0) {
		neighbourNotification = showLongNotification('ca-duplicate', 'Getting RF Neighbours...', 'bottom', 'center', 'info');
		armNeighbourWatchdog();
	}

	function fetchNeighbours(currentOffset) {
		armNeighbourWatchdog();

		return fetchProxyWithAuth('/tools/getCommandwHeaders', {
			url: localStorage.getItem('base_url') + '/network-services/v1/airmatch-pathloss/' + radioMac + '?limit=' + airMatchLimit + '&offset=' + currentOffset,
			access_token: localStorage.getItem('access_token'),
		})
		.then(function(commandResults) {
			if (commandResults.hasOwnProperty('headers')) {
				//updateAPILimits(JSON.parse(commandResults.headers));
			}
			// Process the status code of the result
			let result = processStatus(commandResults);
			if (result == 429) {
				// Over API threshold limit. Wait apiWaitDelay value and try again.
				return new Promise(function(resolve) {
					setTimeout(resolve, apiWaitDelay);
				}).then(function() {
					armNeighbourWatchdog();
					return fetchNeighbours(currentOffset);
				});
			}

			if (result !== 200) {
				return Promise.reject(new Error('Failed retrieve RF Neighbours for ' + radioMac));
			}

			let response = JSON.parse(commandResults.responseBody);

			if (neighbourCache[radioMac]) neighbourCache[radioMac] = neighbourCache[radioMac].concat(response);
			else neighbourCache[radioMac] = response;

			if (response.length == airMatchLimit) {
				return fetchNeighbours(currentOffset + airMatchLimit);
			}

			return neighbourCache[radioMac];
		});
	}

	return fetchNeighbours(offset)
		.then(function(neighbours) {
			finalizeNeighbourNotification('success', 'Neighbours retrieved', 1000);
			return neighbours || [];
		})
		.catch(function(error) {
			finalizeNeighbourNotification('danger', 'Failed retrieve RF Neighbours for ' + radioMac, 2000);
			return Promise.reject(error);
		});
}

function drawPathLinks(serial, canvases, options) {
	if (!options) options = {};
	var band = options.selectedBand;
	if (band === undefined || band === null || band === 'ALL') {
		logError('drawPathLinks requires a concrete selectedBand option (2/5/6)');
		return;
	}
	var sourceAP = vrfAPLocations.find(function(loc) { return loc.serial === serial; });
	var findDeviceBySerial = options.findDeviceBySerial;
	if (typeof findDeviceBySerial !== 'function') {
		logError('No AP lookup handler provided');
		return;
	}
	const storedAP = findDeviceBySerial(serial);
	if (!storedAP || !sourceAP) return;

	var drawPathlossLink = (options && typeof options.drawPathlossLink === 'function') ? options.drawPathlossLink : null;
	if (!drawPathlossLink && typeof draw_PL === 'function') {
		drawPathlossLink = draw_PL;
	}
	if (!drawPathlossLink) {
		logError('No pathloss drawing handler provided');
		return;
	}

	var radioMac = null;
	var apRadios = vrfRadiosBySerial[storedAP.serialNumber] || [];
	if (band == 2) band = 2.4;

	apRadios.some(function(radio) {
		if (radio.band.includes(band + ' GHz') && radio.status === "UP") {
			radioMac = radio['macAddress'];
			return true;
		}
	});
	if (!radioMac) return;

	if (neighbourCache[radioMac]) {
		apRFNeighbours = neighbourCache[radioMac];
		findAPsForPathloss(apRFNeighbours, sourceAP.serial, canvases, drawPathlossLink);
	} else {
		getRFNeighboursForRadio(radioMac, 0).then(function(neighbours) {
			apRFNeighbours = neighbours;
			findAPsForPathloss(neighbours, sourceAP.serial, canvases, drawPathlossLink);
		}).catch(function(error) {
			logError('Unable to draw pathloss links: ' + error.message);
		});
	}
}

function findAPsForPathloss(response, sourceAPSerial, canvases, drawPathlossLink) {
	if (!sourceAPSerial) {
		logError('No source AP selected for pathloss');
		return;
	}

	response.forEach(function(item) {
		var ap = findAPForRadio(item['nbr_mac']);
		if (!ap) return;

		var apIsDisplayed = vrfAPLocations.some(function(loc) {
			return loc['serial'] === ap['serialNumber'];
		});

		if (apIsDisplayed) {
			var pathLoss = item['pathloss'];
			drawPathlossLink(sourceAPSerial, ap['serialNumber'], pathLoss, canvases);
		}
	});
}

/*─────────────────────────────────────────────────────────────────────────────
 COMMON DRAWING HELPERS
─────────────────────────────────────────────────────────────────────────────*/
function initializeCanvases(canvasIds) {
	if (!canvasIds) canvasIds = {};
	return {
		floorplan: document.getElementById(canvasIds.floorplan || 'ap-floorplanCanvas'),
		ap: document.getElementById(canvasIds.ap || 'ap-apCanvas'),
		link: document.getElementById(canvasIds.link || 'ap-linkCanvas'),
		info: document.getElementById(canvasIds.info || 'ap-infoCanvas'),
		container: document.getElementById(canvasIds.container || 'ap-visualPlan')
	};
}

function setFloorplanCanvasStackSize(width, height, canvasStackId) {
	var canvasStack = document.getElementById(canvasStackId || 'canvasStack');
	if (canvasStack) {
		canvasStack.style.width = width + 'px';
		canvasStack.style.height = height + 'px';
	}
}

function updateFloorplanCanvasSizes(width, height, canvases, options) {
	if (!options) options = {};
	if (!canvases) {
		canvases = initializeCanvases(options.canvasIds);
	}
	var renderRatio = options.renderRatio || window.devicePixelRatio || ratio || 1;

	['floorplan', 'link', 'ap', 'info'].forEach(function(layer) {
		var canvas = canvases[layer];
		if (!canvas) return;
		canvas.width = width * renderRatio;
		canvas.height = height * renderRatio;
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		var ctx = canvas.getContext('2d');
		ctx.setTransform(renderRatio, 0, 0, renderRatio, 0, 0);
	});

	if (canvases.container) {
		var rfVisualPlanHeight = height + 20;
		canvases.container.setAttribute('style', 'height:' + rfVisualPlanHeight + 'px');
		canvases.container.style.height = rfVisualPlanHeight + 'px';
	}

	setFloorplanCanvasStackSize(width, height, options.canvasStackId || 'canvasStack');
}

function drawSharedFloorplanImage(floorplanBase64, options) {
	if (!options) options = {};
	if (!floorplanBase64) return Promise.resolve(null);

	var canvases = options.canvases || initializeCanvases(options.canvasIds);
	if (!canvases || !canvases.floorplan || !canvases.container) {
		return Promise.resolve(null);
	}

	var swap = !!options.swap;
	var useColour = options.useColour === true;
	var superViewPadding = Number.isFinite(options.superViewPadding) ? options.superViewPadding : 40;

	return new Promise(function(resolve, reject) {
		var floorplanImg = new Image();
		floorplanImg.onload = function() {
			var normalWidth = Math.max(1, Math.round(canvases.container.getBoundingClientRect().width - superViewPadding));
			var normalHeight = Math.max(1, Math.round(normalWidth * (floorplanImg.height / floorplanImg.width)));

			setFloorplanCanvasStackSize(normalWidth, normalHeight, options.canvasStackId || 'canvasStack');
			if (!swap) {
				updateFloorplanCanvasSizes(normalWidth, normalHeight, canvases, options);
			}

			var ctx = canvases.floorplan.getContext('2d');
			ctx.willReadFrequently = true;
			ctx.drawImage(floorplanImg, 0, 0, normalWidth, normalHeight);
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'center';

			if (!useColour) {
				var imageData = ctx.getImageData(0, 0, canvases.floorplan.width, canvases.floorplan.height);
				var dataArray = imageData.data;
				for (var i = 0; i < dataArray.length; i += 4) {
					var red = dataArray[i];
					var green = dataArray[i + 1];
					var blue = dataArray[i + 2];
					var alpha = dataArray[i + 3];
					var gray = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
					dataArray[i] = gray;
					dataArray[i + 1] = gray;
					dataArray[i + 2] = gray;
					dataArray[i + 3] = alpha;
				}
				ctx.putImageData(imageData, 0, 0);
			}

			resolve({ width: normalWidth, height: normalHeight });
		};
		floorplanImg.onerror = reject;
		floorplanImg.src = 'data:image/jpeg;base64,' + floorplanBase64;
	});
}

function clearCanvasByRef(canvas) {
	if (!canvas) return;
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawFloorplanNode(ctx, x, y, image, nodeSize, imageSize) {
	x = Math.round(x);
	y = Math.round(y);
	ctx.beginPath();
	ctx.roundRect(x - nodeSize / 2, y - nodeSize / 2, nodeSize, nodeSize, 1);
	ctx.fill();
	if (image) {
		ctx.drawImage(image, x - imageSize / 2, y - imageSize / 2, imageSize, imageSize);
	}
}

function drawFloorplanEntityLabel(ctx, label1, label2, x, y) {
	x = Math.round(x);
	y = Math.round(y);
	var lines = [];
	if (label1) lines.push(String(label1));
	if (label2) lines.push(String(label2));
	if (lines.length === 0) return;

	const regularFont = '13px "Open Sans", sans-serif';
	const boldFont = 'bold 13px "Open Sans", sans-serif';
	ctx.font = regularFont;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillStyle = '#1f2937';
	ctx.strokeStyle = '#d1d5db';
	ctx.lineWidth = 1;
	ctx.shadowBlur = 0;

	var widths = lines.map(function(line) {
		ctx.font = (line === lines[0]) ? boldFont : regularFont;
		return ctx.measureText(line).width;
	});
	var labelWidth = Math.max.apply(null, widths);
	var labelHeight = 28 + ((lines.length - 1) * 18);
	var boxX = Math.round(x - (labelWidth / 2) - 12);
	var boxY = Math.round(y + 14);
	var textX = Math.round(x);
	var firstTextY = boxY + 14;

	ctx.fillStyle = '#f8fafc';
	ctx.strokeStyle = '#d1d5db';
	if (typeof ctx.roundRect === 'function') {
		ctx.beginPath();
		ctx.roundRect(boxX, boxY, labelWidth + 24, labelHeight, 6);
		ctx.fill();
		ctx.stroke();
	} else {
		ctx.fillRect(boxX, boxY, labelWidth + 24, labelHeight);
	}

	ctx.fillStyle = '#1f2937';
	for (var i = 0; i < lines.length; i++) {
		ctx.font = (i === 0) ? boldFont : regularFont;
		ctx.fillText(lines[i], textX, firstTextY + (i * 18));
	}
}

function drawFloorplanLinkLine(ctx, x1, y1, x2, y2, strokeColour, lineWidth) {
	ctx.strokeStyle = strokeColour;
	ctx.lineWidth = lineWidth;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

function drawFloorplanMidpointLabel(ctx, label, x1, y1, x2, y2) {
	ctx.font = '13px "Open Sans", sans-serif';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	const x_center = Math.round((x1 + x2) / 2);
	const y_center = Math.round((y1 + y2) / 2);
	const label_size = ctx.measureText(label);
	const boxX = Math.round(x_center - (label_size.width / 2) - 12);
	const boxY = Math.round(y_center - 20);
	const boxWidth = Math.round(label_size.width + 24);
	const boxHeight = 40;
	ctx.fillStyle = '#f8fafc';
	ctx.strokeStyle = '#d1d5db';
	ctx.lineWidth = 1;
	if (typeof ctx.roundRect === 'function') {
		ctx.beginPath();
		ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
		ctx.fill();
		ctx.stroke();
	} else {
		ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
	}
	ctx.fillStyle = '#1f2937';
	ctx.fillText(label, x_center, y_center + 1);
}

/*─────────────────────────────────────────────────────────────────────────────
 SHARED PATHLOSS LINK RENDERER
─────────────────────────────────────────────────────────────────────────────*/
function draw_PL(fromAP, toAP, pathLoss, canvases) {
	if (!canvases) {
		canvases = {
			link: document.getElementById('ap-linkCanvas'),
			info: document.getElementById('ap-infoCanvas'),
			ap: document.getElementById('ap-apCanvas'),
			floorplan: document.getElementById('ap-floorplanCanvas')
		};
	}
	if (!canvases.link) return;

	var fromAPVRFData;
	var toAPVRFData;

	vrfAPLocations.forEach(function(loc) {
		if (loc['serial'] === fromAP) fromAPVRFData = loc;
		else if (loc['serial'] === toAP) toAPVRFData = loc;
	});

	var ctx = canvases.link.getContext('2d');
	if (!fromAPVRFData || !toAPVRFData) {
		return;
	}

	const x1 = fromAPVRFData.x;
	const y1 = fromAPVRFData.y;
	const x2 = toAPVRFData.x;
	const y2 = toAPVRFData.y;

	var strokeColour = 'black';
	if (pathLoss < 70) strokeColour = apColors[4];
	else if (pathLoss < 90) strokeColour = apColors[2];
	else if (pathLoss < 110) strokeColour = apColors[1];

	drawFloorplanLinkLine(ctx, x1, y1, x2, y2, strokeColour, 2);
	drawFloorplanMidpointLabel(ctx, pathLoss, x1, y1, x2, y2);
}

/*─────────────────────────────────────────────────────────────────────────────
 COMMON AP DRAWING ENGINE
─────────────────────────────────────────────────────────────────────────────*/
function normalizeFloorplanAP(vrfAP, options) {
	if (!options) options = {};
	var findDeviceBySerial = options.findDeviceBySerial;
	if (typeof findDeviceBySerial !== 'function') {
		return null;
	}
	if (!vrfAP || !vrfAP['accesspointProperties'] || !vrfAP['accesspointProperties']['serialNumber']) {
		return null;
	}
	const serial = vrfAP['accesspointProperties']['serialNumber'];
	let monitoringAP = findDeviceBySerial(serial);
	if (!monitoringAP) {
		return null;
	}

	let apWorldX = null;
	let apWorldY = null;
	if (vrfAP['location']) {
		apWorldX = parseFloat(vrfAP['location']['x']);
		apWorldY = parseFloat(vrfAP['location']['y']);
	} else if (vrfAP['geometryRelative'] && vrfAP['geometryRelative'].length >= 2) {
		apWorldX = parseFloat(vrfAP['geometryRelative'][0]);
		apWorldY = parseFloat(vrfAP['geometryRelative'][1]);
	} else if (vrfAP['accesspointProperties'] && vrfAP['accesspointProperties']['geometryRelative'] && vrfAP['accesspointProperties']['geometryRelative'].length >= 2) {
		apWorldX = parseFloat(vrfAP['accesspointProperties']['geometryRelative'][0]);
		apWorldY = parseFloat(vrfAP['accesspointProperties']['geometryRelative'][1]);
	}

	return {
		serial: serial,
		monitoringAP: monitoringAP,
		radios: vrfRadiosBySerial[serial] || [],
		apWorldX: apWorldX,
		apWorldY: apWorldY
	};
}

function transformFloorplanWorldToCanvas(worldX, worldY, canvas) {
	if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
		return null;
	}
	if (!vrfFloorDetails || !vrfFloorDetails['properties']) {
		return null;
	}
	const floorLength = parseFloat(vrfFloorDetails['properties']['length']);
	const floorBreadth = parseFloat(vrfFloorDetails['properties']['breadth']);
	if (!Number.isFinite(floorLength) || floorLength <= 0 || !Number.isFinite(floorBreadth) || floorBreadth <= 0) {
		return null;
	}
	const renderRatio = window.devicePixelRatio || ratio || 1;

	return {
		x: (worldX / floorLength) * (canvas.width / renderRatio),
		y: (worldY / floorBreadth) * (canvas.height / renderRatio)
	};
}

function resolveAPStyle(ctx, thisAP, apRadios, selectedBand, selectedChannel, visualization) {
	// Delegate to mode-specific handlers via dispatcher
	return resolveAPStyleDispatcher(ctx, thisAP, apRadios, selectedBand, selectedChannel, visualization);
}

function resolveAPStyleChannels(ctx, apRadios, selectedBand, selectedChannel) {
	let apLabel2 = null;
	let apLabel2Alt = ['', '', ''];
	ctx.fillStyle = 'white';
	
	apRadios.forEach(function(radio) {
		var currentChannel = '-';
		if (radio.channel) currentChannel = radio.channel.replace(/\D/g, '');
		if (currentChannel !== '') {
			if (radio.band.includes('2.4') && selectedBand == 2 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (parseInt(currentChannel) == 1) {
					ctx.fillStyle = apColors[0];
				} else if (parseInt(currentChannel) == 6) {
					ctx.fillStyle = apColors[1];
				} else if (parseInt(currentChannel) == 11) {
					ctx.fillStyle = apColors[2];
				}
				apLabel2 = radio.channel;
				apLabel2Alt[0] = radio.channel;
			} else if (radio.band.includes('2.4') && selectedChannel == 'ALL') {
				apLabel2Alt[0] = radio.channel;
			}

			if (radio.band.includes('5') && selectedBand == 5 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				ctx.fillStyle = apColors[labels5.indexOf(currentChannel.toString())];
				apLabel2 = radio.channel;
				apLabel2Alt[1] = radio.channel;
			} else if (radio.band.includes('5') && selectedChannel == 'ALL') {
				apLabel2Alt[1] = radio.channel;
			}

			if (radio.band.includes('6') && selectedBand == 6 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (parseInt(currentChannel) < 97) {
					ctx.fillStyle = apColors[0];
				} else if (parseInt(currentChannel) < 189) {
					ctx.fillStyle = apColors[1];
				} else if (parseInt(currentChannel) < 234) {
					ctx.fillStyle = apColors[2];
				}
				apLabel2 = radio.channel;
				apLabel2Alt[2] = radio.channel;
			} else if (radio.band.includes('6') && selectedChannel == 'ALL') {
				apLabel2Alt[2] = radio.channel;
			}
		}
	});
	
	return { apLabel2, apLabel2Alt };
}

function resolveAPStyleUtilization(ctx, apRadios, selectedBand, selectedChannel) {
	let apLabel2 = null;
	let apLabel2Alt = ['', '', ''];
	ctx.fillStyle = 'white';
	
	apRadios.forEach(function(radio) {
		var currentChannel = '';
		if (radio.channel) currentChannel = radio.channel.replace(/\D/g, '');
		var utilValue = 0;
		if (radio.channelUtilization) utilValue = radio.channelUtilization;
		if (currentChannel !== '') {
			const bandKey2 = '2.4 GHz';
			const bandKey5 = '5 GHz';
			const bandKey6 = '6 GHz';
			
			if (radio.band.includes(bandKey2) && selectedBand == 2 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (radio.status != "UP") {
					ctx.fillStyle = 'white';
				} else if (utilValue < 10) {
					ctx.fillStyle = apColors[4];
				} else if (utilValue < 20) {
					ctx.fillStyle = apColors[0];
				} else if (utilValue < 30) {
					ctx.fillStyle = apColors[5];
				} else if (utilValue < 50) {
					ctx.fillStyle = apColors[3];
				} else if (utilValue < 80) {
					ctx.fillStyle = apColors[2];
				} else if (utilValue < 100) {
					ctx.fillStyle = apColors[1];
				}
				apLabel2 = utilValue+'%';
				apLabel2Alt[0] = utilValue+'%';
			} else if (radio.band.includes(bandKey2) && selectedChannel == 'ALL') {
				apLabel2Alt[0] = utilValue+'%';
			}

			if (radio.band.includes(bandKey5) && selectedBand == 5 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (radio.status != "UP") {
					ctx.fillStyle = 'white';
				} else if (utilValue < 10) {
					ctx.fillStyle = apColors[4];
				} else if (utilValue < 20) {
					ctx.fillStyle = apColors[0];
				} else if (utilValue < 30) {
					ctx.fillStyle = apColors[5];
				} else if (utilValue < 50) {
					ctx.fillStyle = apColors[3];
				} else if (utilValue < 80) {
					ctx.fillStyle = apColors[2];
				} else if (utilValue < 100) {
					ctx.fillStyle = apColors[1];
				}
				apLabel2 = utilValue+'%';
				apLabel2Alt[1] = utilValue+'%';
			} else if (radio.band.includes(bandKey5) && selectedChannel == 'ALL') {
				apLabel2Alt[1] = utilValue+'%';
			}

			if (radio.band.includes(bandKey6) && selectedBand == 6 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (radio.status != "UP") {
					ctx.fillStyle = 'white';
				} else if (utilValue < 10) {
					ctx.fillStyle = apColors[4];
				} else if (utilValue < 20) {
					ctx.fillStyle = apColors[0];
				} else if (utilValue < 30) {
					ctx.fillStyle = apColors[5];
				} else if (utilValue < 50) {
					ctx.fillStyle = apColors[3];
				} else if (utilValue < 80) {
					ctx.fillStyle = apColors[2];
				} else if (utilValue < 100) {
					ctx.fillStyle = apColors[1];
				}
				apLabel2 = utilValue+'%';
				apLabel2Alt[2] = utilValue+'%';
			} else if (radio.band.includes(bandKey6) && selectedChannel == 'ALL') {
				apLabel2Alt[2] = utilValue+'%';
			}
		}
	});
	
	return { apLabel2, apLabel2Alt };
}

function resolveAPStyleNoise(ctx, apRadios, selectedBand, selectedChannel) {
	let apLabel2 = null;
	let apLabel2Alt = ['', '', ''];
	ctx.fillStyle = 'white';
	
	apRadios.forEach(function(radio) {
		var currentChannel = '';
		if (radio.channel) currentChannel = radio.channel.replace(/\D/g, '');
		var noiseFloor = 0;
		if (radio.noiseFloor) noiseFloor = radio.noiseFloor;
		if (currentChannel !== '') {
			const bandKey2 = '2.4 GHz';
			const bandKey5 = '5 GHz';
			const bandKey6 = '6 GHz';
			
			if (radio.band.includes(bandKey2) && selectedBand == 2 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (radio.status != "UP") {
					ctx.fillStyle = 'white';
				} else if (noiseFloor > -70) {
					ctx.fillStyle = apColors[1];
				} else if (noiseFloor > -80) {
					ctx.fillStyle = apColors[2];
				} else if (noiseFloor > -90) {
					ctx.fillStyle = apColors[0];
				} else if (noiseFloor > -110) {
					ctx.fillStyle = apColors[4];
				}
				apLabel2 = noiseFloor+'dB';
				apLabel2Alt[0] = noiseFloor+'dB';
			} else if (radio.band.includes(bandKey2) && selectedChannel == 'ALL') {
				apLabel2Alt[0] = noiseFloor+'dB';
			}

			if (radio.band.includes(bandKey5) && selectedBand == 5 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (radio.status != "UP") {
					ctx.fillStyle = 'white';
				} else if (noiseFloor > -70) {
					ctx.fillStyle = apColors[1];
				} else if (noiseFloor > -80) {
					ctx.fillStyle = apColors[2];
				} else if (noiseFloor > -90) {
					ctx.fillStyle = apColors[0];
				} else if (noiseFloor > -110) {
					ctx.fillStyle = apColors[4];
				}
				apLabel2 = noiseFloor+'dB';
				apLabel2Alt[1] = noiseFloor+'dB';
			} else if (radio.band.includes(bandKey5) && selectedChannel == 'ALL') {
				apLabel2Alt[1] = noiseFloor+'dB';
			}

			if (radio.band.includes(bandKey6) && selectedBand == 6 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (radio.status != "UP") {
					ctx.fillStyle = 'white';
				} else if (noiseFloor > -70) {
					ctx.fillStyle = apColors[1];
				} else if (noiseFloor > -80) {
					ctx.fillStyle = apColors[2];
				} else if (noiseFloor > -90) {
					ctx.fillStyle = apColors[0];
				} else if (noiseFloor > -110) {
					ctx.fillStyle = apColors[4];
				}
				apLabel2 = noiseFloor+'dB';
				apLabel2Alt[2] = noiseFloor+'dB';
			} else if (radio.band.includes(bandKey6) && selectedChannel == 'ALL') {
				apLabel2Alt[2] = noiseFloor+'dB';
			}
		}
	});
	
	return { apLabel2, apLabel2Alt };
}

function resolveAPStyleHealth(ctx, thisAP) {
	let apLabel2 = null;
	let apLabel2Alt = ['', '', ''];
	
	var memoryUsage = thisAP.memoryUtilization;
	var uptime = thisAP['uptime'] ? thisAP['uptime'] : 0;
	if (thisAP['status'] !== 'ONLINE') {
		ctx.fillStyle = apColors[1];
		apLabel2 = 'Offline';
	} else if (memoryUsage > 90) {
		ctx.fillStyle = apColors[2];
		apLabel2 = 'Memory: '+ memoryUsage + '%';
	} else if (thisAP['cpuUtilization'] > 70) {
		ctx.fillStyle = apColors[2];
		apLabel2 = 'CPU: '+ thisAP['cpuUtilization'] + '%';
	} else {
		ctx.fillStyle = apColors[4];
		apLabel2 = 'Online';
	}
	
	return { apLabel2, apLabel2Alt };
}

function resolveAPStyleBandwidth(ctx, apRadios, selectedBand, selectedChannel) {
	let apLabel2 = null;
	let apLabel2Alt = ['', '', ''];
	ctx.fillStyle = 'white';
	
	apRadios.forEach(function(radio) {
		var currentChannel = '';
		if (radio.channel) currentChannel = radio.channel.replace(/\D/g, '');
		var currentWidth = '';
		if (radio.bandwidth) currentWidth = radio.bandwidth.replace(/\D/g, '');
		if (currentChannel !== '') {
			if (radio.band.includes('2.4 GHz') && selectedBand == 2 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (currentWidth === '20') {
					ctx.fillStyle = apColors[0];
				} else if (currentWidth === '40') {
					ctx.fillStyle = apColors[1];
				}
				apLabel2 = radio.channel;
				apLabel2Alt[0] = radio.channel;
			} else if (radio.band.includes('2.4 GHz') && selectedChannel == 'ALL') {
				apLabel2Alt[0] = radio.channel;
			}

			if (radio.band.includes('5 GHz') && selectedBand == 5 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (currentWidth === '20') {
					ctx.fillStyle = apColors[0];
				} else if (currentWidth === '40') {
					ctx.fillStyle = apColors[1];
				} else if (currentWidth ==='80') {
					ctx.fillStyle = apColors[2];
				} else if (currentWidth === '160') {
					ctx.fillStyle = apColors[4];
				} else if (currentWidth === '320') {
					ctx.fillStyle = apColors[5];
				}
				apLabel2 = radio.channel;
				apLabel2Alt[1] = radio.channel;
			} else if (radio.band.includes('5 GHz') && selectedChannel == 'ALL') {
				apLabel2Alt[1] = radio.channel;
			}

			if (radio.band.includes('6 GHz') && selectedBand == 6 && (selectedChannel == parseInt(currentChannel) || selectedChannel == 'ALL')) {
				if (currentWidth === '20') {
					ctx.fillStyle = apColors[0];
				} else if (currentWidth === '40') {
					ctx.fillStyle = apColors[1];
				} else if (currentWidth === '80') {
					ctx.fillStyle = apColors[2];
				} else if (currentWidth === '160') {
					ctx.fillStyle = apColors[4];
				} else if (currentWidth === '320') {
					ctx.fillStyle = apColors[5];
				}
				apLabel2 = radio.channel;
				apLabel2Alt[2] = radio.channel;
			} else if (radio.band.includes('6 GHz') && selectedChannel == 'ALL') {
				apLabel2Alt[2] = radio.channel;
			}
		}
	});
	
	return { apLabel2, apLabel2Alt };
}

function resolveAPStyleDispatcher(ctx, thisAP, apRadios, selectedBand, selectedChannel, visualization) {
	let apLabel2 = null;
	let apLabel2Alt = ['', '', ''];
	ctx.fillStyle = 'white';
	
	switch(visualization) {
		case 'CHANNELS':
		case 'PATHLOSS':
			return resolveAPStyleChannels(ctx, apRadios, selectedBand, selectedChannel);
		case 'UTILIZATION':
			return resolveAPStyleUtilization(ctx, apRadios, selectedBand, selectedChannel);
		case 'NOISE':
			return resolveAPStyleNoise(ctx, apRadios, selectedBand, selectedChannel);
		case 'HEALTH':
			return resolveAPStyleHealth(ctx, thisAP);
		case 'CLIENTS':
			ctx.fillStyle = apColors[5];
			return { apLabel2: null, apLabel2Alt };
		case 'BANDWIDTH':
			return resolveAPStyleBandwidth(ctx, apRadios, selectedBand, selectedChannel);
		default:
			return { apLabel2: null, apLabel2Alt };
	}
}

function updateFloorplanChannelList(apRadios) {
	apRadios.forEach(function(radio) {
		if (radio.channel) {
			var currentChannel = radio.channel.replace(/\D/g, '');
			if (currentChannel !== '') {
				if (radio.band.includes('2.4 GHz') && !vrfChannels[2].includes(currentChannel)) {
					var currentChannels = vrfChannels[2];
					currentChannels.push(currentChannel);
					currentChannels.sort(function(a, b) {
						return a - b;
					});
					vrfChannels[2] = currentChannels;
				} else if (radio.band.includes('5 GHz') && !vrfChannels[5].includes(currentChannel)) {
					var currentChannels = vrfChannels[5];
					currentChannels.push(currentChannel);
					currentChannels.sort(function(a, b) {
						return a - b;
					});
					vrfChannels[5] = currentChannels;
				} else if (radio.band.includes('6 GHz') && !vrfChannels[6].includes(currentChannel)) {
					var currentChannels = vrfChannels[6];
					currentChannels.push(currentChannel);
					currentChannels.sort(function(a, b) {
						return a - b;
					});
					vrfChannels[6] = currentChannels;
				}
			}
		}
	});
}

function renderFloorplanAP(vrfAP, canvas, ctx, renderOptions, options) {
	if (!options) options = {};
	if (vrfAP['deviceType'] !== 'ACCESSPOINT') {
		return;
	}

	let apLabel1 = vrfAP['deviceName'];
	const normalizedAP = normalizeFloorplanAP(vrfAP, options);
	if (!normalizedAP) {
		return;
	}
	let thisAP = normalizedAP.monitoringAP;
	let apRadios = normalizedAP.radios;
	const apNodeImage = options.apImage || null;
	const apFrameNodeImage = options.apFrameImage || null;

	if (renderOptions.needChannelList) {
		updateFloorplanChannelList(apRadios);
		if (typeof options.onChannelListUpdated === 'function') {
			options.onChannelListUpdated();
		}
	}

	const apCanvasPosition = transformFloorplanWorldToCanvas(normalizedAP.apWorldX, normalizedAP.apWorldY, canvas);
	if (!apCanvasPosition) {
		return;
	}
	const x = Math.round(apCanvasPosition.x);
	const y = Math.round(apCanvasPosition.y);
	vrfAPLocations.push({ x: x, y: y, serial: normalizedAP.serial });
	vrfSelectedAPs[thisAP['serialNumber']] = thisAP['macAddress'];

	const resolvedStyle = resolveAPStyle(ctx, thisAP, apRadios, renderOptions.selectedBand, renderOptions.selectedChannel, renderOptions.visualization);
	const apLabel2 = resolvedStyle.apLabel2;

	ctx.beginPath();
	if (renderOptions.visualization === 'UTILIZATION') {
		ctx.shadowColor = 'white';
		ctx.shadowBlur = 24;
	} else {
		ctx.shadowColor = 'white';
		ctx.shadowBlur = 14;
	}

	if (renderOptions.visualization === 'COUNT') {
		let clientCount = thisAP['clientCount'];
		if (renderOptions.selectedBand !== 'ALL' && thisAP['status'] === 'ONLINE') {
			clientCount = 0;
			// Get per band client count
			apRadios.forEach(function(radio) {
				if (!radio.band || !radio.band.match(/\d/)) return;
				const foundBand = radio.band.match(/\d/)[0];
				if (radio.serialNumber === thisAP.serialNumber && renderOptions.selectedBand == foundBand) {
					clientCount += radio.clientCount;
				}
			});
		}
		// based on client count - white = down AP
		if (clientCount > 50) ctx.fillStyle = apColors[1];
		else if (clientCount > 25) ctx.fillStyle = apColors[2];
		else ctx.fillStyle = apColors[4];
		if (thisAP['status'] !== 'ONLINE') ctx.fillStyle = 'white';

		// Draw empty AP frame (no Wi-Fi Signal)
				drawFloorplanNode(ctx, x, y, apFrameNodeImage, 16, 20);

		if (thisAP['status'] === 'ONLINE') {
			// Draw client count in bold
			ctx.font = 'bold 10px sans-serif';
			const countLabelSize = ctx.measureText(clientCount);
			ctx.shadowBlur = 0;
			ctx.fillStyle = 'black';
			ctx.fillText(clientCount, x - countLabelSize.width / 2, y + 4);
		} else {
			// Draw client count in bold
			ctx.font = 'bold 10px sans-serif';
			const countLabelSize = ctx.measureText('-');
			ctx.shadowBlur = 0;
			ctx.fillStyle = 'black';
			ctx.fillText('-', x - countLabelSize.width / 2, y + 4);
		}
	} else {
		drawFloorplanNode(ctx, x, y, apNodeImage, 16, 20);
	}

	// Create Labels
	ctx.font = 'bold 10px sans-serif';
	drawFloorplanEntityLabel(ctx, apLabel1, apLabel2, x, y);
}

function drawAPsOnFloorplan(visualizationMode, canvases, options) {
	if (!options) options = {};
	if (!canvases) {
		canvases = initializeCanvases(options.canvasIds);
	}

	const clearLayers = options.clearLayers || function(mode, layerCanvases) {
		clearCanvasByRef(layerCanvases.ap);
		if (mode !== 'RADAR') {
			clearCanvasByRef(layerCanvases.link);
			clearCanvasByRef(layerCanvases.info);
		}
	};
	const handleApSelection = options.onApSelected || function() {};
	const handleClientSelection = options.onClientSelected || function() {};
	const handleClearSelection = options.onClearSelection || function() {};
	const getRenderOptions = options.getRenderOptions || function() {
		return {
			needChannelList: false,
			visualization: visualizationMode || 'HEALTH',
			selectedBand: 'ALL',
			selectedChannel: 'ALL'
		};
	};
	const setNeedChannelList = options.setNeedChannelList || function() {};
	const radarEvents = Array.isArray(options.radarEvents) ? options.radarEvents : [];
	const radarTimescaleMinutes = Number.isFinite(options.radarTimescaleMinutes) && options.radarTimescaleMinutes > 0 ? options.radarTimescaleMinutes : 10080;
	const findAPByRadio = typeof options.findAPByRadio === 'function' ? options.findAPByRadio : null;
	const getClientLocations = typeof options.getClientLocations === 'function' ? options.getClientLocations : function() { return vrfClientLocations; };
	const getCurrentAP = typeof options.getCurrentAP === 'function' ? options.getCurrentAP : function() { return currentAP; };
	const setCurrentAP = typeof options.setCurrentAP === 'function' ? options.setCurrentAP : function(value) { currentAP = value; };
	const getCurrentClient = typeof options.getCurrentClient === 'function' ? options.getCurrentClient : function() { return currentClient; };
	const setCurrentClient = typeof options.setCurrentClient === 'function' ? options.setCurrentClient : function(value) { currentClient = value; };

	clearLayers(visualizationMode, canvases);

	vrfSelectedAPs = {};
	vrfAPLocations = [];
	var canvas = canvases.ap;
	var ctx = canvas.getContext('2d');

	if (visualizationMode === 'RADAR') {
		vrfAPs.forEach(function(vrfAP) {
						var normalizedAP = normalizeFloorplanAP(vrfAP, options);
			if (!normalizedAP || !normalizedAP.monitoringAP) return;
			var apCanvasPosition = transformFloorplanWorldToCanvas(normalizedAP.apWorldX, normalizedAP.apWorldY, canvas);
			if (!apCanvasPosition) return;
			var apLabel1 = vrfAP['ap_name'] || vrfAP['deviceName'] || normalizedAP.monitoringAP['name'];
			var apLabel2 = null;
			var currentAPRef = normalizedAP.monitoringAP;
			var x = Math.round(apCanvasPosition.x);
			var y = Math.round(apCanvasPosition.y);
			ctx.fillStyle = 'white';
			var hitCounter = 0;

			if (findAPByRadio) {
				radarEvents.forEach(function(evt) {
					if (evt['event_type'] === 'RADIO_REASON_RADAR_DETECTED') {
						let now = DateTime.now();
						let fromTime = now.minus({ minutes: radarTimescaleMinutes });
						const eventTime = DateTime.fromISO(evt['event_timestamp']);
						if (eventTime > fromTime) {
							var foundAP = findAPByRadio(evt['radio_mac']);
							if (foundAP && currentAPRef && foundAP['serialNumber'] === currentAPRef['serialNumber']) {
								hitCounter++;
								apLabel2 = evt['channel'];
								ctx.fillStyle = apColors[1];
							}
						}
					}
				});
			}
			if (hitCounter > 0) ctx.fillStyle = apColors[hitCounter - 1];
			if (hitCounter > 6) ctx.fillStyle = apColors[5];
			drawFloorplanNode(ctx, x, y, options.apImage, 16, 20);
			ctx.font = 'bold 10px sans-serif';
			drawFloorplanEntityLabel(ctx, apLabel1, apLabel2, x, y);
		});
		setNeedChannelList(false);
		return;
	}

	const renderOptions = getRenderOptions();
	vrfAPs.forEach(function(vrfAP) {
		renderFloorplanAP(vrfAP, canvas, ctx, renderOptions, options);
	});

	setNeedChannelList(false);

	var apCanvas = canvases.ap;
	apCanvas.onmouseup = function(e) {
		var x = e.layerX;
		var y = e.layerY;

		let found = false;
		vrfAPLocations.forEach(function(loc) {
			const ap_x = loc['x'];
			const ap_y = loc['y'];
			if (Math.abs(ap_x - x) <= 20 && Math.abs(ap_y - y) <= 20) {
				if (getCurrentAP() !== loc) {
					found = true;
					setCurrentAP(loc);
				}
			}
		});

		if (found) {
			handleApSelection(getCurrentAP());
			return;
		}

		handleClearSelection();
		getClientLocations().forEach(function(cloc) {
			const cl_x = cloc['x'];
			const cl_y = cloc['y'];
			if (Math.abs(cl_x - x) <= 16 && Math.abs(cl_y - y) <= 16) {
				if (getCurrentClient() !== cloc) {
					found = true;
					setCurrentClient(cloc);
				}
			}
		});

		if (found) {
			handleClientSelection(getCurrentClient());
		} else {
			handleClearSelection();
		}
	};
}
