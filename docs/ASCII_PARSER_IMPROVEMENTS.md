# ASCII Report Parser Improvements Summary

## Issues Fixed

### 1. **Context Preservation for Dosen Files**
- **Problem**: Dosen entries were losing study program associations
- **Example Before**: `No: 1, NIDN: 1111027702, Nama Dosen: Fx Nanang Sujatmiko, S.Kom., M.M.`
- **Example After**: `[D3 - MANAJEMEN INDUSTRI] No: 1, NIDN: 1111027702, Nama Dosen: Fx Nanang Sujatmiko, S.Kom., M.M.`
- **Solution**: Context propagation - track most recent "major" section title (non-colon titles) and apply to table rows

### 2. **Windows Line Ending Support**
- **Problem**: Files with `\r\n` (Windows) line endings weren't being split into sections correctly
- **Solution**: Updated `LINE_SPLIT_PATTERN` to handle both `\n` (Unix) and `\r\n` (Windows)

### 3. **Smart Section Delimiter Detection**
- **Problem**: Short `----` lines (table separators, subsection markers) were splitting sections incorrectly
- **Solution**: Only treat delimiter lines as section splits if they're 60+ characters long
- **Context-Aware**: Delimiter lines immediately following "Mata Kuliah dengan Prasyarat:" are preserved as subsection markers

### 4. **Prerequisite Course-Name Association**
- **Problem**: Prerequisites lost association with course names
- **Example Before**: `Prasyarat adalah Matematika I.`
- **Example After**: `Prasyarat ALJABAR LINIER DAN MATRIKS adalah Matematika I.`
- **Solution**:
  - Added `parsePrerequisiteList()` function to handle bullet-point list structure
  - Detects "Mata Kuliah dengan Prasyarat:" sections
  - Tracks current course name from bullet points
  - Associates each prerequisite with its course

### 5. **Improved Table Detection**
- **Problem**: Standalone `----` separator lines after tables were treated as new table starts
- **Solution**: Separator lines only count as table lines if:
  - They contain `|` characters (actual table rows), OR
  - They're separator patterns AND we're currently inside a table

## Test Results

### Dosen Files (Dosen_Semua_Prodi.txt)
✅ **141 entries**, all with study program context
✅ **20 study programs** correctly identified
✅ **100% context preservation**

### Course Files (Mata_Kuliah_Informatika.txt)
✅ **58 course entries**, all with semester context
✅ **39 prerequisite associations** with full course names
✅ **8 semesters** correctly identified

### Course Files (Mata_Kuliah_D3_ADMINISTRASI_PERKANTORAN.txt)
✅ **48 course entries**, all with semester context
✅ **2 prerequisite associations** with full course names
✅ **6 semesters** correctly identified

## Key Improvements

1. **Context Propagation System**: Maintains hierarchical context (study programs, semesters) across sections without titles
2. **Prerequisite Parsing**: Preserves course-prerequisite relationships with full context
3. **Robust Delimiter Handling**: Distinguishes between section delimiters and subsection markers
4. **Cross-Platform Support**: Handles both Unix and Windows line endings
5. **Smart Table Extraction**: Correctly identifies table boundaries without false positives

## Example Output

### Before:
```
No: 1, NIDN: 1111027702, Nama Dosen: Fx Nanang Sujatmiko, S.Kom., M.M.
Prasyarat adalah Matematika I.
```

### After:
```
[D3 - MANAJEMEN INDUSTRI] No: 1, NIDN: 1111027702, Nama Dosen: Fx Nanang Sujatmiko, S.Kom., M.M.
Prasyarat ALJABAR LINIER DAN MATRIKS adalah Matematika I.
```

This ensures that when the text is chunked and retrieved via RAG, each chunk retains complete context about:
- Which study program/semester the entry belongs to
- Which course a prerequisite requirement is for
- The relationship between entities
