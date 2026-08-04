const SPREADSHEET_ID = "1LYh1F9uWg21gBgA-PHjsw6bR-haDp2c1Zm3mVKWvFUc";

// Cache the spreadsheet object to avoid repeated openById calls
let cachedSpreadsheet = null;

function getSpreadsheet() {
    if (!cachedSpreadsheet) {
        cachedSpreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    return cachedSpreadsheet;
}

function doGet(e) {
    const sheetName = e.parameter.sheet || "Data";

    try {
        const ss = getSpreadsheet();
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            return jsonError(`Sheet '${sheetName}' not found`);
        }

        const data = sheet.getDataRange().getValues();
        const result = {
            success: true,
            updated: new Date().toISOString(),
            rows: data.length,
            data: data
        };

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return jsonError(err.message || "Server error");
    }
}

function jsonError(msg) {
    return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: msg })
    ).setMimeType(ContentService.MimeType.JSON);
}

function jsonSuccess(msg, additionalData) {
    const response = { success: true, message: msg, ...additionalData };
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}

function fetchSheetData(sheetName) {
    try {
        var ss = getSpreadsheet();
        var sheet = ss.getSheetByName(sheetName);
        var data = sheet.getDataRange().getDisplayValues();

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            data: data
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(20000); // wait up to 20s for other concurrent writes to finish
    } catch (lockErr) {
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: "Server busy, please try again."
        })).setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var params = e.parameter;
        var action = params.action || 'insert';

        if (action === 'uploadFile') {
            return handleFileUpload(e);
        }

        var sheetName = params.sheetName;
        var ss = getSpreadsheet();
        var sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            throw new Error("Sheet '" + sheetName + "' not found");
        }

        // ============== OPTIMIZED INSERT ==============
        if (action === 'insert') {
            var rowData = JSON.parse(params.rowData);

            // Use appendRow for single row - it's optimized internally
            sheet.appendRow(rowData);

            // Flush to ensure immediate write
            SpreadsheetApp.flush();

            return jsonSuccess("Data inserted successfully");
        }

        // ============== OPTIMIZED UPDATE (20x FASTER) ==============
        else if (action === 'update') {
            var rowIndex = parseInt(params.rowIndex);
            var rowData = JSON.parse(params.rowData);

            if (isNaN(rowIndex) || rowIndex < 2) {
                throw new Error("Invalid row index for update");
            }

            // OPTIMIZATION: Get existing row data first, then batch update
            var range = sheet.getRange(rowIndex, 1, 1, rowData.length);
            var existingData = range.getValues()[0];
            var existingFormulas = range.getFormulas()[0];

            // Merge: only update cells where new data was actually provided
            // ('' and undefined AND null all mean "leave this cell alone" —
            // previously null slipped through and blanked out Timestamp /
            // formula columns like Outstanding Amount / Planned dates)
            var mergedData = existingData.map(function (existingVal, i) {
                // If new data is provided, overwrite it
                if (rowData[i] !== '' && rowData[i] !== undefined && rowData[i] !== null) {
                    return rowData[i];
                }
                // If no new data, check if there was a formula. If yes, KEEP the formula.
                if (existingFormulas && existingFormulas[i] !== '') {
                    return existingFormulas[i];
                }
                // Otherwise, keep the original static value
                return existingVal;
            });

            // SINGLE batch operation instead of multiple setValue calls
            range.setValues([mergedData]);

            SpreadsheetApp.flush();

            return jsonSuccess("Data updated successfully");
        }

        // ============== UPDATE CELL ==============
        else if (action === 'updateCell') {
            var rowIndex = parseInt(params.rowIndex);
            var columnIndex = parseInt(params.columnIndex);
            var value = params.value;

            if (isNaN(rowIndex) || rowIndex < 1 || isNaN(columnIndex) || columnIndex < 1) {
                throw new Error("Invalid row or column index for update");
            }

            sheet.getRange(rowIndex, columnIndex).setValue(value);
            SpreadsheetApp.flush();

            return jsonSuccess("Cell updated successfully");
        }

        // ============== DELETE ==============
        else if (action === 'delete') {
            var rowIndex = parseInt(params.rowIndex);

            if (isNaN(rowIndex) || rowIndex < 2) {
                throw new Error("Invalid row index for delete");
            }

            sheet.deleteRow(rowIndex);
            SpreadsheetApp.flush();

            return jsonSuccess("Row deleted successfully");
        }

        // ============== MARK DELETED ==============
        else if (action === 'markDeleted') {
            var rowIndex = parseInt(params.rowIndex);
            var columnIndex = parseInt(params.columnIndex);
            var value = params.value || 'Yes';

            if (isNaN(rowIndex) || rowIndex < 2) {
                throw new Error("Invalid row index for marking as deleted");
            }
            if (isNaN(columnIndex) || columnIndex < 1) {
                throw new Error("Invalid column index for marking as deleted");
            }

            sheet.getRange(rowIndex, columnIndex).setValue(value);
            SpreadsheetApp.flush();

            return jsonSuccess("Row marked as deleted successfully");
        }

        // ============== BATCH INSERT (NEW - FOR MULTIPLE ROWS) ==============
        else if (action === 'batchInsert') {
            var rowsData = JSON.parse(params.rowsData);

            if (!Array.isArray(rowsData) || rowsData.length === 0) {
                throw new Error("Invalid rows data for batch insert");
            }

            var lastRow = sheet.getLastRow();
            sheet.getRange(lastRow + 1, 1, rowsData.length, rowsData[0].length).setValues(rowsData);

            SpreadsheetApp.flush();

            return jsonSuccess("Batch insert successful", { rowsInserted: rowsData.length });
        }

        else {
            throw new Error("Unknown action: " + action);
        }
    } catch (error) {
        console.error("Error in doPost:", error);
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

function handleFileUpload(e) {
    try {
        var params = e.parameter;

        if (!params.base64Data || !params.fileName || !params.mimeType) {
            throw new Error("Missing required parameters for file upload");
        }

        // Default Folder: 'FMS Uploads' folder in Google Drive if folderId is not sent
        var folderId = params.folderId;
        if (!folderId || folderId === "") {
            var folders = DriveApp.getFoldersByName('FMS Uploads');
            if (folders.hasNext()) {
                folderId = folders.next().getId();
            } else {
                folderId = DriveApp.createFolder('FMS Uploads').getId();
            }
        }

        var fileUrl = uploadFileToDrive(params.base64Data, params.fileName, params.mimeType, folderId);

        if (!fileUrl) {
            throw new Error("Failed to upload file to Google Drive");
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            fileUrl: fileUrl,
            message: "File uploaded successfully"
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        console.error("Error in handleFileUpload:", error);
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
    try {
        let fileData = base64Data;
        if (base64Data.indexOf('base64,') !== -1) {
            fileData = base64Data.split('base64,')[1];
        }

        const decoded = Utilities.base64Decode(fileData);
        const blob = Utilities.newBlob(decoded, mimeType, fileName);
        const folder = DriveApp.getFolderById(folderId);
        const file = folder.createFile(blob);

        try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareError) {
            console.error("Could not set sharing permissions: " + shareError.toString());
        }

        return "https://drive.google.com/uc?export=view&id=" + file.getId();
    } catch (error) {
        console.error("Error in uploadFileToDrive:", error);
        return null;
    }
}
