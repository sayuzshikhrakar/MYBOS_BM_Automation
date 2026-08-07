# QA Implementation Plan: Library Module (View & Open Files / Folders)

This implementation plan outlines the testing strategy, risk assessment, functional breakdown, and exploratory test scenarios for the **Library Module**, strictly adhering to the standards defined in [`TestCaseGenerator.md`](file:///home/ebpearls/MYBOS_BM_Automation/TestCaseGenerator.md).

---

# Feature Summary

The **Library** module allows Building Managers and Residents to view, search, and open read-only files and folders uploaded via the web portal. Mobile users can navigate folder structures, search for items, view file/folder counts, and open supported file formats (`docx`, `pdf`, `mp4`, `xlsx`, `jpeg`) in appropriate viewers with explicit download progress handling and scroll position retention.

---

# Assumptions

1. Content creation, modification, and deletion are strictly restricted to the web portal; the mobile application is read-only.
2. File types allowed for upload on the web portal are capped strictly to `docx`, `pdf`, `mp4`, `xlsx`, `jpeg`.
3. Search is strictly **case-insensitive** across both file titles and file extensions.
4. Item counts strictly adhere to proper singular/plural grammar rules (e.g. `"1 folder, 1 file"` vs `"2 folders, 3 files"`).
5. Opening a file displays a download modal with text `"downloading file please wait..."` and a `"Cancel"` button. Tapping `"Cancel"` aborts the download and returns to the Library list; waiting for download completion automatically opens the file viewer.
6. Closing a file viewer returns the user to the exact scroll position within the subfolder.

---

# Risk Assessment

- **High Risk:** 
  - File download cancellation handling: potential UI hangs or background memory leaks if download threads are not properly interrupted.
  - File rendering and memory management when opening large media (`mp4`) or complex documents (`pdf`/`xlsx`).
- **Medium Risk:**
  - Search filtering performance across both titles and extensions.
  - Maintaining exact scroll position when returning from file viewers across different device screen resolutions.
- **Low Risk:**
  - Singular vs. plural grammar formatting on folder cards.

---

# Test Areas

- Navigation & Hierarchy (Root & Nested Folders)
- Folder Item Details & Pluralization Formatting
- Search & Case-Insensitive Filtering (Titles & Extensions)
- File Download Lifecycle & Progress Cancellation
- File Viewer Integration (`docx`, `pdf`, `mp4`, `xlsx`, `jpeg`)
- Scroll Position Retention & Navigation Recovery
- Network Resiliency & Error Handling

---

# Exploratory Test Scenarios

## Functional

- **Library Access:** Verify navigating to Library from Dashboard displays all top-level files and folders with names and right-side arrow icons.
- **Row vs. Arrow Tap Parity:** Verify tapping anywhere on a folder/file row vs. tapping the arrow icon produces identical outcomes.
- **Folder Navigation:** Verify opening a folder displays its nested contents and updates breadcrumbs/back navigation.
- **Supported File Types:** Verify opening each supported file type (`docx`, `pdf`, `mp4`, `xlsx`, `jpeg`) launches the appropriate viewer upon download completion.
- **File Download Progress & Viewer Open:** Verify tapping a file displays the popup modal `"downloading file please wait..."` and automatically opens the file viewer once complete.
- **Abort File Download via Cancel:** Verify tapping `"Cancel"` on the download popup modal immediately stops the download and returns the user to the active Library list.

## Validation

- **Case-Insensitive Search:** Verify searching for uppercase or lowercase characters (e.g. `"D"` vs `"d"`) returns matching files and folders.
- **Search Extension & Title Matching:** Verify searching by extension in mixed case (e.g., `".PDF"`, `".pdf"`, `".Jpeg"`) correctly filters matching files regardless of title or extension case.
- **Partial Character Search:** Verify searching a single character (e.g. `"d"`) matches strings anywhere within names (prefix, middle, suffix).
- **Search Clearing:** Verify clearing the search input instantly restores the full folder/file list.
- **Singular vs. Plural Count Formatting:** Verify a folder containing exactly 1 item displays `"1 folder, 0 files"` or `"0 folders, 1 file"` (singular), while multi-item folders display `"2 folders, 3 files"` (plural).

## Negative

- **No Match Search:** Verify searching for a non-existent term (e.g. `"zzz"`) displays the empty state message `"No Data Found"`.
- **Special Character Search:** Verify searching for symbols (`!@#$%`) does not crash the app or throw unhandled regex exceptions.

## Boundary

- **Empty Folder:** Verify opening an empty folder displays `"No Data Found"` or an empty folder placeholder without freezing.
- **Zero Count Display:** Verify folders containing 0 files and 0 folders display `"0 folders, 0 files"`.
- **Long File/Folder Names:** Verify excessively long file/folder names truncate properly without overlapping the arrow icon.
- **Large Directory Listing:** Verify directories containing 100+ items load smoothly with virtualized scrolling.

## Permissions

- **Role Visibility:** Verify both Building Manager and Resident roles can access shared library files per their permissions.
- **Restricted/Private Folders:** Verify folders configured with restricted access on the web portal are hidden from unauthorized user roles.

## Regression

- **Session Resume:** Verify backgrounding and resuming the app while inside a folder maintains the active folder location.
- **Scroll Position Retention on Viewer Exit:** Verify exiting a file viewer returns the user to the exact scroll position within the current subfolder directory.

## Integration

- **Web Portal Sync:** Verify items added or deleted on the web portal update in the app upon pulling to refresh or re-entering the module.
- **External App Handoff:** Verify opening non-previewable native files (`docx`, `xlsx`) smoothly hands off to system intent handlers.

## Error Handling

- **Offline File Opening:** Verify attempting to open/download a file while device Wi-Fi/cellular is disconnected displays a friendly network error dialog.
- **Interrupted File Transfer:** Verify switching network connectivity during an active file download triggers a retry or fail-gracefully state rather than a crash.

---

# Missing Test Coverage

- **Network Timeout on Large Downloads:** Behavior when the `"downloading file please wait..."` download process times out due to extremely slow network speeds.
- **Deleted File Handling:** Behavior when a user attempts to download a file that was deleted on the web portal while the mobile session was active.
- **Deep Nesting Limit:** Maximum depth limit for subfolder navigation and breadcrumb UI scaling.

---

# Questions

1. Is there a maximum network timeout threshold for the `"downloading file please wait..."` progress modal before an error toast is shown?
2. Does the download modal prevent back-button hardware triggers while active, or does back-button act as Cancel?

---

# Review Status

Implementation Plan Ready for Review.
