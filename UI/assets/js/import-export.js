/*
Central Automation v2.x
Last Updated 2.0.0
Aaron Scott (WiFi Downunder) 2025-2026
*/




/*  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	CSV Export functions
	------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

function downloadCSVData(filename, csvData) {
	var csv = Papa.unparse(csvData);

	var csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	var csvURL = window.URL.createObjectURL(csvBlob);
	var csvLink = document.createElement('a');
	csvLink.href = csvURL;

	csvLink.setAttribute('download', filename + '.csv');
	csvLink.click();
	window.URL.revokeObjectURL(csvLink);
}